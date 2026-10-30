/** Language helpers + FTS query builders for hybrid retrieval. */
import { franc } from 'franc';
import { FTS_STOPWORDS, FTS_SYNONYMS } from './fts-data.ts';
import { boundedSet } from './context.ts';
import { completeText, initAgent } from './llm.ts';
import { normalizeForMt, peelHeaderLine, splitForMt, translateSegments } from './translation.ts';
import type { Trace } from './observability.ts';
import { event } from './observability.ts';
import type { ResponseLang, LangPref } from './types.ts';

/** Naive English stemmer for FTS prefixes: dismissed/dismissal share `dismiss:*`. */
export function stemForFts(word: string): string {
	for (const suffix of ['ing', 'ed', 'es', 's']) {
		if (word.length - suffix.length >= 4 && word.endsWith(suffix)) {
			return word.slice(0, -suffix.length);
		}
	}
	return word;
}

function rawTokens(query: string): string[] {
	return query
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter(Boolean);
}

/**
 * OR query of prefix-matched content words. OR (not AND) on purpose: with no
 * hand-maintained stopword list, requiring every raw token would let any
 * pronoun or inflection kill the FTS leg. Ranking (RRF fusion with the vector
 * leg) handles precision; this leg is for recall.
 */
export function plainOrQuery(query: string): string | null {
	const words = rawTokens(query).filter((w) => w.length > 2 && !FTS_STOPWORDS.has(w));
	const unique = [...new Set(words.map(stemForFts))].filter(Boolean);
	if (unique.length === 0) return null;
	return unique.map((t) => `${t}:*`).join(' | ');
}

/**
 * OR query of English equivalents for Swahili/Sheng terms, or null when the
 * generated expansion index has no hit. The table is machine-generated
 * (`pnpm expansions:build`), never hand-curated.
 */
export function ftsOrQuery(query: string): string | null {
	const lowered = query.toLowerCase();
	const words = rawTokens(query);
	const terms: string[] = [];
	for (const [sw, en] of FTS_SYNONYMS) {
		const hit =
			` ${lowered} `.includes(` ${sw} `) || (sw.length >= 4 && words.some((w) => w.includes(sw)));
		if (hit) terms.push(...en.split(' '));
	}
	const unique = [...new Set(terms)].filter(Boolean);
	return unique.length > 0 ? unique.map((t) => `${t}:*`).join(' | ') : null;
}

/**
 * True when the expansion query contributes terms beyond the raw query
 * tokens. Drives FTS fusion weight off data, not off a hand flag.
 */
export function orQueryAddsTerms(query: string, orQuery: string | null): boolean {
	if (!orQuery) return false;
	const raw = new Set(rawTokens(query).map(stemForFts));
	const expanded = orQuery
		.split(' | ')
		.map((t) => t.replace(/:\*$/, ''))
		.filter(Boolean);
	return expanded.some((t) => !raw.has(t));
}

const expansionCache = new Map<string, string | null>();

/**
 * Model-driven query expansion for unseen vocabulary (new Sheng, novel
 * phrasing). Cached per process; falls back to the generated table, then
 * null (vector leg still retrieves). This is what scales to "anything" —
 * no table update needed for words the model already understands.
 */
export async function expandQueryTerms(query: string, trace?: Trace): Promise<string | null> {
	const key = query.toLowerCase().trim().slice(0, 500);
	if (expansionCache.has(key)) return expansionCache.get(key) ?? null;
	try {
		await initAgent();
		const raw = await completeText(
			`List English legal search keywords equivalent to this user query (it may be English, Kiswahili, or Sheng). Reply with only comma-separated single words, most important first, max 8 words.\n\nQuery: ${key.slice(0, 300)}`,
			{ predict: 48, temp: 0.2, model: 'expansion' },
			trace
		);
		const terms = [
			...new Set((raw.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 2))
		].slice(0, 8);
		const out = terms.length > 0 ? terms.map((t) => `${stemForFts(t)}:*`).join(' | ') : null;
		boundedSet(expansionCache, key, out, 200);
		return out;
	} catch {
		const fallback = ftsOrQuery(query);
		boundedSet(expansionCache, key, fallback, 200);
		return fallback;
	}
}

