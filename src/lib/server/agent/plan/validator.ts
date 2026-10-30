/** Plan quality validators: headings, placeholders, thin plans, citations. */
import { PLAN_HEADINGS, PLAN_OPTIONAL, PLAN_REQUIRED } from './headings.ts';
import { contentTokens } from '../interview/policy.ts';
import type { ResponseLang } from '../types.ts';

/** Counts required headings absent from the model output. */
export function countMissingHeadings(
	text: string,
	lang: ResponseLang,
	requiredOverride?: string[]
): number {
	// Optional sections (deadlines, risks) are allowed to be absent — only
	// required headings count as missing.
	const required = requiredOverride ?? PLAN_REQUIRED[lang] ?? PLAN_HEADINGS[lang];
	return required.filter((h) => !text.includes(h)).length;
}

/** Counts sections whose body is only the "unavailable" placeholder. */
export function countPlaceholderSections(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[]
): number {
	const required = headingsOverride ?? PLAN_HEADINGS[lang];
	const unavailable = lang === 'sw' ? 'Hayajulikani.' : 'Not available.';
	let count = 0;
	for (let i = 0; i < required.length; i++) {
		const h = required[i] as string;
		const start = text.indexOf(h);
		if (start === -1) continue;
		const nextIdx = required
			.slice(i + 1)
			.map((n) => text.indexOf(n, start + h.length))
			.filter((n) => n !== -1);
		const end = nextIdx.length > 0 ? Math.min(...nextIdx) : text.length;
		const body = text
			.slice(start + h.length, end)
			.replace(/[#*\-\s]/g, '')
			.replace(/\./g, '')
			.trim()
			.toLowerCase();
		const marker = unavailable.replace(/\./g, '').trim().toLowerCase();
		if (body.length === 0 || body === marker) count++;
	}
	return count;
}

/**
 * Thin-plan check: catches the small-model Swahili failure mode where the
 * output is not a repeat loop but most sections are missing or filled with
 * "Hayajulikani." / "Not available.".
 */
export function isThinPlan(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[],
	requiredOverride?: string[]
): boolean {
	if (!text.trim()) return true;
	const words = text.split(/\s+/).filter(Boolean);
	// Six required sections need substance: ~75 words is ~12 words per
	// section; anything less is a skeleton, not a plan. Two placeholders or
	// two missing required headings already fails; two weak (<8-word)
	// required sections fails. Optional sections never count — a missing or
	// thin deadlines/risks section is restraint, not thinness. Agent-aware:
	// Check/Draft have their own required lists (Document Reviewed, Risky
	// Clauses, ...); counting against the default Ask list marks every Check
	// plan thin (Applicable Rights will always be "missing") and the
	// pipeline degenerates by design.
	const required = requiredOverride ?? PLAN_REQUIRED[lang] ?? PLAN_HEADINGS[lang];
	const all = headingsOverride ?? required;
	// Eight-section counsel memos need more substance than six-section lay
	// plans: scale the word floor with required count (~15 words/section).
	if (words.length < Math.max(75, required.length * 15)) return true;
	if (countMissingHeadings(text, lang, required) >= 2) return true;
	if (countPlaceholderSections(text, lang, required) >= 2) return true;
	const requiredSet = new Set(required);
	if (weakSections(text, lang, all).filter((h) => requiredSet.has(h)).length >= 2) return true;
	return false;
}

/**
 * Prune conditional sections (deadlines, risks) whose bodies carry nothing:
 * under 8 words or "Not available."-only. The model is told to omit them,
 * but this deterministic cut catches what slips through — a missing section
 * beats filler. Required sections are never touched.
 */
export function pruneOptionalSections(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[]
): string {
	const optional = new Set(PLAN_OPTIONAL[lang] ?? []);
	const required = headingsOverride ?? PLAN_HEADINGS[lang] ?? [];
	let out = text;
	for (const h of required) {
		if (!optional.has(h)) continue;
		const start = out.indexOf(h);
		if (start === -1) continue;
		let end = out.length;
		for (const n of required) {
			if (n === h) continue;
			const idx = out.indexOf(n, start + h.length);
			if (idx !== -1 && idx < end) end = idx;
		}
		if (!sectionUsable(out.slice(start + h.length, end), lang)) {
			out = `${out.slice(0, start).replace(/\s+$/, '')}${end < out.length ? `\n\n${out.slice(end).replace(/^\s+/, '')}` : ''}`;
		}
	}
	return out;
}

/** Split a plan into per-heading section bodies. */
export function splitSections(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[]
): Array<{ heading: string; body: string }> {
	const required = headingsOverride ?? PLAN_HEADINGS[lang];
	return required.map((h, i) => {
		const start = text.indexOf(h);
		if (start === -1) return { heading: h, body: '' };
		const rest = required.slice(i + 1);
		let end = text.length;
		for (const n of rest) {
			const idx = text.indexOf(n, start + h.length);
			if (idx !== -1 && idx < end) end = idx;
		}
		return { heading: h, body: text.slice(start + h.length, end).trim() };
	});
}

export function sectionUsable(body: string, lang: ResponseLang): boolean {
	const unavailable = (lang === 'sw' ? 'Hayajulikani.' : 'Not available.')
		.replace(/\./g, '')
		.trim()
		.toLowerCase();
	const words = body.split(/\s+/).filter(Boolean);
	if (words.length < 8) return false;
	const normalized = body
		.replace(/[#*\-\s]/g, '')
		.replace(/\./g, '')
		.trim()
		.toLowerCase();
	if (!normalized || normalized === unavailable) return false;
	return true;
}

/** Headings whose sections need regeneration. Absent optional sections
 * (deadlines, risks) are restraint, not weakness — only present-but-thin
 * optionals are reported, so repair gets a chance before the prune cut. */
export function weakSections(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[]
): string[] {
	const optional = new Set(PLAN_OPTIONAL[lang] ?? []);
	return splitSections(text, lang, headingsOverride)
		.filter((s) => {
			if (!s.body.trim() && optional.has(s.heading)) return false;
			return !sectionUsable(s.body, lang);
		})
		.map((s) => s.heading);
}

/**
 * Citation verifier: keeps `[n]` markers that point at a real passage and
 * drops out-of-range markers (e.g. `[9]` with only 3 passages) so plans never
 * cite sources that were not retrieved. Also strips the literal `[n]`
 * placeholder small models sometimes emit verbatim from the prompt's
 * "(e.g. [n])" instruction instead of a real number — it renders as noise
 * and matches no passage.
 */
export function verifyCitations(text: string, passageCount: number): string {
	const out = text.replace(/\s*\[[nN]\]/g, '');
	if (passageCount <= 0) return out.replace(/\s*\[\d+\]/g, '');
	return out.replace(/\s*\[(\d+)\]/g, (m, n) => {
		const idx = Number(n);
		return idx >= 1 && idx <= passageCount ? m : '';
	});
}

function normalizeSpan(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function sentenceSupportsClaim(
	sentence: string,
	passageContent: string,
	extraContext = ''
): boolean {
	// A citation marker must not invalidate itself: strip [n] before
	// analysis, or the marker's own digit trips the number guard below and
	// every assigned marker strips itself back off.
	sentence = sentence.replace(/\[\d+\]/g, ' ');
	const normSentence = normalizeSpan(sentence);
	const normPassage = normalizeSpan(passageContent);
	if (!normSentence || !normPassage) return false;
	// Direct quote: any 16+ char normalized span from the sentence found verbatim.
	const words = normSentence.split(' ').filter(Boolean);
	for (let len = 6; len >= 4 && words.length >= len; len--) {
		for (let i = 0; i + len <= words.length; i++) {
			const span = words.slice(i, i + len).join(' ');
			if (span.length >= 16 && normPassage.includes(span)) return true;
		}
	}
	// Token overlap: at least 3 shared content tokens. Two is not enough —
	// 'employer must pay ten million' shares employer+must with the Employment
	// Act yet invents an amount, so it must NOT keep a citation.
	// Amount/date guard: a sentence carrying a number, money word, or date word
	// needs that same token in the passage; otherwise strip even with overlap.
	const MONEY_DATE = [
		'ksh',
		'shilling',
		'shillings',
		'million',
		'billion',
		'thousand',
		'hundred',
		'january',
		'february',
		'march',
		'april',
		'may',
		'june',
		'july',
		'august',
		'september',
		'october',
		'november',
		'december',
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'nairobi',
		'mombasa',
		'kisumu'
	];
	const sLower = sentence.toLowerCase();
	const hasNumber =
		/\d/.test(sLower) || MONEY_DATE.some((w) => new RegExp('\\b' + w + '\\b').test(sLower));
	if (hasNumber) {
		// Numbers/dates/places in the passage TITLE or citation (e.g. the
		// year in "Employment Act, 2007") count: the model cites short
		// titles, not full content, so content-only matching strips valid
		// markers whenever a sentence names its source. Invented amounts
		// ("ten million shillings") appear in neither and still strip.
		const pLower = `${passageContent} ${extraContext}`.toLowerCase();
		const numTokens = sLower.match(/\d[\d,]*/g) ?? [];
		for (const n of numTokens) if (!pLower.includes(n)) return false;
		for (const w of MONEY_DATE) {
			if (new RegExp('\\b' + w + '\\b').test(sLower) && !new RegExp('\\b' + w + '\\b').test(pLower))
				return false;
		}
	}
	const sTokens = contentTokens(sentence);
	const pTokens = contentTokens(passageContent);
	let shared = 0;
	for (const t of sTokens) {
		if (pTokens.has(t)) {
			shared++;
			if (shared >= 3) return true;
		}
	}
	return false;
}

/** Sentence-level support check shared by the verifier and repair targeting. */
export function sentenceSupported(sentence: string, passages: Array<{ content: string }>): boolean {
	return passages.some((p) => sentenceSupportsClaim(sentence, p.content, passageExtra(p)));
}

/** Title + citation text, so the number/date guard sees "Employment Act, 2007". */
function passageExtra(p: { content: string }): string {
	const t = (p as { title?: unknown }).title;
	const c = (p as { citation?: unknown }).citation;
	return [typeof t === 'string' ? t : '', typeof c === 'string' ? c : ''].join(' ');
}

export interface QuoteSpanReport {
	cited: number;
	supported: number;
	stripped: number;
}

/**
 * Semantic quote-span verifier (deterministic, no LLM judge). For every
 * `[n]` marker, checks the containing sentence against passage n: keeps the
 * marker only when the sentence shares a quoted span or >=2 content tokens
 * with the cited passage. Unsupported markers are stripped; the sentence
 * itself is kept so no section goes missing.
 */
export function verifyQuoteSpans(
	text: string,
	passages: Array<{ content: string }>,
	report?: QuoteSpanReport
): string {
	if (passages.length === 0) return verifyCitations(text, 0);
	let cited = 0;
	let supported = 0;
	let stripped = 0;
	// Split into [segment, delimiter] pairs so original whitespace (notably
	// the blank lines plans need before ## headings) is preserved verbatim.
	const parts = text.split(/((?<=[.!?])\s+)/);
	const out = parts.map((sentence, i) => {
		if (i % 2 === 1) return sentence;
		if (!sentence.trim()) return sentence;
		const markers = [...sentence.matchAll(/\[(\d+)\]/g)];
		if (markers.length === 0) return sentence;
		let next = sentence;
		for (const m of markers) {
			cited++;
			const idx = Number(m[1]);
			const passage = idx >= 1 && idx <= passages.length ? passages[idx - 1] : undefined;
			if (!passage || !sentenceSupportsClaim(sentence, passage.content, passageExtra(passage))) {
				stripped++;
				next = next.replace(m[0], '');
			} else {
				supported++;
			}
		}
		return next.replace(/ {2,}/g, ' ').replace(/ +([.,;!?])/g, '$1');
	});
	if (report) {
		report.cited = cited;
		report.supported = supported;
		report.stripped = stripped;
	}
	return out.join('');
}

/**
 * Grounding score: fraction of cited sentences with passage support (0-1).
 * 1 when nothing is cited (vacuous), 0 when markers exist but no passages.
 *
 * NOTE: the vacuous-1 rewards omitting citations entirely. Do not use this
 * alone as a plan gate — pair it with `citationCoverage` below, which scores
 * factual sentences whether or not they carry a marker.
 */
export function groundingScore(text: string, passages: Array<{ content: string }>): number {
	const markers = [...text.matchAll(/\[\d+\]/g)];
	if (markers.length === 0) return 1;
	if (passages.length === 0) return 0;
	const report: QuoteSpanReport = { cited: 0, supported: 0, stripped: 0 };
	verifyQuoteSpans(text, passages, report);
	if (report.cited === 0) return 1;
	return report.supported / report.cited;
}

/**
 * Safety footer: memo must keep its Note section with a still-current check.
 */
export function hasSafetyFooter(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[]
): boolean {
	const t = String(text ?? '');
	const headings = headingsOverride ?? PLAN_HEADINGS[lang];
	const disclaimerHeading = headings[headings.length - 1] as string;
	if (!t.includes(disclaimerHeading)) {
		// Legacy footer still counts during migration.
		if (
			!t.includes('## Note') &&
			!t.includes('## Ujumbe') &&
			!t.includes('## Note') &&
			!t.includes('## Ujumbe')
		)
			return false;
	}
	const lower = t.toLowerCase();
	const professional =
		lower.includes('still current') ||
		lower.includes('verify currency') ||
		lower.includes('thibitisha usasa') ||
		lower.includes('za sasa');
	if (professional) return true;
	const advice =
		lang === 'sw'
			? lower.includes('sio ushauri wa kisheria') || lower.includes('not legal advice')
			: lower.includes('not legal advice');
	if (!advice) return false;
	const referral =
		lower.includes('paralegal') ||
		lower.includes('lawyer') ||
		lower.includes('wakili') ||
		lower.includes('msaidizi wa kisheria') ||
		lower.includes('legal aid') ||
		lower.includes('msaada wa kisheria') ||
		lower.includes('0800');
	return referral;
}

/** Split plan body into candidate factual sentences, excluding headings and the disclaimer section. */
export function factualSentences(text: string, lang: ResponseLang): string[] {
	const t = String(text ?? '');
	// Cut at either language's disclaimer heading: coverage callers are
	// language-agnostic and a Swahili plan checked as English must still
	// exclude its Kanusho section (and vice versa).
	const cuts = [PLAN_HEADINGS.en, PLAN_HEADINGS.sw]
		.map((h) => h[h.length - 1] as string)
		.map((marker) => t.indexOf(marker))
		.filter((i) => i !== -1);
	void lang;
	const cut = cuts.length > 0 ? Math.min(...cuts) : -1;
	const body = (cut === -1 ? t : t.slice(0, cut)).replace(/^#{1,4}\s+.*$/gm, ' ');
	return t
		? body
				.split(/(?<=[.!?])\s+/)
				.map((s) => s.trim())
				.filter((s) => s.length >= 15 && /\s/.test(s) && /[a-zA-Z]/.test(s))
		: [];
}

/**
 * Citation coverage: fraction of factual sentences with passage support
 * (0-1), whether or not they carry a `[n]` marker. 1 when there are no
 * factual sentences outside the disclaimer. Unlike `groundingScore`, an
 * uncited factual plan scores low instead of vacuously passing.
 */
export function citationCoverage(text: string, passages: Array<{ content: string }>): number {
	const sentences = [...factualSentences(text, 'en'), ...factualSentences(text, 'sw')];
	const unique = [...new Set(sentences)];
	if (unique.length === 0) return 1;
	if (passages.length === 0) return 0;
	if (unique.length === 0) return 1;
	let supported = 0;
	for (const s of unique) {
		if (sentenceSupported(s, passages)) supported++;
	}
	return supported / unique.length;
}

/**
 * Citation-weak sections: bodies with at least one factual sentence no
 * retrieved passage supports. Unlike `weakSections` (length/placeholder),
 * this catches fluent, substantive sections that state law without citing
 * it — the repair pass then regenerates them with citation pressure.
 * The disclaimer section is exempt (it carries no legal claims by design).
 * Callers may exempt descriptive headings (e.g. Check's Document Reviewed:
 * naming the file is the job, not stating law) and pass a support corpus
 * (user-document chunks) so sentences quoting the user's own document do
 * not count as uncited law. Interrogative sentences never count — a
 * question makes no claim and needs no citation.
 */
export function uncitedSections(
	text: string,
	lang: ResponseLang,
	passages: Array<{ content: string }>,
	headingsOverride?: string[],
	supportCorpus?: Array<{ content: string }>,
	exemptHeadings: string[] = []
): string[] {
	if (passages.length === 0) return [];
	const required = headingsOverride ?? PLAN_HEADINGS[lang];
	const disclaimer = required[required.length - 1] as string;
	const exempt = new Set(exemptHeadings);
	return splitSections(text, lang, headingsOverride)
		.filter((s) => {
			if (s.heading === disclaimer) return false;
			if (exempt.has(s.heading)) return false;
			if (s.body.split(/\s+/).filter(Boolean).length < 8) return false;
			const facts = factualSentences(s.body, lang).filter((f) => !f.trimEnd().endsWith('?'));
			if (facts.length === 0) return false;
			// Wholly-ungrounded sections only: at least one supported
			// sentence (by law or by the user's own document) grounds the
			// section. Flagging on ANY unsupported sentence never converges
			// for Check — paraphrases ("eviction" for the doc's "re-enter")
			// and doc-specific amounts ("Kshs 22,000", absent from the law)
			// always leave one sentence unmatched, so repair loops until the
			// plan degenerates. Per-sentence bad markers are still stripped
			// by verifyQuoteSpans; this gate is for sections with zero
			// grounding, not single-sentence paraphrases.
			return facts.every(
				(f) =>
					!sentenceSupported(f, passages) &&
					!(supportCorpus && supportCorpus.length > 0 && sentenceSupported(f, supportCorpus))
			);
		})
		.map((s) => s.heading);
}

/**
 * Disclaimer de-dupe: the model sometimes writes its own weak Disclaimer
 * ("general information only...") which fails the UPL safety check, so the
 * safety net appends the canonical footer below it — two Disclaimer
 * headings. When no disclaimer section is UPL-safe, remove them all; the
 * safety net then appends exactly one canonical footer. Safe plans pass
 * through untouched.
 */
export function stripUnsafeDisclaimer(
	text: string,
	lang: ResponseLang,
	headingsOverride?: string[]
): string {
	const required = headingsOverride ?? PLAN_HEADINGS[lang];
	const disclaimer = required[required.length - 1] as string;
	if (!text.includes(disclaimer)) return text;
	if (hasSafetyFooter(text, lang)) return text;
	let out = text;
	for (;;) {
		const start = out.indexOf(disclaimer);
		if (start === -1) break;
		let end = out.length;
		for (const h of required) {
			if (h === disclaimer) continue;
			const idx = out.indexOf(h, start + disclaimer.length);
			if (idx !== -1 && idx < end) end = idx;
		}
		out = `${out.slice(0, start)}${out.slice(end)}`.trim();
	}
	return out;
}

/**
 * Pack formatted passages into a char budget without cutting mid-word:
 * truncates at the last sentence boundary (or word boundary) under budget.
 */
export function packPassages(
	passages: Array<{ title: string; citation: string; content: string }>,
	budget: number
): string {
	const full = passages
		.map((p, i) => `[${i + 1}] ${p.title} — ${p.citation}\n${p.content}`)
		.join('\n\n');
	if (full.length <= budget) return full;
	const window = full.slice(0, budget);
	const sentenceEnd = Math.max(
		window.lastIndexOf('. '),
		window.lastIndexOf('! '),
		window.lastIndexOf('? '),
		window.lastIndexOf('\n\n')
	);
	if (sentenceEnd > budget * 0.5) return window.slice(0, sentenceEnd + 1).trimEnd();
	const wordEnd = window.lastIndexOf(' ');
	if (wordEnd > budget * 0.5) return `${window.slice(0, wordEnd).trimEnd()}…`;
	return `${window.trimEnd()}…`;
}

/**
 * Deterministic citation assignment: the small model often emits zero `[n]`
 * markers even when instructed (live repro: PLAN citations=0, coverage
 * 0.70). For every marker-less sentence a retrieved passage supports,
 * append its number — `verifyQuoteSpans` (same predicate) keeps every
 * assigned marker, so this only proposes provably supported claims.
 * Unsupported sentences, headings, and the disclaimer are left alone.
 */
export function assignCitations(
	text: string,
	lang: ResponseLang,
	passages: Array<{ content: string }>,
	headingsOverride?: string[]
): string {
	if (passages.length === 0) return text;
	const required = headingsOverride ?? PLAN_HEADINGS[lang];
	const disclaimer = required[required.length - 1] as string;
	let inDisclaimer = false;
	return text
		.split('\n')
		.map((line) => {
			const t = line.trim();
			const hit = required.find((h) => t.startsWith(h));
			if (hit) {
				inDisclaimer = hit === disclaimer;
				return line;
			}
			if (inDisclaimer || !t) return line;
			const bits = line.split(/((?<=[.!?])\s+)/);
			let changed = false;
			const mapped = bits.map((b, i) => {
				if (i % 2 === 1) return b;
				const s = b.trim();
				if (!s) return b;
				if (/\[\d+\]/.test(b)) return b;
				if (s.length < 15 || !/\s/.test(s) || !/[a-zA-Z]/.test(s)) return b;
				const idx = passages.findIndex((p) => sentenceSupportsClaim(b, p.content, passageExtra(p)));
				if (idx === -1) return b;
				changed = true;
				return `${b.trimEnd()} [${idx + 1}]`;
			});
			return changed ? mapped.join('') : line;
		})
		.join('\n');
}

export interface NumberedPassage {
	/** Original 1-based rank, so `[n]` markers survive isolation. */
	n: number;
	title: string;
	citation: string;
	content: string;
}

/**
 * Pack pre-numbered passages (an isolated subset) into a budget. Numbers
 * are the ORIGINAL ranks, never reindexed — repair output is spliced into
 * a plan whose citations point at the full ranked list.
 */
export function packNumbered(items: NumberedPassage[], budget: number): string {
	const full = items.map((p) => `[${p.n}] ${p.title} — ${p.citation}\n${p.content}`).join('\n\n');
	if (full.length <= budget) return full;
	const window = full.slice(0, budget);
	const sentenceEnd = Math.max(
		window.lastIndexOf('. '),
		window.lastIndexOf('! '),
		window.lastIndexOf('? '),
		window.lastIndexOf('\n\n')
	);
	if (sentenceEnd > budget * 0.5) return window.slice(0, sentenceEnd + 1).trimEnd();
	const wordEnd = window.lastIndexOf(' ');
	if (wordEnd > budget * 0.5) return `${window.slice(0, wordEnd).trimEnd()}…`;
	return `${window.trimEnd()}…`;
}

/**
 * Isolated repair context: rank passages by shared content tokens with the
 * weak-section bodies and keep the top-N, preserving original `[n]`
 * numbers. Repair sees only what it must fix (clash isolation) and every
 * marker it writes still points at the right passage.
 */
export function selectRepairPassages(
	passages: Array<{ title: string; citation: string; content: string }>,
	weakBodies: string[],
	topN = 3
): NumberedPassage[] {
	const hintTokens = contentTokens(weakBodies.join('\n'));
	const scored = passages.map((p, i) => {
		const pt = contentTokens(p.content);
		let shared = 0;
		for (const t of hintTokens) if (pt.has(t)) shared++;
		return { n: i + 1, ...p, shared };
	});
	scored.sort((a, b) => b.shared - a.shared || a.n - b.n);
	return scored
		.slice(0, Math.max(0, topN))
		.sort((a, b) => a.n - b.n)
		.map(({ n, title, citation, content }) => ({ n, title, citation, content }));
}
