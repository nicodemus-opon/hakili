/** Native tool definitions for QVAC tool-calling (GBNF-constrained decoding).
 *
 * Small quantized models (Qwen3-1.7B/4B) stay reliable only with a narrow
 * allowlist (2-5 tools), enumerated names, and single-tool-per-turn. These
 * defs mirror the deterministic TS tools in `tools.ts` — the model only
 * decides *which* retrieval/deterministic step runs next; execution stays in
 * TypeScript with Zod-style manual arg validation and executor fallbacks.
 *
 * Interview tool (`draftQuestions`) is coarse by design: one call drafts the
 * whole validated batch (extract state + law hints + gates inside TS). The
 * model never phrases questions directly, so a flaky small model cannot leak
 * invented entities — worst case it drafts nothing and the deterministic tail
 * still runs.
 */
import type { Tool } from '@qvac/sdk';
import { agentConfig, type AgentId } from '../agents.ts';
import type { PlanGoal } from './types.ts';

export const NATIVE_TOOL_BUDGET_MS = 30_000;
export const MAX_NATIVE_STEPS = 6;
/** Hard cap so tool defs + issue + history never blow the 4096 ctx window. */
export const MAX_TOOL_QUERY_CHARS = 1000;

function strProp(description: string): Record<string, unknown> {
	return { type: 'string', description };
}

const SEARCH_LEGAL: Tool = {
	type: 'function',
	name: 'searchLegal',
	description:
		'Search Kenyan legal corpus (statutes, cases, procedures). Use first for any legal question.',
	parameters: {
		type: 'object',
		properties: {
			query: strProp('Legal search query: parties, matter type, key terms (max 1000 chars)')
		},
		required: ['query']
	}
};

const SEARCH_USER_DOCS: Tool = {
	type: 'function',
	name: 'searchUserDocs',
	description:
		'Search the user-attached documents. Use when files are attached or the issue references a document.',
	parameters: {
		type: 'object',
		properties: {
			query: strProp('Document search query: names, dates, amounts, clause topics (max 1000 chars)')
		},
		required: ['query']
	}
};

const SPLIT_CLAUSES: Tool = {
	type: 'function',
	name: 'splitClauses',
	description:
		'Split attached documents into numbered clauses for per-clause review. Doc-check only.',
	parameters: { type: 'object', properties: {} }
};

const REQUEST_DOCS: Tool = {
	type: 'function',
	name: 'requestDocs',
	description:
		'Mark that attached documents are still needed instead of inventing a plan. Doc-check only, no files attached.',
	parameters: { type: 'object', properties: {} }
};

const DRAFT_QUESTIONS: Tool = {
	type: 'function',
	name: 'draftQuestions',
	description:
		'Draft 1-4 follow-up interview questions for still-missing facts. Interview goal only; call after searchLegal.',
	parameters: {
		type: 'object',
		properties: {
			focus: {
				type: 'array',
				description:
					'Optional subset of dimensions to draft for: party, when_where_proof, steps_outcome, docs_deadline.',
				items: { type: 'string' }
			},
			maxQuestions: {
				type: 'integer',
				description: 'Max questions to draft (1-4, default 4).'
			}
		},
		required: []
	}
};

const ALL_NATIVE: Record<string, Tool> = {
	searchLegal: SEARCH_LEGAL,
	searchUserDocs: SEARCH_USER_DOCS,
	splitClauses: SPLIT_CLAUSES,
	requestDocs: REQUEST_DOCS,
	draftQuestions: DRAFT_QUESTIONS
};
// NOTE: verifyCitations stays a deterministic writer-tail step (executor-only);
// it is intentionally not a native tool so the reactive allowlist stays ≤5
// for small-model reliability.

/** Valid interview dimensions for the draftQuestions focus filter. */
export const DRAFT_DIMENSIONS = [
	'party',
	'when_where_proof',
	'steps_outcome',
	'docs_deadline'
] as const;

export interface NativeToolContext {
	documentIds?: string[];
	goal?: PlanGoal;
}

/**
 * Filter native defs to the agent allowlist, then contextually narrow for
 * small-model reliability (fewer visible tools = less drift). Without `ctx`
 * returns the full allowlist (backward compat for tests/callers).
 */
export function nativeToolsFor(agent: AgentId, ctx?: NativeToolContext): Tool[] {
	const allowed = new Set(agentConfig(agent).allowedTools);
	let tools = Object.values(ALL_NATIVE).filter((t) => allowed.has(t.name));
	if (!ctx) return tools;
	const hasDocs = (ctx.documentIds?.length ?? 0) > 0;
	// Doc-conditional: hide file tools that cannot succeed in this context.
	// searchUserDocs stays always visible (handles empty doc lists via
	// pre-seeded excerpts and vague-query fallback; hiding it breaks the
	// no-docs interview path).
	tools = tools.filter((t) => {
		if (!hasDocs && t.name === 'splitClauses') return false;
		if (hasDocs && t.name === 'requestDocs') return false;
		if (ctx.goal !== undefined && ctx.goal !== 'interview' && t.name === 'draftQuestions')
			return false;
		return true;
	});
	return tools;
}

export function isNativeToolEnabled(): boolean {
	return process.env.QVAC_NATIVE_TOOLS !== '0';
}

/** Manual arg validation (no zod dependency): null = reject, model gets error feedback.
 * draftQuestions is lenient by design (small-model reliability): invalid or
 * missing focus/maxQuestions degrade to defaults instead of rejecting, so the
 * call never wastes a ReAct turn on error feedback. */
export function validateNativeArgs(
	name: string,
	args: Record<string, unknown>
): Record<string, unknown> | null {
	if (name === 'searchLegal' || name === 'searchUserDocs') {
		const q = typeof args.query === 'string' ? args.query.trim() : '';
		if (!q) return null;
		return { query: q.slice(0, MAX_TOOL_QUERY_CHARS) };
	}
	if (name === 'splitClauses' || name === 'verifyCitations' || name === 'requestDocs') return {};
	if (name === 'draftQuestions') {
		const out: Record<string, unknown> = {};
		if (Array.isArray(args.focus)) {
			const focus = args.focus
				.filter((d): d is string => typeof d === 'string')
				.map((d) => d.trim())
				.filter((d) => (DRAFT_DIMENSIONS as readonly string[]).includes(d))
				.slice(0, 4);
			if (focus.length > 0) out.focus = [...new Set(focus)];
		}
		const max =
			typeof args.maxQuestions === 'number'
				? Math.floor(args.maxQuestions)
				: typeof args.maxQuestions === 'string' && args.maxQuestions.trim() !== ''
					? Math.floor(Number(args.maxQuestions))
					: NaN;
		if (Number.isFinite(max)) out.maxQuestions = Math.max(1, Math.min(4, max));
		return out;
	}
	return null;
}

/** Rough char budget for tool defs, so the ReAct prompt can truncate history to fit ctx. */
export function estimateToolDefsSize(tools: Tool[]): number {
	return tools.reduce((n, t) => n + t.name.length + (t.description?.length ?? 0) + 120, 0);
}
