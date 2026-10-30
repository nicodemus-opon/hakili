/** Vague-intake helpers for doc routing (no jurisdiction detection). */
import { contentTokens } from './interview/policy.ts';

/** Lowercase alphanumeric normalization for structural comparisons. */
function normalize(s: string): string {
	return String(s ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Vague intake text that carries no retrievable facts on its own. */
export function isVagueIssue(issue: string): boolean {
	const t = issue.trim().toLowerCase().replace(/\s+/g, ' ');
	if (!t) return true;
	if (t.length < 24) return true;
	return /^(please\s+)?(review|check|look at|go through|read|help( me)? with?|assist with?)\s+(this|it|the|my|attached|file|doc|document|pdf)(\s+(doc|document|file|pdf|please|for me))?[.!?]*$/.test(
		t
	);
}

/** Doc-check intent even when the issue is longer ("review my tenancy agreement"). */
export function hasDocCheckIntent(issue: string): boolean {
	return /\b(review|check|verify|explain|sign|risk|clause|agreement|contract|lease|tenancy|demand letter|memo)\b/i.test(
		issue
	);
}

/**
 * Pre-retrieval tripwire (deterministic, no model, no vocabulary): true
 * when the text carries at least one content token. Only token-free noise
 * ("hi", "???") fails here. Anything with words in it — greetings, meta
 * questions, real matters — passes, and relevance is decided
 * post-generation by answerAddressesQuestion. Failing closed here would
 * silence single-word matters ("rent"); failing open costs at most one
 * grounded attempt that the post-generation gate can still discard.
 */
export function hasSubstantiveContent(text: string): boolean {
	return contentTokens(text).size >= 1;
}

/**
 * Answer relevance gate (deterministic, no model, no vocabulary): true
 * when the generated answer shares at least one content token with the
 * user's question. Before comparing, verbatim multi-word echoes of the
 * question are stripped from the answer — restating the question is not
 * answering it (observed live: "what can you do [1] Civil Procedure…").
 * Single-word queries are never stripped, so "rent" still matches. When
 * the user's side has no content tokens at all, this fails closed.
 */
export function answerAddressesQuestion(answer: string, queryParts: string[]): boolean {
	const q = new Set<string>();
	for (const part of queryParts) for (const t of contentTokens(part)) q.add(t);
	if (q.size === 0) return false;
	let body = normalize(answer.replace(/\[\d+\]/g, ' '));
	for (const part of queryParts) {
		const np = normalize(part);
		if (np.includes(' ') && body.includes(np)) body = body.split(np).join(' ');
	}
	const a = contentTokens(body);
	// Shared tokens must carry letters: a bare number ("21") matching is
	// coincidence, not relevance.
	for (const t of a) if (/[a-z]/.test(t) && q.has(t)) return true;
	return false;
}
