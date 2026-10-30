/** Bounded ReAct retrieval loop: native tool-calling with deterministic floor.
 *
 * The model observes each retrieval result before deciding the next call
 * (adaptive where plan-and-execute is blind), but every step is fenced:
 * narrow per-agent allowlist, single-tool-per-turn, arg validation, max 6
 * iterations, unknown/rejected calls get error feedback, and the writer tail
 * (extract/draft/generate/verify) always runs deterministically afterwards
 * via the existing executor — so a model that emits zero valid calls still
 * yields a complete result.
 */
import { completeWithTools } from '../llm.ts';
import { normalizeAgentId, type AgentId } from '../agents.ts';
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';
import type { ExecutionPlan, PlanGoal, PlanStep, PlanStepStatus, SubagentRun } from './types.ts';
import {
	MAX_NATIVE_STEPS,
	NATIVE_TOOL_BUDGET_MS,
	estimateToolDefsSize,
	isNativeToolEnabled,
	nativeToolsFor,
	validateNativeArgs
} from './native-tools.ts';
import { buildSubagentRuns, executePlan, runSingleTool, type Blackboard } from './executor.ts';
import { draftExecutionPlan, fallbackPlanFor } from './planner.ts';
import { humanizeLabel } from '#lib/humanize.ts';

export interface ReactTurn {
	history: Array<{
		role: string;
		content: string;
		toolCalls?: Array<{ id?: string; name: string; arguments: Record<string, unknown> }>;
		toolCallId?: string;
		toolName?: string;
	}>;
}

export interface ReactDeps {
	callTools: typeof completeWithTools;
	runTool: typeof runSingleTool;
	draftPlan: typeof draftExecutionPlan;
	executeTail: typeof executePlan;
}

const defaultDeps: ReactDeps = {
	callTools: completeWithTools,
	runTool: runSingleTool,
	draftPlan: draftExecutionPlan,
	executeTail: executePlan
};

function systemPrompt(goal: PlanGoal, agent: AgentId, tools: string[]): string {
	const hasDraft = tools.includes('draftQuestions');
	const retrievalBits = [
		'searchLegal searches Kenyan statutes/cases (always call at least once)',
		'searchUserDocs searches attached files (call when files are mentioned)',
		'splitClauses splits attached docs into numbered clauses (doc-check only)',
		'requestDocs marks files as still needed (call instead of searching when no files exist)'
	];
	const draftBit = hasDraft
		? 'draftQuestions drafts 1-4 validated follow-up questions (interview goal only; call after searchLegal, optional focus/maxQuestions)'
		: '';
	const bits = [...retrievalBits, draftBit].filter(Boolean).join('; ');
	return `You retrieve evidence for Hakili, an offline Kenyan legal-preparation assistant. Goal: ${goal}. Call ONE tool per turn from [${tools.join(', ')}]: ${bits}. After each result, either call the next needed tool or stop calling tools (reply with a one-line summary and no tool call) when evidence/questions are sufficient. Never invent tool names. Never answer the legal question yourself.`;
}

function userPrompt(issue: string, extra: string): string {
	return `Issue: "${issue.slice(0, 800)}" ${extra.slice(0, 300)}`;
}

/** Distinct trace labels for reactive calls: the loop can call the same
 * tool twice (e.g. a broad searchLegal then a refined one), and identical
 * labels render as duplicated rows. A short query/focus hint keeps each
 * row informative and unique. */
function reactiveLabel(name: string, args: Record<string, unknown>): string {
	const tool = humanizeLabel(name);
	if (
		(name === 'searchLegal' || name === 'searchUserDocs') &&
		typeof args.query === 'string' &&
		args.query.trim()
	)
		return `Reactive ${tool}: "${args.query.trim().replace(/\s+/g, ' ').slice(0, 48)}"`;
	if (name === 'draftQuestions' && Array.isArray(args.focus) && args.focus.length > 0)
		return `Reactive ${tool}: ${args.focus
			.slice(0, 3)
			.map((f) => humanizeLabel(String(f)))
			.join(', ')}`;
	return `Reactive ${tool}`;
}

