/** Dynamic execution-plan generation: LLM draft with deterministic fallback. */
import { initAgent } from '../llm.ts';
import { agentConfig, normalizeAgentId, type AgentId } from '../agents.ts';
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';
import type { ExecutionPlan, PlanGoal, PlanStep, PlanTool } from './types.ts';
import { humanizeLabel } from '#lib/humanize.ts';

const MAX_STEPS = 6;

const TOOL_SET = new Set<string>([
	'extractState',
	'searchLegal',
	'searchUserDocs',
	'draftQuestions',
	'generatePlan',
	'repairSections',
	'verifyCitations',
	'splitClauses',
	'admissionGuard',
	'requestDocs',
	'fallbackPlan'
]);

function step(id: string, tool: PlanTool, label: string, opts: Partial<PlanStep> = {}): PlanStep {
	return {
		id,
		tool,
		label,
		budgetMs: 30_000,
		retry: tool === 'draftQuestions' || tool === 'generatePlan' ? 1 : 0,
		onFail: tool === 'searchLegal' || tool === 'searchUserDocs' ? 'skip' : 'fallback',
		...opts
	};
}

/** Deterministic per-agent, per-goal fallback. No model needed. */
export function fallbackPlanFor(goal: PlanGoal, agent: AgentId): ExecutionPlan {
	const id = normalizeAgentId(agent);
	if (goal === 'interview') {
		if (id === 'check') {
			return {
				goal,
				agentId: id,
				title: 'Plan: check document interview',
				reason: 'doc-first fallback: user docs before law, then doc-focused questions',
				dynamic: false,
				steps: [
					step('search-docs', 'searchUserDocs', 'Search attached documents', {
						parallelGroup: 1,
						onFail: 'skip'
					}),
					step('retrieve-law', 'searchLegal', 'Search Kenyan law', {
						parallelGroup: 1,
						onFail: 'skip'
					}),
					step('extract-state', 'extractState', 'Extract what is known and missing'),
					step('draft-questions', 'draftQuestions', 'Draft doc-focused questions')
				]
			};
		}
		return {
			goal,
			agentId: id,
			title: id === 'draft' ? 'Plan: drafting interview' : 'Plan: fact-first interview',
			reason: 'static fact-first fallback: state, retrieval, then one draft per missing dimension',
			dynamic: false,
			steps: [
				step('extract-state', 'extractState', 'Extract what is known and missing', {
					parallelGroup: 1
				}),
				step('retrieve-law', 'searchLegal', 'Search Kenyan law', {
					parallelGroup: 1,
					onFail: 'skip'
				}),
				step('draft-questions', 'draftQuestions', 'Draft one question per missing dimension')
			]
		};
	}
	if (goal === 'followup') {
		return {
			goal,
			agentId: id,
			title: 'Plan: answer follow-up',
			reason: 'static follow-up fallback: language, retrieval, grounded answer',
			dynamic: false,
			steps: [
				step('retrieve-law', 'searchLegal', 'Search Kenyan law', { onFail: 'skip' }),
				step('generate-plan', 'generatePlan', 'Draft grounded follow-up answer', {
					onFail: 'fallback'
				})
			]
		};
	}
	// goal === 'plan'
	if (id === 'check') {
		return {
			goal,
			agentId: id,
			title: 'Plan: check document before signing',
			reason: 'doc-first fallback: user docs, law, clause split, plan, verify',
			dynamic: false,
			steps: [
				step('search-docs', 'searchUserDocs', 'Read attached documents', {
					parallelGroup: 1,
					onFail: 'skip'
				}),
				step('retrieve-law', 'searchLegal', 'Search Kenyan law', {
					parallelGroup: 1,
					onFail: 'skip'
				}),
				step('split-clauses', 'splitClauses', 'Split document into clauses', { onFail: 'skip' }),
				step('generate-plan', 'generatePlan', 'Write document check plan', { onFail: 'fallback' }),
				step('verify-citations', 'verifyCitations', 'Verify citations', { onFail: 'skip' })
			]
		};
	}
	if (id === 'draft') {
		return {
			goal,
			agentId: id,
			title: 'Plan: draft reply',
			reason: 'drafting fallback: retrieval, plan, admission guard, verify',
			dynamic: false,
			steps: [
				step('retrieve-law', 'searchLegal', 'Search Kenyan law', {
					parallelGroup: 1,
					onFail: 'skip'
				}),
				step('search-docs', 'searchUserDocs', 'Read attached documents', {
					parallelGroup: 1,
					onFail: 'skip'
				}),
				step('generate-plan', 'generatePlan', 'Draft reply with sources', {
					onFail: 'fallback'
				}),
				step('admission-guard', 'admissionGuard', 'Drop invented admissions', {
					onFail: 'skip'
				}),
				step('verify-citations', 'verifyCitations', 'Verify citations', { onFail: 'skip' })
			]
		};
	}
	return {
		goal,
		agentId: id,
		title: 'Plan: preparation checklist',
		reason: 'static plan fallback: retrieval, plan, repair, verify',
		dynamic: false,
		steps: [
			step('retrieve-law', 'searchLegal', 'Search Kenyan law', {
				parallelGroup: 1,
				onFail: 'skip'
			}),
			step('search-docs', 'searchUserDocs', 'Read attached documents', {
				parallelGroup: 1,
				onFail: 'skip'
			}),
			step('generate-plan', 'generatePlan', 'Write preparation plan', { onFail: 'fallback' }),
			step('repair-sections', 'repairSections', 'Repair weak sections', { onFail: 'skip' }),
			step('verify-citations', 'verifyCitations', 'Verify citations', { onFail: 'skip' })
		]
	};
}

