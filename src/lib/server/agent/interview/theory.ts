/**
 * Intake theory: one narrow reasoning call that works the case like the
 * lawyer who will argue it — name the claim/procedure, list the facts that
 * would change the advice, mark each known or unknown. The drafting call
 * then handles phrasing only. Small models fail when one prompt demands
 * reasoning AND drafting AND JSON shape; split, each call does one job.
 *
 * General case theory, no domain knowledge: the model names the claim in
 * the retrieved law's own words and quotes the user's text for known facts.
 * Every failure mode (parse error, model down) yields null and drafting
 * proceeds exactly as before — theory never blocks a question.
 */
import { completeJson, initAgent } from '../llm.ts';
import { DIMENSION_HINTS, type Dimension } from './facts.ts';
import type { HistoryTurn, ResponseLang } from '../types.ts';
import type { Trace } from '../observability.ts';

export interface DecisiveFact {
	/** Which interview dimension this fact belongs to. */
	dimension: Dimension;
	/** The fact in the law's or user's own words. */
	fact: string;
	/** Whether the issue/answers already state it. */
	known: boolean;
}

export interface Theory {
	/** The one claim, defence, or procedure this story most likely turns on. */
	claim: string;
	/** Facts that would change the advice, most decisive first. */
	decisive: DecisiveFact[];
}

const DIMENSIONS = ['party', 'when_where_proof', 'steps_outcome', 'docs_deadline'] as const;

function buildTheoryPrompt(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	missing: Dimension[],
	lawHints = ''
): string {
	const langNote =
		lang === 'sw'
			? ' The user writes in Kiswahili; quote their words in the original Kiswahili.'
			: '';
	const dims = missing.map((d) => `- ${d}: ${DIMENSION_HINTS[d]}`).join('\n');
	const lawSection = lawHints
		? `\nRelevant Kenyan law (name the claim in THESE lines' words):\n${lawHints}\n`
		: '';
	const eg =
		'Example analysis (shape only — never reuse its nouns): {"claim":"unfair dismissal without notice and hearing","decisive":[{"fact":"whether written notice was given","dimension":"docs_deadline","known":false},{"fact":"whether a hearing happened","dimension":"steps_outcome","known":false}]}.';
	return `You are Hakili, a legal-preparation assistant for Kenya. Work this case the way the lawyer who will argue it would — analysis only, no questions.${langNote} Write the analysis in English even when the user writes Kiswahili. User issue: "${issue.slice(0, 800)}"

So far the user answered:
${
	history
		.map((h) => `Q: ${h.q}\nA: ${h.a}`)
		.join('\n')
		.slice(0, 1200) || '- (no answers yet)'
}
${lawSection}
Dimensions still open (ask ONLY inside these):
${dims}

Return ONLY JSON: {"claim":"...","decisive":[{"fact":"...","dimension":"...","known":true}]}. Rules: claim is ONE claim, defence, or procedure from the law lines above (or the plain story if no line matches). The claim MUST contain at least one content word from the ISSUE itself (same meaning counts: "dismissal" for "dismissed") — never adopt a law label the user never mentioned (no hire-purchase without hire-purchase, no rates without rates, no loan without a loan). decisive lists the 2-4 facts that would change your advice — the elements a court or tribunal checks, the procedure's requirements, any deadline that bars the claim — most decisive first. known is true ONLY if the issue or an answer explicitly states the fact. A listed dimension with no unknown decisive fact needs no question; simply leave it out. ${eg}`;
}

/**
 * Validate raw theory JSON. Unknown dimensions, empty facts, and oversized
 * payloads are dropped item-wise; garbage yields null (draft without
 * theory). Never throws.
 */
export function parseTheory(raw: unknown, missing: Dimension[]): Theory | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
	const r = raw as Record<string, unknown>;
	const claim = typeof r.claim === 'string' ? r.claim.trim().slice(0, 300) : '';
	const list = Array.isArray(r.decisive) ? r.decisive : [];
	const decisive: DecisiveFact[] = [];
	for (const item of list.slice(0, 6)) {
		if (!item || typeof item !== 'object') continue;
		const d = item as Record<string, unknown>;
		const dim = typeof d.dimension === 'string' ? d.dimension : '';
		if (!(DIMENSIONS as readonly string[]).includes(dim)) continue;
		if (!missing.includes(dim as Dimension)) continue;
		const fact = typeof d.fact === 'string' ? d.fact.trim().slice(0, 200) : '';
		if (!fact) continue;
		if (decisive.some((x) => x.dimension === (dim as Dimension))) continue;
		decisive.push({ dimension: dim as Dimension, fact, known: d.known === true });
	}
	if (!claim && decisive.length === 0) return null;
	return { claim, decisive };
}

/**
 * Render a parsed theory for the drafting prompt. Compact: claim plus the
 * unknown decisive facts per dimension. Null theory renders as '' (draft
 * prompt falls back to reasoning in its own analysis field).
 */
export function renderTheory(theory: Theory | null): string {
	if (!theory) return '';
	const unknown = theory.decisive.filter((d) => !d.known);
	const lines = unknown.map((d) => `- [${d.dimension}] ${d.fact}`);
	const known = theory.decisive.filter((d) => d.known);
	const knownNote =
		known.length > 0 ? ` Already established: ${known.map((d) => d.fact).join('; ')}.` : '';
	if (!theory.claim && lines.length === 0) return '';
	return `Agreed case theory (trust it unless the issue/answers contradict it): likely ${theory.claim || 'unclassified matter'}.${knownNote} Pin down, most decisive first:\n${lines.join('\n') || '- (nothing decisive missing)'}\n`;
}

export async function planTheory(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	missing: Dimension[],
	lawHints: string,
	opts: { signal?: AbortSignal; trace?: Trace } = {},
	run?: (prompt: string) => Promise<unknown>
): Promise<Theory | null> {
	const call =
		run ??
		(async (prompt: string): Promise<unknown> => {
			await initAgent();
			const res = await completeJson<Record<string, unknown>>(
				prompt,
				{ predict: 300, temp: 0.2, signal: opts.signal, model: 'theory' },
				(p) =>
					p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : null,
				opts.trace
			);
			return res.ok ? res.value : null;
		});
	try {
		return parseTheory(
			await call(buildTheoryPrompt(issue, history, lang, missing, lawHints)),
			missing
		);
	} catch {
		return null;
	}
}
