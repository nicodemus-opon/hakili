/**
 * Deterministic interview policy: question hygiene for model-drafted
 * questions. There is NO generic fallback: when the model cannot draft a
 * grounded, single-concept, statute-specific question for a dimension, that
 * dimension is simply not asked — never a who/what/when/where form.
 *
 * Deliberately NO hand-maintained knowledge here: no topic slots, no keyword
 * lists, no regex pattern tables, no money/loan vocabularies. Judgments that
 * need meaning (is this vague? does it invent entities?) are grounded in the
 * user's own issue/history/law text via token overlap, or left to the model
 * judge in `loop.ts`. What remains is structural: length, interrogative
 * counting, type shape.
 */
import { FTS_STOPWORDS } from '../fts-data.ts';
import { extractLiteEntities } from './entities-lite.ts';
import type { HistoryTurn } from '../types.ts';

/** Content tokens minus corpus-derived stopwords, for grounding checks. */
export function contentTokens(s: string): Set<string> {
	return new Set(
		(s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 2 && !FTS_STOPWORDS.has(w))
	);
}

/**
 * Presupposition gate (documents): a question that treats a named document
 * (or dated event) as already existing — "What did the X say?", "When was
 * the X signed?" — is only legitimate when X comes from the USER's own
 * story. When every content token of X is absent from issue/history and at
 * least one comes from retrieved law, the draft smuggles a law-line noun
 * into the user's facts (live repro: "What did the Logbook Loan Clearance
 * Letter say?" on a car issue that never mentioned any loan or letter).
 * Law lines may suggest question *shapes*; existence must be asked
 * existentially first ("Was there...? / Were you given...?"). Only
 * multi-word names trigger this — single nouns ("the seller", "the
 * notice") are usually legitimate paraphrases, and the user-token check
 * exempts anything the user already mentioned.
 */
const PRESUPPOSE_FRAMES = [
	/\b(?:the|your)\s+([A-Za-z][\w-]*(?:\s+[A-Za-z][\w-]*)*?)\s+(say|said|says|stated|states|signed|sign|issued|issue|wrote|written|contains|contained|shows|showed|indicates)\b/i,
	/\bwhen\s+was\s+(?:the|your)\s+([A-Za-z][\w-]*(?:\s+[A-Za-z][\w-]*)*?)\s+(signed|issued|sent|given|made|registered|transferred|executed)\b/i
];

