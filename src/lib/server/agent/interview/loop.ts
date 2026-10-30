/** Interview agent loop: retrieve (open) -> draft (structured) -> validate. No generic fallback. */
import { completeJson, completeText, initAgent } from '../llm.ts';
import { franc } from 'franc';
import { CONTEXT_BUDGETS, boundedSet, buildRetrievalQuery, formatLawHints } from '../context.ts';
import { outputMatchesLang } from '../language.ts';
import { searchLegal } from '../retrieval.ts';
import {
	docsFlagFor,
	firstClause,
	isAnchored,
	isDuplicateQuestion,
	isEntailedBySource,
	isGenericQuestion,
	hasDanglingDefinite,
	isSingleConcept,
	isTypeConsistent,
	isUserEcho,
	isVagueAnswer,
	presupposesRequestedArtifact,
	presupposesUnknownDocument
} from './policy.ts';
import type { HistoryTurn, Question, ResponseLang } from '../types.ts';
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';

/** Language-agnostic degeneration check: flags outputs stuck in a repeat loop. */
export function isDegenerateText(text: string): boolean {
	const words = text.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length < 5) return false;
	// Sentence-level loop: same sentence 3+ times (e.g. Hayajulikani x5).
	const sentences = text
		.toLowerCase()
		.split(/[.!?]+/)
		.map((x) => x.trim())
		.filter((x) => x.length >= 4);
	if (sentences.length >= 3) {
		const seen = new Map<string, number>();
		for (const sen of sentences) seen.set(sen, (seen.get(sen) ?? 0) + 1);
		for (const c of seen.values()) if (c >= 3) return true;
	}
	// 3-gram repeats catch short loops (pole pole ... x12); 5-grams catch longer ones.
	if (words.length >= 12) {
		const tri = new Map<string, number>();
		for (let i = 0; i + 3 <= words.length; i++) {
			const g = words.slice(i, i + 3).join(' ');
			tri.set(g, (tri.get(g) ?? 0) + 1);
		}
		let triMax = 0;
		for (const c of tri.values()) if (c > triMax) triMax = c;
		if (triMax >= 4) return true;
	}
	const counts = new Map<string, number>();
	for (let i = 0; i + 5 <= words.length; i++) {
		const g = words.slice(i, i + 5).join(' ');
		counts.set(g, (counts.get(g) ?? 0) + 1);
	}
	let max = 0;
	for (const c of counts.values()) if (c > max) max = c;
	if (max >= 3) return true;
	if (words.length >= 80 && new Set(words).size / words.length < 0.25) return true;
	return false;
}

const QUESTION_TYPES = ['text', 'single_choice', 'multi_choice', 'boolean', 'date'] as const;

export interface DraftQuestion {
	text: string;
	type: string;
	options?: unknown;
	required?: unknown;
	help?: unknown;
	needsDocs?: unknown;
}

export function validateDraft(parsed: unknown): DraftQuestion | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const q = parsed as Record<string, unknown>;
	if (typeof q.text !== 'string' || !q.text.trim()) return null;
	return {
		text: q.text,
		type: typeof q.type === 'string' ? q.type : 'text',
		options: q.options,
		required: q.required,
		help: q.help,
		needsDocs: q.needsDocs
	};
}

export function normalizeType(draft: DraftQuestion): Question['type'] {
	if ((QUESTION_TYPES as readonly string[]).includes(draft.type)) {
		return draft.type as Question['type'];
	}
	// Heuristic: yes/no options imply a boolean question.
	if (Array.isArray(draft.options)) {
		const joined = draft.options.map(String).join('|').toLowerCase();
		if (joined.includes('yes') && joined.includes('no')) return 'boolean';
	}
	return 'text';
}

export function toQuestion(draft: DraftQuestion, index: number, history: HistoryTurn[]): Question {
	const helpText = typeof draft.help === 'string' ? draft.help : undefined;
	const options = Array.isArray(draft.options) ? draft.options.map(String).slice(0, 6) : [];
	const text = String(draft.text ?? '').trim();
	return {
		id: `q${index + 1}`,
		text,
		type: normalizeType(draft),
		options,
		required: draft.required !== false,
		help: helpText,
		needsDocs: docsFlagFor(text, draft.needsDocs, history)
	};
}