/** Short tool-result summary pushed back so the next turn observes it. */
function summarizeResult(bb: Blackboard, tool: string): string {
	if (tool === 'searchLegal')
		return `searchLegal done: ${bb.passages.length} passages, topic=${bb.topic}. Titles: ${bb.passages
			.slice(0, 3)
			.map((p) => p.title)
			.join(' | ')
			.slice(0, 300)}`;
	if (tool === 'searchUserDocs')
		return `searchUserDocs done: ${bb.rawUser.length} excerpts. Files: ${bb.rawUser
			.slice(0, 3)
			.map((u) => u.filename)
			.join(', ')
			.slice(0, 200)}`;
	if (tool === 'splitClauses') return `splitClauses done: ${bb.clauses.length} clauses.`;
	if (tool === 'requestDocs') return `requestDocs done: needsDocs=${bb.needsDocs}.`;
	if (tool === 'draftQuestions')
		return `draftQuestions done: ${bb.questions.length} questions. ${bb.questions
			.slice(0, 4)
			.map((q) => q.text)
			.join(' | ')
			.slice(0, 300)}`;
	return `${tool} done.`;
}

export interface ReactResult {
	/** Already-executed retrieval steps, in order, for the merged execution plan. */
	steps: PlanStep[];
	/** True when the model drove at least one valid tool call. */
	drove: boolean;
}
/**
 * Run the reactive retrieval loop against the blackboard. Never throws:
 * any model/tool failure yields the steps executed so far (possibly none).
 */
export async function runReactiveRetrieval(
	bb: Blackboard,
	goal: PlanGoal,
	issue: string,
	opts: { agentId?: unknown; extra?: string; signal?: AbortSignal; trace?: Trace } = {},
	deps: ReactDeps = defaultDeps
): Promise<ReactResult> {
	const agent = normalizeAgentId(opts.agentId);
	const steps: PlanStep[] = [];
	if (!isNativeToolEnabled()) {
		if (opts.trace) event(opts.trace, 'react:disabled', 'QVAC_NATIVE_TOOLS=0');
		return { steps, drove: false };
	}
	const tools = nativeToolsFor(agent, { documentIds: bb.documentIds, goal }).filter((t) =>
		['searchLegal', 'searchUserDocs', 'splitClauses', 'requestDocs', 'draftQuestions'].includes(
			t.name
		)
	);
	if (tools.length === 0) return { steps, drove: false };
	// Context guard: tool defs + issue + recent history must fit 4096 ctx.
	const defSize = estimateToolDefsSize(tools);
	if (opts.trace)
		event(opts.trace, 'react:start', `goal=${goal} tools=${tools.length} defs~${defSize}ch`);

	const history: ReactTurn['history'] = [
		{
			role: 'system',
			content: systemPrompt(
				goal,
				agent,
				tools.map((t) => t.name)
			)
		},
		{ role: 'user', content: userPrompt(issue, opts.extra ?? '') }
	];
	let drove = false;
	for (let n = 0; n < MAX_NATIVE_STEPS; n++) {
		if (opts.signal?.aborted) break;
		let content: string;
		let calls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
		try {
			const res = await deps.callTools(
				history,
				tools,
				{ predict: 128, temp: 0.1, signal: opts.signal, model: 'tools' },
				opts.trace
			);
			content = res.content;
			calls = res.toolCalls;
		} catch (e) {
			if (opts.trace)
				event(opts.trace, 'react:model-down', e instanceof Error ? e.message : String(e));
			break;
		}
		// Single-tool-per-turn: first call wins, rest are ignored by design.
		const call = calls[0];
		if (!call) {
			if (opts.trace)
				event(opts.trace, 'react:stop', `no-call turn=${n} content=${content.slice(0, 60)}`);
			break;
		}
		const allowed = tools.some((t) => t.name === call.name);
		const args = allowed ? validateNativeArgs(call.name, call.arguments) : null;
		const stepId = `react-${call.name}-${n}`;
		if (!allowed || args === null) {
			if (opts.trace)
				event(opts.trace, 'react:rejected', `${call.name} allowed=${allowed} turn=${n}`);
			history.push({
				role: 'assistant',
				content: content || 'Considering next retrieval step.',
				toolCalls: [{ id: call.id, name: call.name, arguments: call.arguments }]
			});
			history.push({
				role: 'tool',
				content: `ERROR: "${call.name}" is not an available tool or its arguments are invalid. Use exactly one of [${tools.map((t) => t.name).join(', ')}] with the declared parameters, or stop calling tools.`,
				toolCallId: call.id,
				toolName: call.name
			});
			continue;
		}
		try {
			// Args are validated; the TS tools read the blackboard query, so
			// stash the model query where search tools can use it.
			if ((call.name === 'searchLegal' || call.name === 'searchUserDocs') && args.query) {
				(bb as { __reactQuery?: string }).__reactQuery = args.query as string;
			}
			// Interview args are lenient (never reject): stash focus/max for
			// toolDraftQuestions to apply deterministically after drafting.
			if (call.name === 'draftQuestions') {
				(bb as { __reactDraft?: Record<string, unknown> }).__reactDraft = args as Record<
					string,
					unknown
				>;
			}
			await deps.runTool(stepId, call.name, bb, { signal: opts.signal, trace: opts.trace });
			drove = true;
			steps.push({
				id: stepId,
				tool: call.name as PlanStep['tool'],
				label: reactiveLabel(call.name, args),
				budgetMs: NATIVE_TOOL_BUDGET_MS,
				retry: 0,
				onFail: 'skip'
			});
			if (opts.trace) event(opts.trace, 'react:step-done', `${stepId}`);
		} catch (e) {
			if (opts.trace)
				event(
					opts.trace,
					'react:step-error',
					`${stepId}: ${e instanceof Error ? e.message : String(e)}`
				);
		}
		history.push({
			role: 'assistant',
			content: content || `Calling ${call.name}.`,
			toolCalls: [{ id: call.id, name: call.name, arguments: call.arguments }]
		});
		history.push({
			role: 'tool',
			content: summarizeResult(bb, call.name),
			toolCallId: call.id,
			toolName: call.name
		});
		// Terminal tools end the loop: nothing useful follows them.
		if (call.name === 'requestDocs') break;
	}
	return { steps, drove };
}