export function presupposesUnknownDocument(
	text: string,
	issue = '',
	history: HistoryTurn[] = [],
	lawContext = ''
): boolean {
	const known = contentTokens(
		`${issue ?? ''} ${history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`).join(' ')}`
	);
	const law = lawContext ? contentTokens(lawContext) : new Set<string>();
	for (const re of PRESUPPOSE_FRAMES) {
		const m = text.match(re);
		if (!m?.[1]) continue;
		const toks = (m[1].toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
			(t) => t.length > 2 && !FTS_STOPWORDS.has(t)
		);
		// Two content tokens minimum: single nouns ("the seller", "the
		// notice") are usually legitimate paraphrases, while multi-word
		// names ("the Logbook Loan Clearance Letter", "the sale agreement")
		// name a specific thing the user never mentioned.
		if (toks.length < 2) continue;
		const inUser = toks.some((t) => known.has(t));
		const inLaw = toks.some((t) => law.has(t));
		if (!inUser && inLaw) return true;
	}
	return false;
}

/**
 * Open-domain grounding: the question must share at least one content token
 * with the issue/history, or with retrieved law context. This is what rejects
 * invented entities (e.g. a loan question on a car-transfer issue) without
 * any per-domain vocabulary. Interrogatives never ground: "What steps...?"
 * must not pass via the "what" in an earlier question — only real nouns
 * (notice, contract, beacon, payment) count.
 *
 * Matching is deliberately asymmetric: user/history overlap is EXACT, so a
 * speculative question cannot ground via a morphological cousin
 * ("employment" must not ground a contract the user never mentioned),
 * while law overlap is prefix-tolerant (see isGroundedInLaw), because
 * statutes state the same concept in formal inflections ("hearing" for the
 * user's "heard", "dismissal" for "dismissed").
 */
export function isGroundedInIssue(
	text: string,
	issue: string,
	history: HistoryTurn[] = [],
	lawContext = ''
): boolean {
	const q = questionTokens(text);
	if (q.size === 0) return false;
	const ctx = contentTokens(
		`${issue ?? ''} ${history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`).join(' ')}`
	);
	for (const t of q) if (ctx.has(t)) return true;
	if (lawContext) {
		const law = contentTokens(lawContext);
		if (sharesTokenWith(q, law)) return true;
	}
	// Entity arm (additive): a shared named entity grounds even when raw
	// tokens diverge ("Safaricom" vs "safaricom", "KES 50,000" vs "50000").
	if (
		sharesLiteEntity(
			text,
			`${issue ?? ''} ${history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`).join(' ')} ${lawContext ?? ''}`
		)
	)
		return true;
	return false;
}

/**
 * Token overlap with morphological tolerance: two tokens match on exact
 * equality or a shared prefix of 4+ letters, so "heard" matches "hearing",
 * "dismissed" matches "dismissal", and "notices" matches "notice" — without
 * any stemmer or word list.
 */
function sharesTokenWith(a: Set<string>, b: Set<string>): boolean {
	const commonPrefix = (x: string, y: string): number => {
		let n = 0;
		while (n < x.length && n < y.length && x[n] === y[n]) n++;
		return n;
	};
	for (const t of a) {
		for (const l of b) {
			if (t === l || (t.length >= 4 && l.length >= 4 && commonPrefix(t, l) >= 4)) return true;
		}
	}
	return false;
}

/**
 * Shared named entity between question and context: a lite-extracted
 * person/org/place/date/money/domain span from the question that already
 * appears in the issue/history/law text. Tolerates case and inflection the
 * way `quoteGrounds` does (exact substring, else shared 4+ char token stem).
 * Advisory only — callers keep their token-overlap check as the fallback.
 */
function sharesLiteEntity(question: string, context: string): boolean {
	try {
		const norm = (s: string): string =>
			s
				.toLowerCase()
				.replace(/[^a-z0-9À-ÿ]+/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		const q = extractLiteEntities(question, 'en');
		const qEnts = [
			...q.persons,
			...q.orgs,
			...q.places,
			...q.money,
			...q.dates,
			...q.domain.map((d) => d.value)
		]
			.map(norm)
			.filter((e) => e.length >= 3);
		if (qEnts.length === 0) return false;
		const ctxNorm = norm(context);
		const c = extractLiteEntities(context, 'en');
		const cToks = new Set(
			[
				...c.persons,
				...c.orgs,
				...c.places,
				...c.money,
				...c.dates,
				...c.domain.map((d) => d.value)
			]
				.flatMap((e) => norm(e).split(' '))
				.filter(Boolean)
		);
		for (const e of qEnts) {
			if (ctxNorm.includes(e)) return true;
			const toks = e.split(' ').filter((t) => t.length >= 4);
			if (
				toks.length > 0 &&
				toks.some((t) =>
					[...cToks].some((s) => {
						const n = Math.min(t.length, s.length);
						let shared = 0;
						while (shared < n && t[shared] === s[shared]) shared++;
						return shared >= 4;
					})
				)
			)
				return true;
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Possessive pronouns carry no fact: "your employer" vs "my employer" is
 * the same entity, and "your land" vs "my land" is the same place. Stripped
 * in re-ask/echo checks so grammatical address never counts as new or
 * missing content. Closed grammatical class, both languages — no domain
 * vocabulary.
 */
export const POSSESSIVES = new Set([
	'my',
	'mine',
	'your',
	'yours',
	'his',
	'her',
	'hers',
	'its',
	'our',
	'ours',
	'their',
	'theirs',
	'yangu',
	'yako',
	'yake',
	'yetu',
	'yenu',
	'yao'
]);

/** Question content tokens minus interrogatives (which never ground). */
export function questionTokens(text: string): Set<string> {
	const interrogatives = new Set(
		WH_WORDS.filter((w) => !w.includes(' ')).map((w) => w.toLowerCase())
	);
	return new Set([...contentTokens(text)].filter((t) => !interrogatives.has(t)));
}

/**
 * Law grounding: the question reuses vocabulary from the retrieved statute
 * passages (procedure, document, office, deadline, payment). This is what
 * rejects template scaffolding that merely borrows a user noun —
 * "What steps have you taken to address the encroachment?" shares nothing
 * with boundary law (title deeds, beacons, survey, registrar), while
 * "Did you report the wall to the land registrar?" shares "registrar".
 * False when no law was retrieved (fail-open: user grounding applies).
 */
export function isGroundedInLaw(text: string, lawContext = ''): boolean {
	if (!lawContext.trim()) return false;
	return sharesTokenWith(questionTokens(text), contentTokens(lawContext));
}

/**
 * Specificity score: how many distinct question tokens are shared with the
 * user's story plus the retrieved law (prefix-tolerant, like grounding).
 * Capped per side (3+3) so longer questions don't win by verbosity. Used
 * to pick the survivor when retries produce rival drafts for one dimension
 * — rank, never a pass/fail gate, so it cannot suppress anything on its
 * own. No vocabulary: pure token overlap with this case's own texts.
 */
export function specificityScore(
	text: string,
	issue = '',
	history: HistoryTurn[] = [],
	lawContext = ''
): number {
	const q = questionTokens(String(text ?? ''));
	if (q.size === 0) return 0;
	const user = contentTokens(
		`${issue ?? ''} ${history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`).join(' ')}`
	);
	const law = lawContext.trim() ? contentTokens(lawContext) : new Set<string>();
	let u = 0;
	let l = 0;
	for (const t of q) {
		if (user.has(t)) u++;
		if (law.size > 0 && sharesTokenWith(new Set([t]), law)) l++;
	}
	return Math.min(u, 3) + Math.min(l, 3);
}

