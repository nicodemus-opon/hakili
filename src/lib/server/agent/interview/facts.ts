/**
 * Fact-first case state: which interview dimensions the user has already
 * covered, and which are still missing. Extraction is model-driven, but the
 * model can only claim a dimension is KNOWN by quoting the user's own text
 * verbatim, and the dimension set is a fixed enum — so the extractor has no
 * hallucination surface. Every failure mode (parse error, model down,
 * unproven evidence) degrades to "still missing", i.e. the old ask-anyway
 * behavior. Never worse.
 */
import { completeJson, completeText, initAgent } from '../llm.ts';
import { boundedSet, summarizeCaseState } from '../context.ts';
import { isSubstantiveEvidence } from './policy.ts';
import { extractLiteEntities } from './entities-lite.ts';
import type { HistoryTurn, ResponseLang } from '../types.ts';
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';

/**
 * Interview shape (advocate intake): the four things a counsel interview
 * must learn. Keys are stable for tests; hints are advocate-framed.
 */
export const DIMENSIONS = ['party', 'when_where_proof', 'steps_outcome', 'docs_deadline'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/** Human-readable dimension intent for prompts (English; output language is directed separately). Nominal phrasing (no question words) so the model cannot parrot the descriptions as drafts. */
export const DIMENSION_HINTS: Record<Dimension, string> = {
	party:
		'parties with standing, capacity, and representation (client, opposing party, counsel on record) — names and roles for pleadings',
	when_where_proof:
		'cause of action and its elements: material facts, jurisdiction and venue, dates, places, and proof (agreement, receipt, message, photo, OB/reference number)',
	steps_outcome:
		'relief sought and strategy: prayers, forum, procedure, steps taken, settlement posture, and the next filing or service step',
	docs_deadline:
		'bundle and limitation: documents held or required, filing and service deadlines, and any time bar stated in law or correspondence'
};

export interface KnownFact {
	dimension: Dimension;
	/** Verbatim slice of the user's own text proving coverage. */
	evidence: string;
}

export interface CaseState {
	known: KnownFact[];
	missing: Dimension[];
}

function norm(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Quote check on normalized text: the slice must appear in the source,
 * verbatim first, then a prefix-tolerant fallback where every anchor token
 * prefix-matches a source token (min 4 chars). The fallback covers
 * inflections the verbatim check misses — "eviction"↔"evict",
 * "slip"↔"slipped", "dismissal"↔"dismissed" (live repros: good drafts died
 * as invalid-anchor over morphology) — without letting invented nouns
 * through ("Mombasa" still matches nothing).
 */
export function quoteGrounds(evidence: string, source: string): boolean {
	const e = norm(evidence);
	if (e.length < 3) return false;
	const ns = norm(source);
	if (ns.includes(e)) return true;
	const et = e.split(' ').filter(Boolean);
	if (et.length === 0) return false;
	const st = ns.split(' ').filter(Boolean);
	return et.every((t) => {
		// Shared 4+ char stem: "dismissal"↔"dismissed" and "eviction"↔"evict"
		// match, but "notice" never grounds via a stray "not", nor "car" via
		// "careful".
		return st.some((s) => {
			const n = Math.min(t.length, s.length);
			let shared = 0;
			while (shared < n && t[shared] === s[shared]) shared++;
			return shared >= 4;
		});
	});
}

/**
 * Evidence source: the issue plus the user's ANSWERS — never the questions.
 * Question text must not prove coverage, or "When and where did this
 * happen?" would count as its own evidence.
 */
export function evidenceSource(issue: string, history: HistoryTurn[]): string {
	return [issue, ...history.map((h) => h.a ?? '')].join(' ');
}

/**
 * Validate raw extractor JSON against the evidence source. The model's own
 * "missing" list is ignored entirely: missing = every dimension without
 * quote-grounded, substantive evidence. Thin-air slices ("none", "idk",
 * "yes", "no action") can never prove a dimension is covered, in any
 * language — see isSubstantiveEvidence. Returns null only when the payload
 * is unusable.
 */
export function parseCaseState(parsed: unknown, source: string): CaseState | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const raw = (parsed as Record<string, unknown>).known;
	if (raw !== undefined && !Array.isArray(raw)) return null;
	const covered = new Set<Dimension>();
	const known: KnownFact[] = [];
	for (const k of (raw as unknown[]) ?? []) {
		if (!k || typeof k !== 'object') continue;
		const r = k as Record<string, unknown>;
		const dim = typeof r.dimension === 'string' ? r.dimension : '';
		const ev = typeof r.evidence === 'string' ? r.evidence.trim() : '';
		if (!(DIMENSIONS as readonly string[]).includes(dim)) continue;
		if (!isSubstantiveEvidence(ev)) continue;
		if (!quoteGrounds(ev, source)) continue;
		const d = dim as Dimension;
		if (covered.has(d)) continue;
		covered.add(d);
		known.push({ dimension: d, evidence: ev.slice(0, 200) });
	}
	return { known, missing: DIMENSIONS.filter((d) => !covered.has(d)) };
}

function buildExtractPrompt(issue: string, history: HistoryTurn[], lang: ResponseLang): string {
	const convo = history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n') || '(no answers yet)';
	const langNote =
		lang === 'sw' ? ' The user writes in Kiswahili; quote evidence in the original Kiswahili.' : '';
	return `You analyze a Kenyan legal-preparation interview. Decide which of the four interview dimensions the user has ALREADY given enough information about.${langNote}

DIMENSIONS:
- party: ${DIMENSION_HINTS.party}
- when_where_proof: ${DIMENSION_HINTS.when_where_proof}
- steps_outcome: ${DIMENSION_HINTS.steps_outcome}
- docs_deadline: ${DIMENSION_HINTS.docs_deadline}

A dimension counts as KNOWN only if the ISSUE or an ANSWER explicitly states it. Evasive, empty, or content-free answers do NOT make a dimension known. For each known dimension, copy 2-12 EXACT words from the ISSUE or an ANSWER as "evidence" (verbatim, never from a question). Generic descriptors do NOT cover a dimension: "my neighbor" or "someone" without a name leaves party missing; "my land" or "at home" without a specific place, date, or proof leaves when_where_proof missing. When unsure, leave the dimension out.

ISSUE: ${issue.slice(0, 800)}

INTERVIEW SO FAR:
${convo.slice(0, 1200)}

Reply ONLY with JSON: {"known":[{"dimension":"party","evidence":"..."}]}. If nothing is known yet: {"known":[]}.`;
}

const stateCache = new Map<string, CaseState>();
const adviceCache = new Map<string, boolean>();

/**
 * Deterministic case signals: the user's words name a person, org,
 * date, amount, document, or reference. Such specifics mean a real
 * situation is being described — never a general advice question.
 * No vocabularies: NER spans only, advisory and fail-open. Past tense
 * alone is NOT a signal: modal passives ("can i be evicted") tag as
 * past tense but are hypothetical — those go to the small-LLM judge.
 *
 * Places alone NEVER count: a bare jurisdiction ("in Kenya", "Nairobi")
 * names where the law applies, not a lived case. Live repro: "How do I
 * start a business in Kenya?" tagged Kenya as a place and forced a
 * dispute interview for a how-to question.
 */
export function hasCaseEntities(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang
): boolean {
	try {
		const source = evidenceSource(issue, history);
		const e = extractLiteEntities(source, lang);
		return (
			e.persons.length > 0 ||
			e.orgs.length > 0 ||
			e.dates.length > 0 ||
			e.money.length > 0 ||
			e.domain.length > 0
		);
	} catch {
		return false;
	}
}

/**
 * Deterministic prospective-procedure signal: "how do I start X", "what
 * are the steps/requirements to register X", "jinsi ya kuanzisha ...".
 * A how-to asks about future steps, never a lived dispute — it must be
 * answered from the law, never interrogated. Narrow on purpose: the issue
 * must match a how-to shape; case signals (checked first by the caller)
 * always win, so "I was dismissed, how do I appeal?" stays a case.
 * Offline-safe: no model, no vocabulary beyond procedure shapes.
 */
export function isProceduralHowTo(issue: string, history: HistoryTurn[] = []): boolean {
	const text = `${issue} ${history.map((h) => `${h.q} ${h.a}`).join(' ')}`.toLowerCase();
	const howDoI = /^\s*how\s+(do|can|should|would)\s+(i|we|one)\b/.test(issue.toLowerCase());
	const howTo =
		/\bhow\s+(do|can|should|to)\b[^.]{0,80}\b(start|register|open|incorporate|form|set\s+up|run|operate)\b/.test(
			text
		);
	const stepsFor =
		/\b(what\s+(are|is)\s+the\s+(steps|requirements?|procedure|process)|requirements|procedure|steps)\b[^.]{0,80}\b(start|register|open|incorporate|form|business|company|firm|enterprise|group|ngo|society|partnership|business\s+name)\b/.test(
			text
		);
	const swHowTo =
		/(ninawezaje|nifanye\s+nini|hatua\s+gani|mahitaji\s+gani|jinsi\s+ya\s+kuanzisha|jinsi\s+ya\s+kusajili)/.test(
			text
		);
	return howDoI || howTo || stepsFor || swHowTo;
}

function buildAdvicePrompt(issue: string, history: HistoryTurn[], lang: ResponseLang): string {
	const langNote =
		lang === 'sw'
			? ' The user writes in Kiswahili; their question may be general or about their own situation.'
			: '';
	const convo =
		history
			.map((h) => `Q: ${h.q}\nA: ${h.a}`)
			.join('\n')
			.slice(0, 600) || '(no answers yet)';
	return `You triage intake for a Kenyan legal-preparation assistant.${langNote} Is the user asking a GENERAL legal question (advice about rights, rules, or hypotheticals) rather than describing something that already happened or is happening to them? Tense decides: "My employer dismissed me" (past, it happened) is their own situation -> "no"; "can my employer dismiss me" or "can i be evicted without a notice" (modal, hypothetical, including passive) is general -> "yes". Prior answers describing their own situation count as their own situation. Reply with only one word: "yes" for a general question, "no" for their own situation.\n\nISSUE: ${issue.slice(0, 500)}\n\nHISTORY:\n${convo}`;
}

/**
 * Advice-vs-case intent. A general legal question ("can my employer dismiss
 * me without notice", "can i be evicted without a notice") or a prospective
 * procedure ("how do I start a business") must be answered from the law,
 * never interrogated: true skips the interview outright. Only strong
 * deterministic signals (names, dates, amounts, documents) win without a
 * model call — the small-LLM judge decides everything else live, including
 * past-tense-only text. How-to shapes resolve deterministically without a
 * model call. Fails OPEN to case (false): any trouble keeps the old
 * ask-anyway behavior. Cached per issue+history.
 */
export async function detectAdviceQuestion(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	opts: { signal?: AbortSignal; trace?: Trace } = {},
	run: (prompt: string) => Promise<string | null> = async (prompt) => {
		await initAgent();
		try {
			const out = await completeText(
				prompt,
				{ predict: 8, temp: 0, signal: opts.signal, model: 'advice' },
				opts.trace
			);
			return out;
		} catch {
			return null;
		}
	}
): Promise<boolean> {
	const key = `advice:${issue}||${history.map((h) => `${h.q}${h.a}`).join('|')}`.slice(0, 2000);
	const hit = adviceCache.get(key);
	if (hit !== undefined) return hit;
	let advice = false;
	try {
		// Stated specifics are a case by construction — no model call.
		if (!hasCaseEntities(issue, history, lang)) {
			// Prospective procedure ("how do I start...") is advice by
			// construction too — no model call, offline-safe.
			if (isProceduralHowTo(issue, history)) {
				advice = true;
			} else {
				const out = await run(buildAdvicePrompt(issue, history, lang));
				advice = /^\s*yes\b/i.test(out ?? '');
			}
		}
	} catch {
		advice = false;
	}
	boundedSet(adviceCache, key, advice, 100);
	if (opts.trace && advice) event(opts.trace, 'interview:advice', 'general-question');
	return advice;
}

/**
 * Deterministic coverage backstop: structural signals in the user's own
 * text mark dimensions known even when the extractor model fails or misses
 * them. Covers party, when_where_proof, and docs_deadline: those must never
 * be re-asked for stated facts. No vocabularies — NER
 * spans (person/org/date/place/money, gazetteer documents/references)
 * verified verbatim via quoteGrounds. Only ever ADDS known facts; every
 * failure mode yields nothing and the model state stands.
 */
export function deterministicKnown(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang
): KnownFact[] {
	const source = evidenceSource(issue, history);
	const known: KnownFact[] = [];
	const covered = new Set<Dimension>();
	const claim = (dimension: Dimension, evidence: string): void => {
		const ev = evidence.trim().slice(0, 200);
		if (covered.has(dimension)) return;
		if (!isSubstantiveEvidence(ev)) return;
		if (!quoteGrounds(ev, source)) return;
		covered.add(dimension);
		known.push({ dimension, evidence: ev });
	};
	try {
		const e = extractLiteEntities(source, lang);
		const partySpan = [...e.persons, ...e.orgs]
			.map((s) => s.trim())
			.filter((s) => s.length >= 3)
			.find((s) => quoteGrounds(s, source));
		if (partySpan) claim('party', partySpan);
		const dateSpan = e.dates
			.map((s) => s.trim())
			.filter((s) => s.length >= 2)
			.find((s) => quoteGrounds(s, source));
		// Time alone is not coverage: the dimension is known only with a
		// date AND a place or proof anchor (money, document, reference).
		const placeOrProof = [
			...e.places,
			...e.money,
			...e.domain.filter((d) => d.type === 'document' || d.type === 'reference').map((d) => d.value)
		]
			.map((s) => s.trim())
			.filter((s) => s.length >= 2 && quoteGrounds(s, source));
		if (dateSpan && placeOrProof.length > 0) claim('when_where_proof', dateSpan);
		// Document or reference stated by the user covers docs_deadline: a
		// stated notice, letter, agreement, receipt, or reference number must
		// never be re-asked existentially. Generic gazetteer spans only.
		const docSpan = e.domain
			.filter((d) => d.type === 'document' || d.type === 'reference')
			.map((d) => d.value.trim())
			.filter((v) => v.length >= 3)
			.find((v) => quoteGrounds(v, source));
		if (docSpan) claim('docs_deadline', docSpan);
	} catch {
		/* nothing deterministic: the model state stands */
	}
	return known;
}

/**
 * Extract the case state. `run` is injectable for tests; the default calls
 * the local model. Fails OPEN to an all-missing state (ask everything),
 * which is exactly the pre-fact-first behavior — except the deterministic
 * backstop still applies, so stated names/dates are never re-asked.
 */
export async function extractCaseState(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	opts: { signal?: AbortSignal; trace?: Trace } = {},
	run: (prompt: string) => Promise<unknown> = async (prompt) => {
		await initAgent();
		const res = await completeJson<Record<string, unknown>>(
			prompt,
			{ predict: 220, temp: 0.2, signal: opts.signal, model: 'extract' },
			(p) =>
				p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : null,
			opts.trace
		);
		return res.ok ? res.value : null;
	}
): Promise<CaseState> {
	const key = `${issue}||${history.map((h) => `${h.q}${h.a}`).join('|')}`.slice(0, 2000);
	const hit = stateCache.get(key);
	if (hit) return hit;
	let state: CaseState | null;
	try {
		state = parseCaseState(
			await run(buildExtractPrompt(issue, history, lang)),
			evidenceSource(issue, history)
		);
	} catch {
		state = null;
	}
	// Fail open: extractor trouble must never suppress a needed question —
	// but user-stated facts must never be re-asked either. The deterministic
	// backstop merges first, so NER-visible names/dates survive a model miss.
	const backstop = deterministicKnown(issue, history, lang);
	const base: CaseState = state ?? { known: [], missing: [...DIMENSIONS] };
	for (const k of backstop) {
		if (!base.known.some((x) => x.dimension === k.dimension)) base.known.push(k);
	}
	state = {
		known: base.known,
		missing: DIMENSIONS.filter((d) => !base.known.some((x) => x.dimension === d))
	};
	boundedSet(stateCache, key, state, 100);
	if (opts.trace)
		event(
			opts.trace,
			'interview:state',
			`known=${state.known.length} missing=${state.missing.length} recap=${summarizeCaseState(state, history).slice(0, 120)}`
		);
	return state;
}