/** Reactive loop owns retrieval + interview drafting: when it already executed
 * an exact tool, the writer tail skips that duplicate step; otherwise the
 * full drafted plan runs. Exact-match (not "any drove skips all") so a
 * reactive searchLegal never drops a still-needed draftQuestions tail step. */

export function isReactiveEnabled(): boolean {
	return process.env.PLANNER_REACTIVE !== '0';
}

export interface ReactivePlanResult {
	plan: ExecutionPlan;
	stepStatus: Record<string, PlanStepStatus>;
	subagents: SubagentRun[];
}

/**
 * Reactive retrieval + deterministic writer tail. Never throws: every layer
 * (native tools, planner draft, executor) degrades to a static fallback, so
 * the caller always gets an executable merged plan.
 */
export async function runReactiveWithTail(
	bb: Blackboard,
	goal: PlanGoal,
	issue: string,
	opts: { agentId?: unknown; extra?: string; signal?: AbortSignal; trace?: Trace } = {},
	deps: ReactDeps = defaultDeps
): Promise<ReactivePlanResult> {
	const agent = normalizeAgentId(opts.agentId);
	let reactive: ReactResult = { steps: [], drove: false };
	try {
		reactive = await runReactiveRetrieval(bb, goal, issue, opts, deps);
	} catch (e) {
		if (opts.trace)
			event(opts.trace, 'react:retrieval-failed', e instanceof Error ? e.message : String(e));
	}
	// Writer plan: GBNF-constrained draft with deterministic fallback (never throws).
	const drafted = await deps
		.draftPlan(goal, issue, {
			agentId: agent,
			extra: opts.extra,
			signal: opts.signal,
			trace: opts.trace
		})
		.catch(() => fallbackPlanFor(goal, agent));
	const tailSteps = drafted.steps.filter((s) => !reactive.steps.some((rs) => rs.tool === s.tool));
	const tailPlan: ExecutionPlan = { ...drafted, steps: tailSteps };
	const tail = await deps.executeTail(tailPlan, bb, { signal: opts.signal, trace: opts.trace });
	const steps = [...reactive.steps, ...tailSteps];
	const stepStatus: Record<string, PlanStepStatus> = {};
	for (const s of reactive.steps) stepStatus[s.id] = 'done';
	for (const [id, st] of Object.entries(tail.stepStatus)) stepStatus[id] = st;
	const plan: ExecutionPlan = {
		goal,
		agentId: agent,
		title: reactive.drove ? `Plan: reactive ${goal}` : drafted.title,
		reason: reactive.drove
			? `reactive retrieval (${reactive.steps.length}) + ${drafted.dynamic ? 'llm' : 'static'} writer tail (${tailSteps.length})`
			: drafted.reason,
		steps,
		dynamic: reactive.drove || drafted.dynamic
	};
	if (opts.trace)
		event(
			opts.trace,
			'react:merged',
			`${plan.title} steps=${steps.length} drove=${reactive.drove ? 1 : 0}`
		);
	return { plan, stepStatus, subagents: buildSubagentRuns(steps, stepStatus) };
}