/**
 * Dangling definite descriptions: "the X" must refer to something already
 * on the table. Every definite description (the + up to
 * eight following words, covering "of"-complements like "the name of your
 * neighbor") must resolve: exactly against the user's own words
 * (issue/history - a paraphrase is not a reference), or by prefix-tolerance
 * against retrieved law (formal inflections: dismissal/hearing). Three
 * carve-outs, all grammatical, none lexical:
 * - a relative clause defines its head ("the person who sold you the car");
 * - time expressions never introduce entities ("the date", "by the deadline",
 *   via WHEN_WORDS);
 * - possessives ("your neighbor") are the hearer's own and always pass;
 *   demonstratives ("this", "that", "these", "those") are left alone:
 *   "this happen" is a verb, not a description, and telling verbs from
 *   nouns needs no list we are willing to keep — generic grounding already
 *   rejects demonstrative scaffolding whose nouns are unmentioned.
 * This is what kills "the other party" scaffolding while passing
 * "the land registrar" (law), "the notice" (issue), and
 * "the name of your neighbor" (of-complement).
 */
export function hasDanglingDefinite(
	text: string,
	issue = '',
	history: HistoryTurn[] = [],
	lawContext = ''
): boolean {
	const userCtx = contentTokens(
		`${issue ?? ''} ${history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`).join(' ')}`
	);
	const lawCtx = contentTokens(lawContext ?? '');
	const re = /\bthe\s+([A-Za-zÀ-ÿ][\w-]*(?:\s+[A-Za-zÀ-ÿ][\w-]*){0,7})/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(String(text ?? ''))) !== null) {
		const words = [...contentTokens(m[1] ?? '')];
		if (words.length === 0) continue;
		// Relative clause defines its head ("the person who sold...").
		if (words.some((w) => w === 'who' || w === 'which')) continue;
		// Time expressions never introduce entities ("the date", "the deadline").
		if (words.some((w) => WHEN_WORDS.includes(w))) continue;
		const resolved = words.some(
			(w) => userCtx.has(w) || (lawCtx.size > 0 && sharesTokenWith(new Set([w]), lawCtx))
		);
		if (!resolved) return true;
	}
	return false;
}

/**
 * A question is generic when it carries no case-specific anchor: too short,
 * vague in intent (outcome/wish, story re-ask, scaffold phrasing — even when
 * it borrows a user noun like "employer"), or (when context is available)
 * sharing nothing with the issue/history/law. The law-hook rule
 * (isGroundedInLaw) kills the rest by requiring statute vocabulary for
 * non-party dimensions.
 */
export function isGenericQuestion(
	text: string,
	issue = '',
	history: HistoryTurn[] = [],
	lawContext = ''
): boolean {
	const t = String(text ?? '').trim();
	if (!t) return true;
	if (t.split(/\s+/).length <= 3) return true;
	const hasContext =
		(issue ?? '').trim() !== '' || history.length > 0 || (lawContext ?? '').trim() !== '';
	if (!hasContext) return false;
	if (hasVagueIntent(t)) return true;
	return !isGroundedInIssue(t, issue, history, lawContext);
}

/** Last answer is too thin to act on (empty, one word, no specifics). */
export function isVagueAnswer(a: string | undefined): boolean {
	const t = String(a ?? '').trim();
	if (!t) return true;
	if (t.length < 8) return true;
	if (t.split(/\s+/).length < 3) return true;
	return false;
}

/**
 * Anchor check (structural, no domain vocabulary): the question names a
 * concrete detail — a number/date, a quoted span, or a mid-sentence
 * capitalised token (proper noun/office). Additive signal only.
 */
export function isAnchored(text: string): boolean {
	const t = String(text ?? '').trim();
	if (!t) return false;
	if (/\d/.test(t)) return true;
	if (/["“”']\S+["“”']/.test(t)) return true;
	// NER/date arm (additive): a detected person, office, reference number,
	// or date mention anchors the question even without digits or quotes.
	try {
		const e = extractLiteEntities(t, 'en');
		if (
			e.persons.length > 0 ||
			e.orgs.length > 0 ||
			e.places.length > 0 ||
			e.dates.length > 0 ||
			e.money.length > 0 ||
			e.domain.length > 0
		)
			return true;
	} catch {
		/* fail open to the caps heuristic below */
	}
	const words = t.split(/\s+/);
	for (let i = 1; i < words.length; i++) {
		const w = (words[i] ?? '').replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '');
		if (w.length >= 3 && /^[A-ZÀ-Þ]/.test(w) && /[a-zà-ÿ]/.test(w)) return true;
	}
	return false;
}

function tokenSet(s: string): Set<string> {
	return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function jaccard(a: string, b: string): number {
	const wa = tokenSet(a);
	const wb = tokenSet(b);
	const inter = [...wa].filter((w) => wb.has(w)).length;
	const union = new Set([...wa, ...wb]).size;
	return union ? inter / union : 0;
}

/**
 * User-echo check: every content token of the question (minus interrogatives
 * and auxiliaries) already appears in the user's own words (prefix-tolerant,
 * like anchors). Such a question cannot invent anything by construction, so
 * the model judge — which false-negatives on valid drafts (live repros: "Who
 * is the landlord?", "When did the slip happen?", both user-faithful yet
 * judged ungrounded) — is redundant for it. Law-heavy drafts still go to
 * the judge. All other gates still apply either way.
 */
export function isUserEcho(text: string, issue = '', history: HistoryTurn[] = []): boolean {
	const interrogatives = new Set([
		...WH_WORDS.filter((w) => !w.includes(' ')).map((w) => w.toLowerCase()),
		...AUX_STARTS
	]);
	const q = [...contentTokens(text)].filter((t) => !interrogatives.has(t) && !POSSESSIVES.has(t));
	if (q.length === 0) return false;
	const known = [
		...contentTokens(`${issue ?? ''} ${history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`).join(' ')}`)
	];
	return q.every((t) =>
		known.some((s) => {
			if (t === s) return true;
			let shared = 0;
			const n = Math.min(t.length, s.length);
			while (shared < n && t[shared] === s[shared]) shared++;
			return shared >= 4;
		})
	);
}
/**
 * Shared prefix test (>=4 chars), same bar as quoteGrounds: "dismissal"
 * matches "dismissed" but "notice" never matches "not".
 */
