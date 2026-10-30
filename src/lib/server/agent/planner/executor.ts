/** Plan executor: follows the ExecutionPlan step by step, with parallel groups. */
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';
import type { ExecutionPlan, PlanStepStatus, SubagentRun } from './types.ts';
import {
	clauseSubagent,
	interviewSubagent,
	retrievalSubagent,
	writerSubagent
} from './subagents.ts';
import {
	toolAdmissionGuard,
	toolDraftQuestions,
	toolExtractState,
	toolGeneratePlan,
	toolRepairSections,
	toolRequestDocs,
	toolSearchLegal,
	toolSearchUserDocs,
	toolSplitClauses,
	toolVerifyCitations,
	type Blackboard
} from './tools.ts';
import { fallbackPlan } from '../pipeline.ts';
import { humanizeLabel } from '#lib/humanize.ts';

export interface ExecutorResult {
	stepStatus: Record<string, PlanStepStatus>;
	subagents: SubagentRun[];
}

export type { Blackboard } from './tools.ts';

export async function runSingleTool(
	stepId: string,
	tool: string,
	bb: Blackboard,
	opts: {
		signal?: AbortSignal;
		trace?: Trace;
		onToken?: (d: string) => void;
		onStage?: (s: string) => void;
	}
): Promise<void> {
	switch (tool) {
		case 'extractState':
			await toolExtractState(bb, opts);
			return;
		case 'searchLegal':
			await toolSearchLegal(bb, opts);
			return;
		case 'searchUserDocs':
			await toolSearchUserDocs(bb, opts);
			return;
		case 'draftQuestions':
			await toolDraftQuestions(bb, opts);
			return;
		case 'generatePlan':
			await toolGeneratePlan(bb, opts);
			return;
		case 'repairSections':
			await toolRepairSections(bb, opts);
			return;
		case 'verifyCitations':
			await toolVerifyCitations(bb, opts);
			return;
		case 'splitClauses':
			await toolSplitClauses(bb, opts);
			return;
		case 'admissionGuard':
			await toolAdmissionGuard(bb, opts);
			return;
		case 'requestDocs':
			await toolRequestDocs(bb, opts);
			return;
		case 'fallbackPlan':
			bb.plan = fallbackPlan(
				bb.issue,
				bb.answers,
				bb.passages,
				bb.documentIds,
				[...new Set(bb.rawUser.map((u) => u.filename))],
				bb.agentId,
				{
					docExcerpts: bb.rawUser.map((u) => u.content),
					clauses: bb.clauses
				}
			);
			bb.warnings.push('model-fallback');
			return;
		default:
			throw new Error(`unknown tool ${tool} in step ${stepId}`);
	}
}

function subagentFor(tool: string): string {
	if (tool === 'searchLegal' || tool === 'searchUserDocs' || tool === 'requestDocs')
		return 'retrieval';
	if (tool === 'extractState' || tool === 'draftQuestions') return 'interview';
	if (
		tool === 'generatePlan' ||
		tool === 'repairSections' ||
		tool === 'verifyCitations' ||
		tool === 'admissionGuard' ||
		tool === 'fallbackPlan'
	)
		return 'writer';
	if (tool === 'splitClauses') return 'clause-splitter';
	return 'planner';
}

/** Summarise executed steps into Subagent AI-Element runs. Shared by the
 * static executor and the reactive loop so the Trace shape stays identical. */
export function buildSubagentRuns(
	steps: ExecutionPlan['steps'],
	stepStatus: Record<string, PlanStepStatus>
): SubagentRun[] {
	const subagents: SubagentRun[] = [];
	const groups = new Map<string, { tools: SubagentRun['tools']; status: SubagentRun['status'] }>();
	for (const s of steps) {
		const name = subagentFor(s.tool);
		const entry = groups.get(name) ?? { tools: [], status: 'done' as const };
		const st = stepStatus[s.id];
		entry.tools.push({
			tool: s.tool,
			title: humanizeLabel(s.label).slice(0, 80),
			status: st === 'done' ? 'done' : st === 'skipped' ? 'skipped' : 'error'
		});
		if (st === 'error') entry.status = 'error';
		groups.set(name, entry);
	}
	for (const [name, g] of groups) {
		subagents.push({
			id: `${name}-run`,
			name,
			task:
				name === 'retrieval'
					? 'Search Kenyan law and attached documents'
					: name === 'interview'
						? 'Extract case state and draft questions'
						: name === 'writer'
							? 'Write and verify the plan'
							: `${name} step`,
			status: g.status,
			tools: g.tools
		});
	}
	return subagents;
}
/**
 * Execute the plan. Never throws for skip/fallback steps; aborts on
 * `onFail: abort` or when a fallback step itself fails.
 */