/** The response language IS the toggle. No detection, no model call. */
export async function resolveResponseLang(pref: LangPref | undefined): Promise<ResponseLang> {
	return pref === 'sw' ? 'sw' : 'en';
}

/**
 * Degeneration gate for Swahili output. franc only checks the language
 * family — Bantu-looking word salad ("matopeo ... matopeo") passes it. A
 * healthy passage never repeats one content word this densely; a stuck
 * model does. Exported for unit testing.
 */
export function isWordSalad(text: string): boolean {
	// Whole-sentence loops ("Kuna kuonyesha ... . Kuna kuonyesha ... ."):
	// a healthy passage never repeats a 4+ word sentence.
	const sentences = text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.split(/\s+/).length >= 4);
	const seen = new Set<string>();
	for (const s of sentences) {
		if (seen.has(s)) return true;
		seen.add(s);
	}
	// Single-token loops ("matopeo ... matopeo").
	const tokens = text
		.toLowerCase()
		.split(/[^a-z]+/)
		.filter((w) => w.length > 3);
	if (tokens.length < 30) return false;
	const freq = new Map<string, number>();
	for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
	const top = Math.max(...freq.values());
	return top >= 8 && top / tokens.length >= 0.06;
}

/**
 * Translate finished text to Kiswahili sanifu. One narrow task: the caller
 * drafts in English (every gate is tuned for it) and translates at the end.
 * Shape-preserving: [n] markers, names, amounts, dates, filenames, and
 * legal titles must survive verbatim (placeholders and currency amounts are
 * masked out before translation and restored after). A dedicated EN→SW MT
 * engine does the work; the LLM path is only a fallback. Returns null when
 * translation fails verification — callers keep the English original rather
 * than leak garbage. Never throws.
 */