function sharesPrefix(a: string, b: string): boolean {
	const n = Math.min(a.length, b.length);
	let shared = 0;
	while (shared < n && a[shared] === b[shared]) shared++;
	return shared >= 4;
}

function sourceContentTokens(issue = '', history: HistoryTurn[] = []): Set<string> {
	// Answers only — never the questions. Question text must not prove
	// coverage, or "When did this happen?" would count as its own evidence.
	return contentTokens(`${issue ?? ''} ${history.map((h) => `${h.a ?? ''}`).join(' ')}`);
}

/** Scaffold padding carries no fact ("in this case", "katika jambo hili"). */
const SCAFFOLD = new Set(['case', 'matter', 'jambo', 'hili']);

function filteredQuestionTokens(text: string): string[] {
	const interrogatives = new Set([
		...WH_WORDS.filter((w) => !w.includes(' ')).map((w) => w.toLowerCase()),
		...AUX_STARTS
	]);
	return [...questionTokens(String(text ?? ''))].filter(
		(t) => !interrogatives.has(t) && !POSSESSIVES.has(t) && !SCAFFOLD.has(t)
	);
}

/**
 * Existential frames ask whether the user holds/received something — never
 * about a new action they took. Narrow syntax, no domain nouns:
 * there-existence ("was there X", "kulikuwa X") and passive receipt
 * ("did you receive X", "were you given X", "do you have X").
 * "Did you send/report/demand X" is an action ask and never matches here;
 * it goes through the subset arm only.
 */