function validateStep(raw: unknown): PlanStep | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
	const r = raw as Record<string, unknown>;
	const id = typeof r.id === 'string' ? r.id.slice(0, 60).trim() : '';
	const tool = typeof r.tool === 'string' ? r.tool : '';
	const rawLabel = typeof r.label === 'string' ? r.label.slice(0, 80).trim() : '';
	const label = humanizeLabel(rawLabel).slice(0, 80).trim();
	if (!id || !TOOL_SET.has(tool) || !label) return null;
	const parallelGroup =
		typeof r.parallelGroup === 'number' && Number.isFinite(r.parallelGroup)
			? Math.max(0, Math.min(4, Math.floor(r.parallelGroup)))
			: undefined;
	const retry = r.retry === 1 ? 1 : 0;
	const onFail = r.onFail === 'skip' || r.onFail === 'abort' ? r.onFail : 'fallback';
	return { id, tool: tool as PlanTool, label, budgetMs: 30_000, retry, onFail, parallelGroup };
}

/** Writer tools never belong in an interview plan: the interview phase
 * retrieves and drafts questions only. An LLM plan that smuggles in
 * generatePlan/admissionGuard both wastes a throwaway plan generation and
 * renders a duplicate writer subagent in the interview trace. */
const INTERVIEW_WRITER_TOOLS = new Set([
	'generatePlan',
	'repairSections',
	'verifyCitations',
	'admissionGuard',
	'fallbackPlan'
]);

/** Validate a raw LLM plan against the agent allowlist. Null = use fallback. */
export function validatePlan(
	parsed: unknown,
	goal: PlanGoal,
	agent: AgentId
): ExecutionPlan | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const r = parsed as Record<string, unknown>;
	const rawSteps = Array.isArray(r.steps) ? r.steps : null;
	if (!rawSteps || rawSteps.length === 0) return null;
	const allowed = new Set(agentConfig(agent).allowedTools);
	const steps: PlanStep[] = [];
	const seen = new Set<string>();
	for (const item of rawSteps.slice(0, MAX_STEPS)) {
		const s = validateStep(item);
		if (!s) return null;
		if (!allowed.has(s.tool)) return null;
		if (goal === 'interview' && INTERVIEW_WRITER_TOOLS.has(s.tool)) return null;
		if (seen.has(s.id)) return null;
		seen.add(s.id);
		steps.push(s);
	}
	if (steps.length === 0) return null;
	const title =
		typeof r.title === 'string' && r.title.trim()
			? humanizeLabel(r.title.trim().slice(0, 80)).slice(0, 80)
			: fallbackPlanFor(goal, agent).title;
	const reason =
		typeof r.reason === 'string' ? r.reason.slice(0, 300) : 'model-generated execution plan';
	return { goal, agentId: agent, title, reason, steps, dynamic: true };
}