/**
 * Semantic grounding judge (model-driven, no vocabularies): does the draft
 * question introduce any person, amount, loan, injury, office, document, or
 * event not present in the issue/history/law? Results cached per process.
 * Fails closed (reject -> retry -> universal fallback, which is always safe).
 */
const judgeCache = new Map<string, boolean>();

export async function judgeEntitiesGrounded(
	question: string,
	issue: string,
	history: HistoryTurn[] = [],
	lawContext = '',
	opts: { signal?: AbortSignal; trace?: Trace } = {}
): Promise<boolean> {
	const key = `${question}||${issue}||${history.map((h) => `${h.q}${h.a}`).join('|')}`.slice(
		0,
		2000
	);
	const hit = judgeCache.get(key);
	if (hit !== undefined) return hit;
	// Deterministic bypass: a pure user echo cannot invent anything, so the
	// noisy model judge is redundant for it (and has false-negatived valid
	// drafts live). Law-heavy drafts still go to the model below.
	if (isUserEcho(question, issue, history)) {
		boundedSet(judgeCache, key, true, 100);
		if (opts.trace) event(opts.trace, 'interview:judge-echo', 'echo=true');
		return true;
	}
	// Transformer NER bypass (advisory, fail-open): every named entity in the
	// question already appears in issue/history/law — the same no-invention
	// guarantee as the echo bypass, tolerant to case and inflection. It can
	// only grant grounded=true; any miss or NER outage falls through to the
	// model judge below. Offline-first: returns false fast when models were
	// never fetched (`pnpm ner:fetch`), so unit tests stay offline.
	try {
		const { questionEntitiesKnown } = await import('./ner.ts');
		const lang = franc(`${question} ${issue}`) === 'swh' ? 'sw' : 'en';
		const known = [
			issue,
			...history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`),
			lawContext
		] as string[];
		if (await questionEntitiesKnown(question, known, lang)) {
			boundedSet(judgeCache, key, true, 100);
			if (opts.trace) event(opts.trace, 'interview:judge-echo', 'echo=ner');
			return true;
		}
	} catch {
		/* fall through to the model judge */
	}
	let grounded: boolean;
	try {
		await initAgent();
		const out = await completeText(
			`You check interview questions for a Kenyan legal-preparation assistant. A question is GROUNDED only if every person, amount, loan, injury, office, document, or event it mentions already appears (same meaning counts) in the ISSUE, HISTORY, or LAW below. The generic words "person/people" for someone already mentioned — "someone", a role like "seller", "neighbor", or "employer" — count as grounded, not invented. "Your X" and "my X" are the same thing said by different speakers. Asking "what [document] do you have" about law-line documents is grounded — presupposition counts as invention ONLY for "What did|does the X say" and "When was the X signed|issued" frames about a document found ONLY in the law lines; such existence must be asked existentially first ("Was there...? / Were you given...?"). Examples: ISSUE "my neighbor built a wall on my land" + QUESTION "What is the name of the neighbor?" -> yes (asking an unnamed person's name is not invention). ISSUE "my neighbor built a wall on my land" + QUESTION "Was there a caretaker or agent near the wall?" -> no ("caretaker or agent" appears nowhere).\n\nISSUE: ${issue.slice(0, 500)}\n\nHISTORY:\n${
				history
					.map((h) => `Q: ${h.q}\nA: ${h.a}`)
					.join('\n')
					.slice(0, 800) || '(none)'
			}\n\nLAW:\n${lawContext.slice(0, 800) || '(none)'}\n\nQUESTION: ${question}\n\nReply with only one word: "yes" if grounded, "no" otherwise.`,
			{ predict: 8, temp: 0, signal: opts.signal, model: 'judge' },
			opts.trace
		);
		grounded = /^\s*yes\b/i.test(out);
	} catch {
		grounded = false;
	}
	boundedSet(judgeCache, key, grounded, 100);
	if (opts.trace)
		event(opts.trace, 'interview:judge', `grounded=${grounded} :: ${question.slice(0, 60)}`);
	return grounded;
}

/**
 * Semantic redundancy judge (model-driven, no vocabularies): does the ISSUE
 * or HISTORY already state the fact this question asks for? This is what
 * stops the interview re-asking who/when/where/what-proof facts the user
 * gave in the initial message. Fails OPEN (question kept) so a judge outage
 * can never skip a question the case still needs.
 */
const answeredCache = new Map<string, boolean>();

export async function judgeAlreadyAnswered(
	question: string,
	issue: string,
	history: HistoryTurn[] = [],
	opts: { signal?: AbortSignal; trace?: Trace } = {}
): Promise<boolean> {
	const key = `${question}||${issue}||${history.map((h) => `${h.q}${h.a}`).join('|')}`.slice(
		0,
		2000
	);
	const hit = answeredCache.get(key);
	if (hit !== undefined) return hit;
	let answered: boolean;
	try {
		await initAgent();
		const out = await completeText(
			`You check interview questions for a Kenyan legal-preparation assistant. A question is ALREADY ANSWERED only if the ISSUE or HISTORY below explicitly states the fact it asks for (same meaning counts: a stated date answers "when did this happen", a named person answers "who is the other party"). If the fact is missing, partial, or only implied, it is NOT answered.\n\nISSUE: ${issue.slice(0, 500)}\n\nHISTORY:\n${
				history
					.map((h) => `Q: ${h.q}\nA: ${h.a}`)
					.join('\n')
					.slice(0, 800) || '(none)'
			}\n\nQUESTION: ${question}\n\nReply with only one word: "yes" if already answered, "no" otherwise.`,
			{ predict: 8, temp: 0, signal: opts.signal, model: 'judge' },
			opts.trace
		);
		answered = /^\s*yes\b/i.test(out);
	} catch {
		answered = false;
	}
	boundedSet(answeredCache, key, answered, 100);
	if (opts.trace)
		event(
			opts.trace,
			'interview:judge-answered',
			`answered=${answered} :: ${question.slice(0, 60)}`
		);
	return answered;
}

function buildPrompt(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	lawHints: string,
	lastVague: boolean
): string {
	const goodExample =
		lang === 'sw'
			? 'Mfano mzuri (umbo pekee — jaza <> kwa maneno ya sheria zilizo hapo juu na maneno ya mtumiaji, kamwe usitoe maneno kutoka kesi nyingine): "Ulipewa <hati au utaratibu uliotajwa katika sheria zilizo hapo juu>?" Mfano mbaya: "Mwenzako ni nani na kilichotokea ni nini?" (maswali mawili kwa moja — kataza).'
			: 'Good shape only (fill <> with words from the CURRENT law lines above and the user\'s nouns — never borrow nouns from any other case): "Were you given <a document or procedure named in the CURRENT law lines>?" Bad: "What have you done about this so far?" (fits any case — forbidden).';
	const langDirective =
		lang === 'sw'
			? 'Write text, options, and help entirely in Kiswahili (Kiswahili sanifu), even if the user wrote in English. Keep JSON keys in English.'
			: 'Write text, options, and help entirely in English.';
	const followUpNote = lastVague
		? ' The last answer was vague or very short: ask a targeted follow-up that pins down the SAME missing fact with a concrete example, date, named person/office, or specific document.'
		: '';
	return `You are Hakili, an intake assistant for an advocate of the High Court of Kenya. ${langDirective} Instructions: "${issue}"

So far the user answered:
${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n') || '- (no answers yet)'}
${lawHints ? `\nRelevant Kenyan law (ground the question, do not quote verbatim):\n${lawHints}\n` : ''}
Ask ONE clarifying question that helps prepare this specific case. RULE ZERO: never ask for a fact that is already stated in the issue or the answers above. When the user asks to CREATE a document (draft/write/prepare a letter, demand, agreement), that document does NOT exist yet: never ask whether it exists, was sent, signed, or issued, what it says, or whether the other side responded — ask only for facts needed to WRITE it — if the user already gave the party, a date or time period, a place, an amount, steps taken, documents held, or the outcome they want, that fact is KNOWN and asking for it again, even rephrased, is a failure. Cover the most important STILL-MISSING dimension, in order: (1) the specific other person/business/office, using your word for them (employer, neighbor, seller) — ask for their NAME, never "the other party", (2) time and place plus proof held (agreement, receipt, message, photo, OB/reference number), (3) steps taken so far and outcome wanted, (4) documents to attach and any deadline mentioned — skipping every dimension that is already answered. Reuse the user's own nouns (the key nouns from the CURRENT issue and answers above, whatever story they tell — never borrow nouns from any illustration below) — do NOT invent entities the user never mentioned such as loans, police, or injuries. Never presuppose what the user never stated: prefer "Was there...? / Did you...?" over "When was the X signed?". Get the direction right: counsel acts for the client — steps are things the USER did, demands are things the USER sent. If money/loan/interest is not in the issue, history, or law hints above, do NOT ask about it.${followUpNote} It MUST be answerable from the user's experience and name a concrete detail (a date, place, named person/office, or specific document) like counsel taking instructions for pleadings. Do NOT ask generic questions such as "What outcome do you want?", "Who else is involved?", "Tell me more", "What happened?", "What did you do", or "Which documents do you have" — if the question fits a land case and a dismissal case equally, it is wrong. Ask ONE thing only with ONE question word — never who+what, when+where, or amount+date (split them across turns). Never quote or paraphrase these instructions: every content noun must come from the user's story or the law lines, never from the sentences above. Do NOT repeat or rephrase any previous question. Do NOT return null if fewer than 3 questions have been asked. If 4 or more questions have been asked, return null. Otherwise return a single JSON object with fields: id, text, type (text, single_choice, multi_choice, boolean, date), options (array), required (boolean), help (string), needsDocs (boolean). Use type "text" by default; use "date" ONLY for a pure when-question with no amount; use single_choice/boolean only with 2-6 real options. For yes/no use type "boolean". Do NOT include an "Other" option — the UI already provides a separate free-text field for that. Set needsDocs to true ONLY when the question text explicitly asks the user to list, describe, or attach documents, evidence, receipts, contracts, letters, or photos. If any previous question already asked about documents or evidence, set needsDocs to false. IMPORTANT: text must be one fluent question of at most 25 words naming the concrete detail. ${goodExample} Return ONLY JSON or null.`;
}

export interface NextQuestionOptions {
	topicHint?: string;
	signal?: AbortSignal;
	trace?: Trace;
}

export async function nextQuestion(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang = 'en',
	// Ignored: kept for API compatibility. Topic is display-only; retrieval
	// is open and grounding uses issue/history/law text, never a topic bucket.
	_topicHint?: string,
	opts: NextQuestionOptions = {}
): Promise<Question | null> {
	const trace = opts.trace;
	if (history.length >= 4) return null;
	await initAgent();

	let lawHints = '';
	let lawContext = '';
	try {
		// Open search first: never let a guessed topic starve retrieval.
		// Topic is display-only; grounding uses issue/history/law text.
		// Select: smallest high-signal set — bounded query + fixed budget.
		const queryText = buildRetrievalQuery([issue, ...history.map((h) => `${h.q} ${h.a}`)]);
		const passages = await searchLegal(queryText, 6, undefined, { signal: opts.signal }, trace);
		if (passages.length > 0) {
			lawHints = formatLawHints(
				passages.map((p) => ({ title: p.title, citation: p.citation, content: p.content })),
				CONTEXT_BUDGETS.INTERVIEW_LAW_HINTS
			);
			lawContext = passages.map((p) => `${p.title} ${p.content}`).join('\n');
		}
	} catch {
		lawHints = '';
	}

	const lastVague = history.length > 0 && isVagueAnswer(history[history.length - 1]?.a);
	const prompt = buildPrompt(issue, history, lang, lawHints, lastVague);

	// Agent retry budget: up to 2 model attempts, then deterministic fallback.
	for (let attempt = 0; attempt < 2; attempt++) {
		if (opts.signal?.aborted) throw new Error('Interview step aborted');
		const tighten =
			attempt > 0
				? ' Previous attempt was rejected (vague, duplicate, ungrounded, double-barrelled, wrong language, malformed, or asked for a fact the user already stated). Ask ONE grounded question about a STILL-MISSING fact, reusing the user\u2019s own words. Never begin with "For example"/"Kwa mfano" — ask directly. Return ONLY JSON.'
				: '';
		const result = await completeJson<DraftQuestion>(
			prompt + tighten,
			{
				predict: 256,
				temp: attempt === 0 ? 0.5 : 0.7,
				repeat_penalty: 1.15,
				frequency_penalty: 0.1,
				signal: opts.signal,
				model: 'draft-questions'
			},
			validateDraft,
			trace
		);
		if (!result.ok) {
			if (trace) event(trace, 'interview:retry', `attempt=${attempt} reason=parse-failed`);
			// On the last attempt, try the prose fallback before giving up.
			if (attempt === 1) break;
			continue;
		}
		const draft = result.value;
		const qType = normalizeType(draft);
		// Cheap structural checks first (generic subsumes token grounding);
		// the model judge runs last for semantic invention.
		// Double-barrelled drafts are salvaged to their first clause
		// (same as the batch path) instead of burning the retry budget.
		let text = draft.text;
		let salvaged = false;
		if (!isSingleConcept(text)) {
			const half = firstClause(text);
			if (
				half &&
				!isDegenerateText(half) &&
				!isGenericQuestion(half, issue, history, lawContext) &&
				!presupposesRequestedArtifact(half, issue) &&
				!hasDanglingDefinite(half, issue, history, lawContext) &&
				!isEntailedBySource(half, issue, history) &&
				outputMatchesLang(half, lang) &&
				!isDuplicateQuestion(half, history) &&
				isTypeConsistent(half, qType, draft.options)
			) {
				text = half;
				salvaged = true;
				if (trace) event(trace, 'interview:split', half.slice(0, 60));
			}
		}
		const structurallyOk =
			!isDegenerateText(text) &&
			text.split(/\s+/).length <= 60 &&
			!isGenericQuestion(text, issue, history, lawContext) &&
			!presupposesRequestedArtifact(text, issue) &&
			!presupposesUnknownDocument(text, issue, history, lawContext) &&
			!hasDanglingDefinite(text, issue, history, lawContext) &&
			!isEntailedBySource(text, issue, history) &&
			outputMatchesLang(text, lang) &&
			!isDuplicateQuestion(text, history) &&
			isSingleConcept(text) &&
			isTypeConsistent(text, qType, draft.options);
		if (!structurallyOk) {
			if (trace) event(trace, 'interview:retry', `attempt=${attempt} reason=validation-failed`);
			continue;
		}
		const effectiveDraft = salvaged ? { ...draft, text } : draft;
		// Anchor is advisory only (trace signal): grounded specificity
		// outranks date/name/document cosmetics. Never burn an attempt on it —
		// the car-proof golden (specific, grounded, unanchored) must pass first
		// attempt instead of wasting the 2-attempt budget.
		if (!isAnchored(effectiveDraft.text)) {
			if (trace) event(trace, 'interview:unanchored', 'accepted-grounded-but-unanchored');
		}
		const judged = await judgeEntitiesGrounded(effectiveDraft.text, issue, history, lawContext, {
			signal: opts.signal,
			trace
		});
		if (!judged) {
			if (trace) event(trace, 'interview:retry', `attempt=${attempt} reason=judge-failed`);
			continue;
		}
		// Redundancy check last: a grounded, well-formed question that asks for
		// a fact the issue/history already states is still a failure.
		if (
			await judgeAlreadyAnswered(effectiveDraft.text, issue, history, {
				signal: opts.signal,
				trace
			})
		) {
			if (trace) event(trace, 'interview:retry', `attempt=${attempt} reason=already-answered`);
			continue;
		}
		return toQuestion(effectiveDraft, history.length, history);
	}

	// Prose fallback: a single fluent line becomes a text question.
	try {
		const cleaned = (
			await completeText(
				prompt,
				{ predict: 120, temp: 0.5, signal: opts.signal, model: 'draft-questions' },
				trace
			)
		)
			.replace(/```/g, '')
			.trim();
		const firstLine = cleaned.split('\n')[0]?.trim() ?? '';
		if (
			cleaned &&
			firstLine &&
			cleaned.length < 300 &&
			!cleaned.startsWith('{') &&
			!isDegenerateText(firstLine) &&
			outputMatchesLang(firstLine, lang) &&
			!isGenericQuestion(firstLine, issue, history, lawContext) &&
			!presupposesRequestedArtifact(firstLine, issue) &&
			!presupposesUnknownDocument(firstLine, issue, history, lawContext) &&
			!hasDanglingDefinite(firstLine, issue, history, lawContext) &&
			!isEntailedBySource(firstLine, issue, history) &&
			isSingleConcept(firstLine) &&
			(await judgeEntitiesGrounded(firstLine, issue, history, lawContext, {
				signal: opts.signal,
				trace
			})) &&
			!(await judgeAlreadyAnswered(firstLine, issue, history, {
				signal: opts.signal,
				trace
			}))
		) {
			return {
				id: `q${history.length + 1}`,
				text: firstLine,
				type: 'text',
				required: false,
				needsDocs: docsFlagFor(firstLine, undefined, history)
			};
		}
	} catch {
		/* no usable draft and no prose fallback: ask nothing rather than a generic question */
	}
	return null;
}