function existentialHead(text: string): string | null {
	const t = String(text ?? '')
		.trim()
		.toLowerCase();
	if (!t) return null;
	// Clause boundary: the asked entity ends where grounding begins
	// ("deadline for your wall" asks about deadline, "agreement when you
	// bought the car" asks about agreement). Split on prepositions and
	// subordinators, keep the first chunk, head noun is its last token.
	const BOUND =
		/\b(from|about|on|for|to|regarding|concerning|when|where|who|which|that|after|before|because|since|kuhusu|kuwa|ambaye|ambao)\b/;
	const there = /^(was there|were there|is there|are there|kulikuwa|kuna)\b/.exec(t);
	if (there) {
		const first = t.slice(there[0].length).split(BOUND)[0]!;
		const toks = [...contentTokens(first)].filter((w) => w !== 'there');
		return toks.length > 0 ? toks[toks.length - 1]! : null;
	}
	const recv =
		/^(did you receive|have you received|did you get|do you have|have you got|were you given|ulipewa|ulipokea|unayo|did you have)\b/.exec(
			t
		) || /^(was|were)\b[\s\S]{0,40}?\bgiven\b/.exec(t);
	if (recv) {
		const rest = t.slice(recv[0].length);
		// Object phrase ends at the first boundary; the head noun is last
		// ("any written notice" -> notice, "a hire purchase agreement" ->
		// agreement). Adjectives in the chunk are ignored via head match.
		const obj = rest.split(BOUND)[0]!;
		const toks = [...contentTokens(obj)];
		return toks.length > 0 ? toks[toks.length - 1]! : null;
	}
	return null;
}

/**
 * Generic answered check for every dimension (not just party): the draft
 * re-asks a fact the issue/answers already state. Deterministic,
 * vocabulary-free, EN+SW: subset entailment (every substantive token
 * already stated, prefix-tolerant) plus existential entailment (receipt /
 * existence ask whose head noun is already stated, adjectives ignored).
 * NER person/org arm covers "Who is <Name>?" naming someone stated.
 */
export function isEntailedBySource(text: string, issue = '', history: HistoryTurn[] = []): boolean {
	const src = String(`${issue ?? ''} ${history.map((h) => `${h.a ?? ''}`).join(' ')}`);
	const srcLower = src.toLowerCase();
	const known = sourceContentTokens(issue, history);
	// NER arm: the question names a person/org already stated — re-ask by
	// construction, tolerant to case.
	try {
		const qEnt = extractLiteEntities(String(text ?? ''), 'en');
		const named = [...qEnt.persons, ...qEnt.orgs].map((n) => n.toLowerCase());
		if (named.length > 0 && named.every((n) => n.length >= 3 && srcLower.includes(n))) return true;
	} catch {
		/* fail open to the token checks below */
	}
	const q = filteredQuestionTokens(text);
	if (q.length === 0) return true;
	// A mid-question who/which/ambaye is a relative pronoun identifying a
	// specific unnamed person — a genuine ask, not a re-ask.
	const lowered = String(text ?? '').toLowerCase();
	if (/^(who|what|which|nani)\b[\s\S]*\b(who|which|ambaye|ambao)\b/.test(lowered)) return false;
	// Subset arm: every substantive token already stated (prefix-tolerant).
	if (q.every((t) => [...known].some((s) => t === s || sharesPrefix(t, s)))) return true;
	// Existential arm: "did you receive X" where X's head noun is stated.
	const head = existentialHead(text);
	if (head && [...known].some((s) => head === s || sharesPrefix(head, s))) return true;
	return false;
}
/** Jaccard similarity over alphanumeric tokens; >0.3 counts as a repeat. */
export function isDuplicateQuestion(text: string, history: HistoryTurn[]): boolean {
	const base = stripQuotePrefix(text).toLowerCase();
	return history.some((h) => jaccard(stripQuotePrefix(h.q).toLowerCase(), base) > 0.3);
}