export async function executePlan(
	plan: ExecutionPlan,
	bb: Blackboard,
	opts: {
		signal?: AbortSignal;
		trace?: Trace;
		onToken?: (d: string) => void;
		onStage?: (s: string) => void;
		onStep?: (id: string, status: PlanStepStatus) => void;
	} = {}
): Promise<ExecutorResult> {
	const stepStatus: Record<string, PlanStepStatus> = Object.fromEntries(
		plan.steps.map((s) => [s.id, 'pending' as PlanStepStatus])
	);
	const byGroup = new Map<number | undefined, typeof plan.steps>();
	for (const s of plan.steps) {
		const list = byGroup.get(s.parallelGroup) ?? [];
		list.push(s);
		byGroup.set(s.parallelGroup, list);
	}

	// Preserve plan order: undefined groups run sequentially, numbered groups together.
	const orderedKeys = [...byGroup.keys()].sort((a, b) => {
		if (a === undefined) return -1;
		if (b === undefined) return 1;
		return (a as number) - (b as number);
	});
	// Re-expand in original step order within each emission: walk the plan and
	// flush each contiguous parallel block together.
	const emitted: Array<typeof plan.steps> = [];
	let i = 0;
	while (i < plan.steps.length) {
		const g = plan.steps[i]?.parallelGroup;
		if (g === undefined) {
			emitted.push([plan.steps[i] as (typeof plan.steps)[number]]);
			i++;
		} else {
			const block: typeof plan.steps = [];
			while (i < plan.steps.length && plan.steps[i]?.parallelGroup === g) {
				block.push(plan.steps[i] as (typeof plan.steps)[number]);
				i++;
			}
			emitted.push(block);
		}
	}
	void orderedKeys;

	for (const block of emitted) {
		const runBlock = async (s: (typeof plan.steps)[number]) => {
			stepStatus[s.id] = 'running';
			try {
				opts.onStep?.(s.id, 'running');
			} catch {
				/* progress hook must never break execution */
			}
			if (opts.trace) event(opts.trace, 'plan:step-start', `${s.id}=${s.tool}`);
			let attempts = 1 + (s.retry === 1 ? 1 : 0);
			let lastError: unknown = null;
			while (attempts-- > 0) {
				if (opts.signal?.aborted) throw new Error('Plan execution aborted');
				try {
					await runSingleTool(s.id, s.tool, bb, opts);
					stepStatus[s.id] = 'done';
					try {
						opts.onStep?.(s.id, 'done');
					} catch {
						/* progress hook must never break execution */
					}
					if (opts.trace) event(opts.trace, 'plan:step-done', `${s.id}=${s.tool}`);
					return;
				} catch (e) {
					lastError = e;
					if (attempts <= 0) break;
					if (opts.trace) event(opts.trace, 'plan:step-retry', `${s.id}=${s.tool}`);
				}
			}
			if (s.onFail === 'skip') {
				stepStatus[s.id] = 'skipped';
				try {
					opts.onStep?.(s.id, 'skipped');
				} catch {
					/* progress hook must never break execution */
				}
				if (opts.trace) event(opts.trace, 'plan:step-skip', `${s.id}=${s.tool}`);
				return;
			}
			if (s.onFail === 'fallback') {
				try {
					if (s.tool === 'generatePlan' || s.tool === 'draftQuestions') {
						// Deterministic floor: empty questions / fallback plan, never throw.
						if (s.tool === 'draftQuestions') bb.questions = [];
						else {
							bb.plan = fallbackPlan(
								bb.issue,
								bb.answers,
								bb.passages,
								bb.documentIds,
								[...new Set(bb.rawUser.map((u) => u.filename))],
								bb.agentId,
								{
									docExcerpts: bb.rawUser.map((u) => u.content),
									clauses: bb.clauses
								}
							);
							bb.warnings.push('model-fallback');
						}
						stepStatus[s.id] = 'done';
						if (opts.trace) event(opts.trace, 'plan:step-fallback', `${s.id}=${s.tool}`);
						return;
					}
					stepStatus[s.id] = 'skipped';
					return;
				} catch {
					stepStatus[s.id] = 'error';
					throw lastError;
				}
			}
			stepStatus[s.id] = 'error';
			throw lastError;
		};
		if (block.length === 1) {
			await runBlock(block[0] as (typeof plan.steps)[number]);
		} else {
			await Promise.all(block.map((s) => runBlock(s)));
		}
	}

	// Summarise into subagent runs for the Subagent AI Element (Trace shape).
	const subagents = buildSubagentRuns(plan.steps, stepStatus);
	void retrievalSubagent;
	void interviewSubagent;
	void writerSubagent;
	void clauseSubagent;
	return { stepStatus, subagents };
}