export async function translateTextToSwahili(
	text: string,
	opts: { signal?: AbortSignal; trace?: Trace } = {}
): Promise<string | null> {
	const src = text.trim();
	if (!src) return null;
	// Bracketed placeholders ([Recipient name], [ firmar ... ]) are counsel's
	// blanks, not prose: swap them for inert tokens so the model cannot
	// "translate" them ([Mwana mengine]), then restore verbatim afterwards.
	// Currency amounts get the same treatment: the MT model drifts digits
	// ("Ksh50,000" → "Ksh 150,000"), which is unacceptable in legal text.
	const placeholders: string[] = [];
	const maskOne = (m: string): string => {
		placeholders.push(m);
		return `__PH${placeholders.length}__`;
	};
	const masked = src
		.replace(/[[^\d[\]]]*[a-zA-Z][^[\]]*\]/g, maskOne)
		.replace(/\bKsh\s?\d[\d,]*(?:\.\d+)?/gi, maskOne);
	const unmask = (t: string): string =>
		t.replace(/__PH(\d+)__/g, (_, n) => placeholders[Number(n) - 1] ?? `__PH${n}__`);
	const accept = (t: string): boolean => !!t && outputMatchesLang(t, 'sw') && !isWordSalad(t);
	// Dedicated MT engine first (purpose-built EN→SW, no invented words).
	// Swahili scaffolding from mapLetterHeaders is already final Swahili:
	// peel it off per line so it never re-enters the model (the model would
	// "re-translate" Kuhusu:/Mpendwa into garbage). Placeholders likewise
	// never enter the model. Falls through to the LLM path when the export
	// was never created.
	const translateProse = async (prose: string): Promise<string | null> => {
		const spans = prose.split(/(__PH\d+__)/g).filter((s) => s.length > 0);
		const translated: string[] = [];
		for (const span of spans) {
			if (/^__PH\d+__$/.test(span)) {
				translated.push(span);
				continue;
			}
			// MT drops edge whitespace; reattach it so paragraph breaks
			// survive verbatim.
			const leading = span.match(/^\s+/)?.[0] ?? '';
			const trailing = span.match(/\s+$/)?.[0] ?? '';
			const chunks = splitForMt(normalizeForMt(span));
			if (chunks.length === 0) continue;
			const segs = await translateSegments(chunks, opts);
			if (!segs) return null;
			translated.push(leading + segs.join(' ').trim() + trailing);
		}
		return translated.join('');
	};
	try {
		const lines = masked.split('\n');
		const outLines: string[] = [];
		for (const line of lines) {
			const peeled = peelHeaderLine(line);
			if (!peeled) {
				const t = await translateProse(line);
				if (t === null) throw new Error('mt-missing');
				outLines.push(t);
				continue;
			}
			if (!peeled.rest.trim()) {
				outLines.push(peeled.swHead);
				continue;
			}
			const t = await translateProse(peeled.rest);
			if (t === null) throw new Error('mt-missing');
			outLines.push(`${peeled.swHead} ${t.trim()}`);
		}
		const mt = unmask(outLines.join('\n')).trim();
		if (accept(mt)) return mt;
		if (opts.trace) event(opts.trace, 'lang:translate-rejected', 'mt-engine');
	} catch {
		/* fall through to the LLM path */
	}
	try {
		await initAgent();
	} catch {
		return null;
	}
	const prompt = `Translate the following legal text to Kiswahili sanifu, sentence by sentence. Keep the meaning exact and the tone direct, as counsel to counsel. Keep every [n] citation marker exactly where it is. Keep anything in [square brackets] exactly unchanged. Keep names, amounts, dates, filenames, and legal titles unchanged. If a word has no good Kiswahili equivalent, keep the English word rather than inventing one. Return ONLY the translation, no explanations.\n\n${masked.slice(0, 3000)}`;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const raw = (
				await completeText(
					prompt,
					{
						predict: 1024,
						temp: 0.2,
						repeat_penalty: 1.25,
						frequency_penalty: 0.4,
						signal: opts.signal,
						model: 'translate'
					},
					opts.trace
				)
			).trim();
			const out = unmask(raw).trim();
			if (accept(out)) return out;
			if (opts.trace) event(opts.trace, 'lang:translate-rejected', `attempt=${attempt}`);
		} catch {
			/* retry once, then fall through to null */
		}
	}
	return null;
}

/** Swahili markers for short-text language checks (interview questions are 5-10 words). */
const SW_MARKERS = [
	'mwenzako',
	'ulisema',
	'iltokea',
	'lini',
	'wapi',
	'nani',
	'gani',
	'ngapi',
	'jambo',
	'hili',
	'nyaraka',
	'taja',
	'toa',
	'orodhesha',
	'hatua',
	'mkataba',
	'risiti',
	'ujumbe',
	'tarehe',
	'mahali',
	'ushahidi',
	'kilichotokea',
	'unao',
	'ulio',
	'hadi',
	'sasa',
	'yako',
	'ni',
	'katika',
	'kwa'
];

/** Rejects model output in the wrong language. Only very short texts (<5 words) are exempt. */
export function outputMatchesLang(text: string, lang: ResponseLang): boolean {
	if (!text.trim()) return false;
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length < 5) return true;
	const lower = text.toLowerCase();
	const hasSwMarker = SW_MARKERS.some((m) => new RegExp('\\b' + m + '\\b', 'i').test(lower));
	const code = franc(text);
	if (code === 'und') return lang === 'sw' ? hasSwMarker : !hasSwMarker;
	if (lang === 'sw') {
		// Marker-first: franc misfires on short code-mixed Kiswahili.
		if (hasSwMarker) return true;
		return code !== 'eng' && code !== 'sco';
	}
	if (hasSwMarker) return false;
	return code !== 'swh';
}