const WH_WORDS = [
	'what',
	'when',
	'where',
	'who',
	'which',
	'how',
	'why',
	'how much',
	'how many',
	'whose',
	'whom',
	'lini',
	'wapi',
	'nani',
	'gani',
	'ngapi',
	'nini',
	'vipi'
];

/**
 * Auxiliary verb starts that mark a question clause without a WH word
 * ("Were you employed... and did the slip occur..." is two questions).
 * Checked at clause START only — never at the end, where auxiliaries are
 * ordinary verbs ("...than you were").
 */
const AUX_STARTS = [
	'did',
	'do',
	'does',
	'were',
	'was',
	'is',
	'are',
	'can',
	'could',
	'have',
	'has',
	'will',
	'would'
];

/** One fact per question, judged structurally (no domain vocabulary). */
export function isSingleConcept(text: string): boolean {
	const t = String(text ?? '').toLowerCase();
	if (!t.trim()) return false;
	if ((t.match(/\?/g) ?? []).length > 1) return false;
	// Count interrogative clauses, not relative pronouns: split on clause
	// boundaries and check which clauses START with a question word.
	// "What is the name of the person who sold you the car?" asks one thing
	// (the relative "who sold" does not start a clause). "Who was X and what
	// led to Y?" starts two clauses — a double, forbidden.
	const clauses = t
		.split(/\b(?:and|or|na|au)\b|[,;?!—–/]+/)
		.map((c) => c.trim())
		.filter(Boolean);
	const clauseHasInterrogative = (clause: string): string | null => {
		for (const w of WH_WORDS) {
			const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			// Interrogative position: clause starts with it ("who was…",
			// "what led…") or ends with it ("iltokea lini", "tarehe gani").
			// A mid-clause relative ("person who sold") does not count.
			const re = w.includes(' ')
				? new RegExp(`(^${esc}\\b|\\b${esc}[?.!]*$)`)
				: new RegExp(`(^${w}\\b|\\b${w}[?.!]*$)`);
			if (re.test(clause)) return w;
		}
		for (const w of AUX_STARTS) {
			if (new RegExp(`^${w}\\b`).test(clause)) return w;
		}
		return null;
	};
	const hits = clauses.map(clauseHasInterrogative).filter((h): h is string => h !== null);
	// A later clause that merely CONTAINS a question word is a smuggled
	// second question ("...and what is the date and place..."), even when
	// it neither starts nor ends with it. The first clause keeps its
	// relative-pronoun exemption; later clauses do not.
	if (hits.length < 2) {
		const laterWH = clauses
			.slice(1)
			.some((c) =>
				WH_WORDS.some((w) =>
					new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(c)
				)
			);
		if (laterWH) return false;
	}
	// "how much" / "how many" contain "how" — count the phrase only.
	const deduped = hits.filter((w, i) => {
		if (w === 'how' && (hits.includes('how much') || hits.includes('how many'))) {
			const firstPhrase = hits.findIndex((h) => h === 'how much' || h === 'how many');
			return i === firstPhrase;
		}
		return true;
	});
	// Lawyer rule: one interrogative clause per question. No who+what,
	// when+where, or amount+date doubles — split them across turns.
	if (deduped.length >= 2) return false;
	return true;
}

/**
 * Salvage a double-barrelled draft: keep the FIRST interrogative clause
 * ("When was the notice sent and what did it say?" → "When was the notice
 * sent?"). The small model habitually joins with "and"; dropping the whole
 * draft wastes lawyer-like wording (termination notice, steps taken).
 * The kept half is re-validated by the caller (single, grounded, anchored) — never accepted blind.
 */
export function firstClause(text: string): string | null {
	const t = String(text ?? '').trim();
	if (!t) return null;
	const parts = t
		.split(/\b(?:and|or|na|au)\b/i)
		.map((c) => c.trim())
		.filter(Boolean);
	if (parts.length < 2) return null;
	let head = parts[0]!.replace(/[,;:\-–—\s]+$/, '').trim();
	if (!head) return null;
	if (!/[?.!]$/.test(head)) head += '?';
	if (!isSingleConcept(head)) return null;
	return head;
}