function buildPlannerPrompt(goal: PlanGoal, agent: AgentId, issue: string, extra: string): string {
	const cfg = agentConfig(agent);
	const tools = cfg.allowedTools.join(', ');
	return `You plan tool calls for Hakili, an offline Kenyan legal-preparation assistant. Goal: ${goal}. Agent: ${agent}.${cfg.plannerFragment} Pick 2-5 steps ONLY from this allowlist, in execution order: ${tools}. Each step needs a short label (max 8 words). Steps with the same parallelGroup number run together. Issue: "${issue.slice(0, 400)}" ${extra.slice(0, 300)} Reply ONLY JSON: {"title":"Plan: ...","reason":"...","steps":[{"id":"...","tool":"...","label":"...","retry":0,"onFail":"skip","parallelGroup":1}]}`;
}

/** GBNF schema for the planner response. Explicit strictness: the backend
 * forwards the schema as-is (no OpenAI-style auto-tightening). */
const PLAN_JSON_SCHEMA: Record<string, unknown> = {
	type: 'object',
	properties: {
		title: { type: 'string', description: 'Short plan title' },
		reason: { type: 'string', description: 'One-line reason for this plan' },
		steps: {
			type: 'array',
			description: '2-5 execution steps in order',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Stable step id, e.g. retrieve-law' },
					tool: { type: 'string', description: 'Tool name from the allowlist' },
					label: { type: 'string', description: 'Short human label, max 8 words' },
					retry: { type: 'integer', description: '0 or 1' },
					onFail: { type: 'string', description: 'skip, fallback or abort' },
					parallelGroup: { type: 'integer', description: 'Steps sharing a group run together' }
				},
				required: ['id', 'tool', 'label'],
				additionalProperties: false
			}
		}
	},
	required: ['title', 'reason', 'steps'],
	additionalProperties: false
};

/** LLM-drafted plan with deterministic fallback. Never throws. */
export async function draftExecutionPlan(
	goal: PlanGoal,
	issue: string,
	opts: { agentId?: unknown; extra?: string; signal?: AbortSignal; trace?: Trace } = {}
): Promise<ExecutionPlan> {
	const agent = normalizeAgentId(opts.agentId);
	const fallback = fallbackPlanFor(goal, agent);
	try {
		await initAgent();
		const { completeStructured } = await import('../llm.ts');
		// GBNF-constrained draft: grammar guarantees shape, validatePlan still
		// enforces the agent allowlist + ids. Free-form retry inside covers
		// backends without responseFormat support.
		const res = await completeStructured<unknown>(
			buildPlannerPrompt(goal, agent, issue, opts.extra ?? ''),
			PLAN_JSON_SCHEMA,
			{ predict: 256, temp: 0.2, signal: opts.signal, name: 'execution_plan', model: 'planner' },
			(p) => (p && typeof p === 'object' && !Array.isArray(p) ? p : null),
			opts.trace
		);
		if (!res.ok) {
			if (opts.trace) event(opts.trace, 'plan:planner-fallback', 'parse-failed');
			return fallback;
		}
		if (opts.trace && res.constrained) event(opts.trace, 'plan:planner-gbnf', 'constrained=1');
		const valid = validatePlan(res.value, goal, agent);
		if (!valid) {
			if (opts.trace) event(opts.trace, 'plan:planner-fallback', 'validation-failed');
			return fallback;
		}
		if (opts.trace)
			event(opts.trace, 'plan:generated', `${valid.title} steps=${valid.steps.length} dynamic=1`);
		return valid;
	} catch {
		if (opts.trace) event(opts.trace, 'plan:planner-fallback', 'model-down');
		return fallback;
	}
}

/** Offline plan adherence: every step uses an allowed tool, ids unique, <= 6 steps. */
export function planAdherence(plan: ExecutionPlan, agent: AgentId): boolean {
	if (plan.steps.length === 0 || plan.steps.length > MAX_STEPS) return false;
	const allowed = new Set(agentConfig(agent).allowedTools);
	const seen = new Set<string>();
	for (const s of plan.steps) {
		if (!allowed.has(s.tool) || seen.has(s.id)) return false;
		seen.add(s.id);
	}
	return true;
}
