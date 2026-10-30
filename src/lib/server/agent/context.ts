/** Central context budgets + compression helpers (Write/Select/Compress/Isolate). */
import { packPassages } from './plan/validator.ts';
import type { CaseState } from './interview/facts.ts';
import type { HistoryTurn, Passage } from './types.ts';

/**
 * Single source of truth for prompt budgets. The local model runs a 4k
 * context shared with the prediction budget, so every prompt packs
 * ranked passages + user text into fixed char budgets instead of ad-hoc
 * `slice(0, N)` calls scattered across the harness.
 */
export const CONTEXT_BUDGETS = {
	/** Law hints for interview drafting (one `packPassages` window). */
	INTERVIEW_LAW_HINTS: 1600,
	/** Full plan context (ranked, most-relevant-first). */
	PLAN_FULL: 3500,
	/** Fitted plan context for overflow retry + simple retry. */
	PLAN_FIT: 2000,
	/** User-document excerpts in the plan prompt. */
	PLAN_USER_FIT: 1000,
	/** Isolated repair context: top passages only, never the full set. */
	REPAIR_PASSAGES: 3,
	REPAIR_BUDGET: 1500,
	/** Follow-up prompt windows. */
	FOLLOWUP_ISSUE: 600,
	FOLLOWUP_FACTS: 1200,
	FOLLOWUP_PLAN: 2000,
	FOLLOWUP_PASSAGES: 2000,
	FOLLOWUP_TURNS: 6,
	/** Retrieval query cap: embeddings degrade past ~1k chars. */
	QUERY_MAX: 1000
} as const;

/** Format ranked passages into a fixed budget without mid-word cuts. */
export function formatLawHints(
	passages: Array<{ title: string; citation: string; content: string }>,
	budget: number = CONTEXT_BUDGETS.INTERVIEW_LAW_HINTS
): string {
	if (passages.length === 0) return '';
	return packPassages(passages, budget);
}

/** Keep only the freshest raw turns; older turns survive as a recap line. */
export function compressHistory(history: HistoryTurn[], keep = 2): HistoryTurn[] {
	if (history.length <= keep) return history;
	return history.slice(-keep);
}

/** Loss-aware recap: case-state missing list + last answer, not full replay. */
export function summarizeCaseState(state: CaseState, history: HistoryTurn[]): string {
	const last = history.length > 0 ? (history[history.length - 1]?.a ?? '').slice(0, 120) : '';
	const missing = state.missing.join(',');
	const known = state.known.map((k) => k.dimension).join(',') || 'none';
	return `known=[${known}] missing=[${missing}] last-answer="${last}"`;
}

/** Build a bounded retrieval query from issue + answers/facts. */
export function buildRetrievalQuery(parts: string[]): string {
	return parts
		.map((p) => (p ?? '').trim())
		.filter(Boolean)
		.join(' ')
		.slice(0, CONTEXT_BUDGETS.QUERY_MAX);
}

/** Isolated repair context: top-N passages only, so one noisy source cannot poison repair. */
export function repairContext(
	passages: Passage[],
	topN: number = CONTEXT_BUDGETS.REPAIR_PASSAGES
): string {
	return packPassages(passages.slice(0, topN), CONTEXT_BUDGETS.REPAIR_BUDGET);
}

/**
 * Bounded per-process cache: plain Maps in `facts.ts`/`loop.ts`/`language.ts`
 * grow forever and pin a hallucinated `yes` for the process lifetime
 * (poisoning). Cap at `max` entries with FIFO eviction; callers keep the
 * same get/set semantics.
 */
export function boundedSet<K, V>(map: Map<K, V>, key: K, value: V, max = 100): void {
	if (map.has(key)) map.delete(key);
	while (map.size >= max) {
		const oldest = map.keys().next();
		if (oldest.done) break;
		map.delete(oldest.value);
	}
	map.set(key, value);
}