const WHEN_WORDS = [
	'when',
	'date',
	'deadline',
	'deadlines',
	'day',
	'month',
	'year',
	'tarehe',
	'lini'
];

/** Question type must match what the text structurally asks. */
export function isTypeConsistent(
	text: string,
	type: string,
	options: unknown = undefined
): boolean {
	const t = String(text ?? '').toLowerCase();
	const asksWhen = WHEN_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(t));
	if (type === 'date' && !asksWhen) return false;
	if ((type === 'single_choice' || type === 'multi_choice') && !Array.isArray(options))
		return false;
	if ((type === 'single_choice' || type === 'multi_choice') && Array.isArray(options)) {
		const n = (options as unknown[]).length;
		if (n < 2 || n > 6) return false;
	}
	return true;
}

/**
 * Substantive evidence test — purely structural, no word lists, works in any
 * language. An evidence slice proves a dimension only if it carries real
 * content: two or more content tokens ("locked me out", "my landlord John
 * Kamau"), a long-enough string to state a fact ("registered the transfer"),
 * a proper name ("John", "Kisumu", "12 May"), or a number with a noun
 * ("KES 50000"). Thin air ("none", "hakuna", "idk", "yes", "no action",
 * "n/a") fails every arm. A thin slice is never evidence; it is never
 * grounds to skip a question the user still needs.
 */
export function isSubstantiveEvidence(evidence: string): boolean {
	const t = String(evidence ?? '').trim();
	if (!t) return false;
	const toks = contentTokens(t);
	if (toks.size >= 2) return true;
	if (t.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 10) return true;
	if (/[A-ZÀ-Þ][a-zà-ÿ]{2,}/.test(t)) return true;
	if (/\d/.test(t) && toks.size >= 1) return true;
	return false;
}

/**
 * Strip a `You said "<issue>" — ` acknowledgement prefix (added by model
 * drafts that quote the user) so repeat detection compares question intent,
 * not the quoted context.
 */
export function stripQuotePrefix(q: string): string {
	return String(q ?? '').replace(/^(You said|Ulisema)\s+"[^"]*"\s+—\s+/u, '');
}

/**
 * Documents flag without keyword matching: the model's own flag is trusted.
 * True only when the model explicitly set needsDocs AND the question is not
 * a repeat of an already-asked one (paraphrase similarity, not word lists).
 * A question the model did not flag never routes to the uploader, whatever
 * it asks about.
 */
export function docsFlagFor(text: string, modelFlag: unknown, history: HistoryTurn[]): boolean {
	if (modelFlag !== true) return false;
	return !history.some((h) => jaccard(h.q, String(text ?? '')) > 0.3);
}

/**
 * Prospective-artifact guard (drafting intent): when the user asks to CREATE
 * a document, that artifact does not exist yet. Any question that treats it
 * as already existing, sent, signed, or answered is invalid by construction
 * — e.g. "draft a letter of authority" -> "Was there a written authority
 * letter issued?" (circular), or "draft a demand letter" -> "Did you receive
 * a response to the demand letter?" (post-draft event).
 *
 * Open-domain: the artifact phrase is derived syntactically from the user's
 * own creation request (the object of draft/write/prepare/make/create) —
 * never from a document vocabulary. Creation verbs are a closed grammatical
 * class, like AUX_STARTS/WH_WORDS above; everything else is the user's words.
 */

/** Creation request: "draft/write/prepare/make/create a X" (EN+SW grammar). */
function createVerbHit(issue: string): RegExpMatchArray | null {
	const t = String(issue ?? '');
	return t.match(
		/\b(draft|write|prepare|make|create|draw(?:\s+up)?|andika|tayarisha)\b\s+(?:a|an|the|me|us|for\s+me|barua\s+ya)?\s*([A-Za-zÀ-ÿ][\w-]*(?:\s+[A-Za-zÀ-ÿ][\w-]*){0,5})/i
	);
}

/**
 * Content tokens of the requested artifact ("letter of authority",
 * "demand letter"), or an empty set when the issue is not a creation
 * request. Strips the creation verb and leading articles only.
 */
export function requestedArtifactTokens(issue: string): Set<string> {
	const m = createVerbHit(issue);
	if (!m?.[2]) return new Set();
	// Cut at purpose clauses: the artifact is what is created, not why
	// ("a demand letter for payment" -> "demand letter").
	const phrase = m[2].split(/\b(for|to|that|kuhusu|ili)\b/i)[0] ?? '';
	return contentTokens(phrase);
}

/** Retrospective lifecycle frames: existence, sending, signing, response. */
const LIFECYCLE_WORDS = new Set([
	'there',
	'exist',
	'issued',
	'issue',
	'sent',
	'send',
	'served',
	'serve',
	'signed',
	'sign',
	'received',
	'receive',
	'given',
	'got',
	'response',
	'responded',
	'reply',
	'replied',
	'say',
	'said',
	'says',
	'stated',
	'contained',
	'dated'
]);

export function presupposesRequestedArtifact(question: string, issue = ''): boolean {
	const artifact = requestedArtifactTokens(issue);
	if (artifact.size === 0) return false;
	const q = questionTokens(String(question ?? ''));
	if (q.size === 0) return false;
	// Head-noun overlap with the requested artifact (prefix-tolerant, like
	// grounding: "authority" matches "authority", "letters" matches "letter").
	const sharesArtifact = [...artifact].some((a) =>
		[...q].some((t) => t === a || (t.length >= 4 && a.length >= 4 && sharedPrefixLen(t, a) >= 4))
	);
	if (!sharesArtifact) return false;
	// Only retrospective asks are invalid: a question that merely names the
	// artifact to clarify what to write ("Who should the authority letter
	// name?") is legitimate drafting intake.
	const lowered = String(question ?? '').toLowerCase();
	const toks = new Set(lowered.match(/[a-z]+/g) ?? []);
	const stem = (w: string) => w.replace(/(ed|ing|s)$/, '');
	if (existentialHead(String(question ?? '')) !== null) return true;
	if ([...LIFECYCLE_WORDS].some((w) => toks.has(w) || toks.has(stem(w)))) return true;
	if (/\bwhen\s+was\b/.test(lowered) || /\bwhat\s+did\b/.test(lowered)) return true;
	return false;
}

function sharedPrefixLen(a: string, b: string): number {
	let n = 0;
	while (n < a.length && n < b.length && a[n] === b[n]) n++;
	return n;
}

/**
 * Vague-intent check: the question asks about an outcome/wish in the
 * abstract without pinning a concrete fact. Used by the eval harness to
 * lock the "What outcome do you want?" failure mode.
 */
export function hasVagueIntent(text: string): boolean {
	const t = String(text ?? '').toLowerCase();
	if (!t.trim()) return true;
	if (
		/\b(outcome|want|wishing|hoping|tell me more|what happened|who else|anyone else|involved|what did you do|what have you done|for example|kwa mfano)\b/.test(
			t
		)
	)
		return true;
	if (/^\s*(if|kama)\b/.test(t)) return true;
	return false;
}

const NAME_SKIP = new Set([
	'i',
	'my',
	'the',
	'a',
	'an',
	'our',
	'this',
	'that',
	'when',
	'where',
	'what',
	'who',
	'how',
	'why'
]);
const MONTH_WORDS = new Set([
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
	'saturday',
	'sunday',
	'today',
	'yesterday'
]);

/**
 * Named-party check: the issue already names the other person/business.
 * Used by the eval harness (`namedParty` kind). Structural: a mid-text
 * capitalised token (proper noun / Ltd) that is not a month/day.
 */
export function issueHasNamedParty(issue: string): boolean {
	const t = String(issue ?? '');
	if (!t.trim()) return false;
	if (/\b(ltd|inc|company|enterprises|limited)\b/i.test(t)) return true;
	// NER arm (additive): a detected person/org/place names the other party
	// even when capitalisation heuristics miss it ("safaricom dismissed me").
	try {
		const lite = extractLiteEntities(t, 'en');
		if (lite.persons.length > 0 || lite.orgs.length > 0 || lite.places.length > 0) return true;
	} catch {
		/* fail open to the heuristic below */
	}
	const words = t.split(/\s+/);
	for (let i = 0; i < words.length; i++) {
		const w = (words[i] ?? '').replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '');
		if (w.length < 3) continue;
		if (!/^[A-ZÀ-Þ]/.test(w) || !/[a-zà-ÿ]/.test(w.slice(1))) continue;
		const lower = w.toLowerCase();
		if (MONTH_WORDS.has(lower)) continue;
		if (i === 0 && NAME_SKIP.has(lower)) continue;
		return true;
	}
	return false;
}
