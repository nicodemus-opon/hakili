/**
 * Batch question planner (fact-first): one model call drafts one question
 * per still-missing dimension. Every draft must carry anchors from the
 * user's own text or retrieved law, pass structural hygiene (single concept,
 * grounded, language, type), and pass the semantic invention judge — no
 * invented people, offices, documents, or events. Dimensions without a
 * valid draft are asked nothing at all: fewer good questions beats any
 * generic one.
 */
import { completeJson, initAgent } from '../llm.ts';
import {
	CONTEXT_BUDGETS,
	buildRetrievalQuery,
	formatLawHints,
	summarizeCaseState
} from '../context.ts';
import { outputMatchesLang } from '../language.ts';
import { searchLegal } from '../retrieval.ts';
import {
	contentTokens,
	firstClause,
	hasDanglingDefinite,
	isDuplicateQuestion,
	isEntailedBySource,
	isGenericQuestion,
	isGroundedInLaw,
	isSingleConcept,
	isTypeConsistent,
	presupposesRequestedArtifact,
	presupposesUnknownDocument,
	specificityScore
} from './policy.ts';
import {
	isDegenerateText,
	judgeAlreadyAnswered,
	judgeEntitiesGrounded,
	normalizeType,
	toQuestion,
	validateDraft,
	type DraftQuestion
} from './loop.ts';
import {
	DIMENSIONS,
	DIMENSION_HINTS,
	detectAdviceQuestion,
	evidenceSource,
	extractCaseState,
	quoteGrounds,
	type CaseState,
	type Dimension
} from './facts.ts';
import { planTheory, renderTheory, type Theory } from './theory.ts';
import type { HistoryTurn, Question, ResponseLang } from '../types.ts';
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';

/** Hard cap shared with the single-question path: four questions per interview. */
const MAX_QUESTIONS = 4;

interface BatchDraft extends DraftQuestion {
	dimension: Dimension;
	anchors: string[];
}

/**
 * Per-item validation: a draft must name a known dimension. Anchors quoting
 * the user's own issue/answers or retrieved law are ADVISORY (kept for the
 * trace) — never blocking. Live repro: the anchor gate killed three good
 * lawyer drafts ("Did you receive any written notice...", "Were you given
 * any opportunity to respond...") while the bad re-ask ("Who is the
 * employer?") survived on its one user-word anchor. Grounding is enforced
 * downstream by isGenericQuestion + the law-hook + the semantic judge, which
 * see paraphrase ("repayment" for "paid back") that verbatim anchors miss.
 * When anchors ARE present they must still prove provenance (a user-quoting
 * anchor stapled to echoed prompt scaffolding is rejected).
 */
function validateBatchDraft(parsed: unknown, source: string, lawContext = ''): BatchDraft | null {
	const base = validateDraft(parsed);
	if (!base) return null;
	const r = parsed as Record<string, unknown>;
	if (typeof r.dimension !== 'string' || !(DIMENSIONS as readonly string[]).includes(r.dimension))
		return null;
	const groundedIn = `${source} ${lawContext}`;
	const anchors = (Array.isArray(r.anchors) ? r.anchors : [])
		.map(String)
		.map((a) => a.trim())
		.filter((a) => quoteGrounds(a, groundedIn))
		.slice(0, 4);
	// Anchors are advisory only (trace signal): grounding is enforced by
	// isGenericQuestion + the law-hook + the semantic judges, which see
	// paraphrase ("repayment" for "paid back") that verbatim anchors miss.
	// Live repro: the provenance bar killed three good lawyer drafts while a
	// stapled-anchor bad draft survived on one user word.
	return { ...base, dimension: r.dimension as Dimension, anchors };
}

/**
 * Direction-flip gate (user-as-actor framing): the interview addresses the
 * person asking for help. When the issue states the user LENT money, a draft
 * that treats the user as the borrower ("Were you given... to repay") has
 * the roles backwards — and vice versa. Narrow lender/borrower detection,
 * not domain vocabulary: it only fires on explicit lend/borrow statements.
 */
function hasDirectionFlip(text: string, issue: string): boolean {
	const iss = String(issue ?? '').toLowerCase();
	const t = String(text ?? '').toLowerCase();
	const lender = /\bi\s+(lent|loaned)\b|\blent\s+some(one|body)\b/.test(iss);
	const borrower = /\bi\s+borrowed\b|\bborrowed\s+from\b/.test(iss);
	if (
		lender &&
		/were you given|did you receive|were you paid|deadline\s+(to|for).*repay|repay.*deadline/.test(
			t
		)
	)
		return true;
	if (borrower && /did you send|did you give|did you issue/.test(t) && /demand/.test(t))
		return true;
	return false;
}

/** Batch parse result: accepted drafts plus one terse drop reason per reject. */
interface ParsedBatch {
	drafts: BatchDraft[];
	drops: string[];
}

/**
 * Specificity floor: a non-party draft must share at least this many
 * distinct content tokens with the user's story plus retrieved law
 * (capped per side, same counting as specificityScore). Kills
 * single-token scaffolding a law term smuggles through ("Was there a
 * date?", "heard before any action") — names the law but pins nothing
 * to this case. Party is exempt (names live in the user's story, and
 * re-asks are caught by isEntailedBySource). Fail-open without law context.
 */
const MIN_SPECIFICITY = 2;

/** A dimension the drafter declined as immaterial, with its stated reason. */
export interface BatchSkip {
	dimension: Dimension;
	reason: string;
}

/**
 * Validated decline list: the model may omit immaterial dimensions via the
 * wrapper {"questions":[...],"skipped":[{"dimension","reason"}]} shape.
 * Only known dimensions that are still unsettled (in `missing`, undrafted)
 * count — anything else is logged as a drop, never trusted. Reasons are
 * trace signal (the recursion fuel), never shown to the user.
 */
function parseSkipped(
	raw: unknown,
	missing: Dimension[],
	drafted: Set<Dimension>
): { skipped: BatchSkip[]; drops: string[] } {
	const skipped: BatchSkip[] = [];
	const drops: string[] = [];
	const list =
		raw && typeof raw === 'object' && !Array.isArray(raw)
			? (raw as Record<string, unknown>).skipped
			: undefined;
	if (list === undefined) return { skipped, drops };
	if (!Array.isArray(list)) {
		drops.push('unparseable-skipped');
		return { skipped, drops };
	}
	for (const item of list) {
		if (!item || typeof item !== 'object') {
			drops.push('bad-skip');
			continue;
		}
		const r = item as Record<string, unknown>;
		const dim = typeof r.dimension === 'string' ? r.dimension : '';
		if (!(DIMENSIONS as readonly string[]).includes(dim)) {
			drops.push('bad-skip-dim');
			continue;
		}
		const d = dim as Dimension;
		if (!missing.includes(d) || drafted.has(d) || skipped.some((s) => s.dimension === d)) {
			drops.push(`dup-skip:${d}`);
			continue;
		}
		const reason = typeof r.reason === 'string' ? r.reason.trim().slice(0, 120) : '';
		skipped.push({ dimension: d, reason });
	}
	return { skipped, drops };
}

/** Structural hygiene, same bar as the single-question path plus batch dedupe. */
function parseBatchDrafts(
	raw: unknown,
	source: string,
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	lawContext = ''
): ParsedBatch {
	const preview = (item: unknown): string => {
		const t =
			item && typeof item === 'object'
				? String((item as Record<string, unknown>).text ?? '?')
				: '?';
		return t.slice(0, 40).replace(/\s+/g, ' ');
	};
	if (!Array.isArray(raw)) return { drafts: [], drops: [] };
	const drafts: BatchDraft[] = [];
	const drops: string[] = [];
	// Statute vocabulary is mandatory for every dimension except party
	// (names live in the user's story, not the statute book): a draft that
	// shares no token with the retrieved law is template scaffolding wearing
	// a borrowed noun ("When did your neighbor build the wall?" names the
	// story but pins no procedure, document, office, or deadline — it fits
	// any land case). Fail-open when retrieval came back empty.
	const needsLawHook = (text: string, dim: Dimension): boolean =>
		dim !== 'party' && lawContext.trim() !== '' && !isGroundedInLaw(text, lawContext);
	// Specificity floor: one shared token (a law term stapled onto a bare
	// shape) is not a case-specific question. Rank, never vocabulary.
	const tooThin = (text: string, dim: Dimension): boolean =>
		dim !== 'party' &&
		lawContext.trim() !== '' &&
		specificityScore(text, issue, history, lawContext) < MIN_SPECIFICITY;
	// Dedupe against history AND drafts accepted earlier in this batch.
	const seen: HistoryTurn[] = [...history];
	for (const item of raw) {
		const d = validateBatchDraft(item, source, lawContext);
		if (!d) {
			drops.push(`unprovenanced:${preview(item)}`);
			continue;
		}
		const qType = normalizeType(d);
		// Garbage first: never salvage degenerate, over-long, or
		// placeholder drafts. Brackets are prompt scaffolding leaking
		// through (live repro: "What is the name of [your person or
		// office]?") — never user-facing text.
		const earlyReason = isDegenerateText(d.text)
			? 'degenerate'
			: d.text.split(/\s+/).length > 60
				? 'too-long'
				: d.text.includes('[') || d.text.includes(']')
					? 'bracket'
					: null;
		if (earlyReason) {
			drops.push(`${earlyReason}:${d.text.slice(0, 40).replace(/\s+/g, ' ')}`);
			continue;
		}
		// Doubles before generic: a vague second clause ("...and what do you
		// want?") poisons the whole draft into `generic`, hiding a clean,
		// grounded first half. Split first; the half is re-validated below.
		if (!isSingleConcept(d.text)) {
			// Salvage: keep the first interrogative clause instead of
			// dropping the draft outright. The half is re-validated
			// below; it inherits the draft's anchors, which are already
			// verified against user/law text (the half passes grounding on
			// its own merits, so provenance carries over).
			const half = firstClause(d.text);
			const halfReason = !half
				? 'double-unsalvageable'
				: isGenericQuestion(half, issue, history, lawContext)
					? 'double-generic'
					: presupposesRequestedArtifact(half, issue)
						? 'double-prospective'
						: presupposesUnknownDocument(half, issue, history, lawContext)
							? 'double-presupposed'
							: hasDanglingDefinite(half, issue, history, lawContext)
								? 'double-dangling'
								: isEntailedBySource(half, issue, history)
									? 'double-answered'
									: hasDirectionFlip(half, issue)
										? 'double-direction'
										: needsLawHook(half, d.dimension)
											? 'double-no-law-hook'
											: tooThin(half, d.dimension)
												? 'double-thin'
												: !outputMatchesLang(half, lang)
													? 'double-lang'
													: isDuplicateQuestion(half, seen)
														? 'double-duplicate'
														: !isTypeConsistent(half, qType, d.options)
															? 'double-type'
															: null;
			if (!halfReason && half) {
				if (drafts.some((x) => x.dimension === d.dimension)) {
					drops.push(`dup-dim:${d.dimension}`);
					continue;
				}
				drops.push(`split:${half.slice(0, 40).replace(/\s+/g, ' ')}`);
				drafts.push({ ...d, text: half });
				seen.push({ q: half, a: '' });
				continue;
			}
			drops.push(`${halfReason ?? 'double'}:${d.text.slice(0, 40).replace(/\s+/g, ' ')}`);
			continue;
		}
		const reason = isGenericQuestion(d.text, issue, history, lawContext)
			? 'generic'
			: presupposesRequestedArtifact(d.text, issue)
				? 'prospective'
				: presupposesUnknownDocument(d.text, issue, history, lawContext)
					? 'presupposed'
					: hasDanglingDefinite(d.text, issue, history, lawContext)
						? 'dangling'
						: isEntailedBySource(d.text, issue, history)
							? 'answered'
							: hasDirectionFlip(d.text, issue)
								? 'direction'
								: needsLawHook(d.text, d.dimension)
									? 'no-law-hook'
									: tooThin(d.text, d.dimension)
										? 'thin'
										: !outputMatchesLang(d.text, lang)
											? 'lang'
											: isDuplicateQuestion(d.text, seen)
												? 'duplicate'
												: !isTypeConsistent(d.text, qType, d.options)
													? 'type'
													: null;
		if (reason) {
			drops.push(`${reason}:${d.text.slice(0, 40).replace(/\s+/g, ' ')}`);
			continue;
		}
		if (drafts.some((x) => x.dimension === d.dimension)) {
			drops.push(`dup-dim:${d.dimension}`);
			continue;
		}
		drafts.push(d);
		seen.push({ q: d.text, a: '' });
	}
	return { drafts, drops };
}

function buildBatchPrompt(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	missing: Dimension[],
	lawHints = '',
	theoryText = '',
	swSource = false
): string {
	const langDirective =
		lang === 'sw'
			? 'Write text, options, and help entirely in Kiswahili (Kiswahili sanifu), even if the user wrote in English. Keep JSON keys in English.'
			: 'Write text, options, and help entirely in English.';
	const dims = missing.map((d, i) => `${i + 1}. ${d}: ${DIMENSION_HINTS[d]}`).join('\n');
	const lawSection = lawHints
		? `\nRelevant Kenyan law (ground the question, do not quote verbatim):\n${lawHints}\n`
		: '';
	const goodExample =
		lang === 'sw'
			? 'Mfano mzuri (umbo pekee — jaza <> kwa maneno ya sheria zilizo hapo juu na maneno ya mtumiaji, kamwe usitoe maneno kutoka kesi nyingine): "Ulipewa <hati au utaratibu uliotajwa katika sheria zilizo hapo juu>?" Mfano mbaya: "Umefanya nini hadi sasa?" (linafaa kesi yoyote — kataza).'
			: 'Good shape only (fill <> with words from the CURRENT law lines above and the user\'s nouns — never borrow nouns from any other case): "Were you given <a document or procedure named in the CURRENT law lines>?" (hearing-type procedures only when the CURRENT law lines name them). Bad: "What have you done about this so far?" (fits any case — forbidden).';
	return `You are Hakili, an intake assistant for an advocate of the High Court of Kenya. ${langDirective} Instructions: "${issue}"

So far the user answered:
${history.map((h) => `Q: ${h.q}\nA: ${h.a}`).join('\n') || '- (no answers yet)'}
${lawSection}
Think like the lawyer who will argue this case: the Kenyan law lines above are only candidates — use a law line ONLY if it matches the user's story (a staff advance is employment law, NOT a personal loan between individuals; a payslip rule is NOT a land boundary rule). The matching lines name the procedures, documents, offices, deadlines, and payments that decide this kind of case (notice, hearing, written reasons, agreement, receipt, OB number, survey, demand, labour office, court, time limit). The interview still needs EACH of these dimensions, in this order:
${dims}
${theoryText}
First, in an "analysis" field (never shown to the user; write it in English even for Kiswahili interviews), work the case like the lawyer who will argue it: refine the agreed theory above (or reason from scratch when none is given):${swSource ? ' The user writes in Kiswahili: quote their Kiswahili nouns (names, places, things) verbatim in anchors and questions — grounding depends on it, translation to Kiswahili happens afterwards.' : ''} (1) name the ONE claim, defence, or procedure this story most likely turns on, using words from the law lines above; (2) list the 2-4 facts that would change your advice — the elements a court or tribunal checks, the procedure's requirements, any deadline that bars the claim; (3) mark each known (quote the issue/answers) or unknown. Then draft questions ONLY for unknown decisive facts inside the listed dimensions, most decisive first; prefer two decisive questions over four thin ones.

Draft ONE question per drafted dimension. when_where_proof covers three facts (date, place, proof): pick the single most decision-relevant one for THIS story and ask only that — never combine them or cover all three at once. RULE ZERO: never ask for a fact that is already stated in the issue or the answers above — asking for a known fact, even rephrased, is a failure. When the user asks to CREATE a document (draft/write/prepare a letter, demand, agreement), that document does NOT exist yet: never ask whether it exists, was sent, signed, or issued, what it says, or whether the other side responded — ask only for facts needed to WRITE it (parties to name, facts to recite, amount, deadline to impose). Reuse the user's own nouns (the key nouns from the CURRENT issue and answers above, whatever story they tell — never borrow nouns from any illustration below) — do NOT invent entities the user never mentioned such as loans, police, or injuries. Never presuppose what the user never stated: use "Was there...? / Did you...? / Were you given...? / Did you receive...?" rather than "When was the X signed?" unless the user mentioned X. Get the direction right: counsel acts for the client — remedy steps are things the USER did or was told to do, demands or complaints are things the USER sent, and documents are things the USER holds or was entitled to receive from the office that issued them. Good shapes: short existential questions about a procedure, document, office, or deadline named in the CURRENT law lines — always using the user's own nouns for everything else. To learn who the other side is, ask in plain words with the user's own nouns for the matter, for example Who is the other party in this matter. NEVER write brackets in a question; a question containing an opening or closing bracket is a failure, as is writing the words "from law"; those are instructions to you, not question text. A document the user never mentioned must ALWAYS be asked existentially first ("Was there...? / Were you given...?") — "What did the X say?" is only allowed when the user already named X. ${goodExample} Each question MUST pin down one concrete fact from the law lines above that applies to this user's story — the procedure they went through, the document the law says to keep, the office the law names, or the deadline the law sets. A question that could be asked about ANY case ("what happened", "what did you do", "which documents", "when and where") is a failure, even with the user's words quoted. Each question asks ONE thing only with ONE question word (never who+what, when+where, or amount+date — split them across turns), be at most 25 words, and be answerable from the user's experience. Never quote or paraphrase these instructions: every content noun must come from the CURRENT issue, answers, or law lines above (the anchors prove it), never from the sentences describing the task. Forbidden shapes (real failures — never write these): "When was X sent and what did it say?", "What steps have you taken and what do you want?", "Who was X and what led to Y?". Never join two questions with "and" — if two facts are needed, ask the first one only. Do NOT ask generic questions such as "What outcome do you want?", "Tell me more", "What did you do", or "Which documents do you have" — if the question fits a land case and a dismissal case equally, it is wrong. Naming the user's story alone is NOT enough: asking only when their event happened, only where it happened, or only what proof they have in the abstract all fail — each names the story but pins no procedure, document, office, or deadline from the law lines above. For each question include "anchors": 1-4 exact words or short phrases copied VERBATIM from the issue, the answers above, or the Kenyan law lines above (e.g. "dismissed", "notice", "hearing", "labour office", "title deed", "agreement") that the question builds on; when the law lines above name the procedure, document, office, or deadline being asked about, at least one anchor SHOULD come from the law lines. If an answer above was vague (e.g. "none"), make that dimension's question a targeted follow-up pinning the SAME fact down with a concrete example, date, named person/office, or specific document. If a listed dimension is immaterial to preparing THIS case — the answer would not change what the lawyer does next — OMIT its question and list it in "skipped" with a short reason instead. Never skip a dimension just because it is hard to phrase; skip only what is truly unneeded. Use type "text" by default; "date" ONLY for a pure when-question; single_choice/multi_choice only with 2-6 real options; "boolean" for yes/no. Do NOT include an "Other" option. Set needsDocs to true ONLY when the question text explicitly asks the user to list, describe, or attach documents, evidence, receipts, contracts, letters, or photos.

Return ONLY JSON: {"analysis":"...","questions":[{"dimension":"${missing[0] ?? 'party'}","text":"...","type":"text","options":[],"required":true,"help":"...","needsDocs":false,"anchors":["..."]}],"skipped":[{"dimension":"...","reason":"..."}]}`;
}

const TIGHTEN =
	' Previous attempt was unusable (ungrounded, vague, duplicate, double-barrelled, or wrong language). Every question MUST ask ONE thing with ONE question word (never join with "and"), target its dimension, and reuse the user’s own nouns. Anchors are optional: include 1-2 short quotes only if natural. Never begin a question with "For example"/"Kwa mfano" — ask directly. Return ONLY JSON.';

export interface BatchDeps {
	/** Precomputed case state (tests). Default: extract via the local model. */
	state?: CaseState;
	/** Injectable drafter (tests). Default: one batched model call. */
	draft?: (prompt: string) => Promise<unknown>;
	/**
	 * Precomputed law hints (tests). Default: best-effort retrieval.
	 * When `draft` is injected and no `lawHints` is given, retrieval is
	 * skipped (empty) so unit tests stay offline and fast.
	 */
	lawHints?: string;
	lawContext?: string;
	/**
	 * Semantic invention judge (tests). Default: the model judge over
	 * issue/history/law — rejects drafts that invent people, offices,
	 * documents, or events (fails closed). Skipped when a test drafter is
	 * injected without a stub, so unit tests stay offline and fast.
	 */
	judgeGrounded?: (text: string) => Promise<boolean>;
	/**
	 * Semantic redundancy judge (tests). Default: the model judge over
	 * issue/history — rejects drafts that re-ask a fact the user already
	 * stated ("Who is the employer?" on "My employer dismissed me"). Fails
	 * OPEN (question kept) so a judge outage never skips a needed question.
	 * Skipped when a test drafter is injected without a stub.
	 */
	judgeAnswered?: (text: string) => Promise<boolean>;
	/**
	 * Injectable theory runner (tests). Default: one narrow reasoning call.
	 * Used only when `draft` is NOT injected, so unit tests with a stub
	 * drafter never touch the model here either.
	 */
	theory?: (prompt: string) => Promise<unknown>;
	/**
	 * Precomputed theory (tests). Default: derived via `theory`/model.
	 * When set, the draft prompt carries it without any model call.
	 */
	theoryState?: Theory | null;
	/**
	 * Injectable retrieval (tests). Default: best-effort `searchLegal`.
	 */
	retrieve?: (
		query: string,
		k: number
	) => Promise<Array<{ title: string; citation: string; content: string }>>;
	/**
	 * Precomputed intent (tests). `true` = general advice question: skip
	 * the interview outright. Default: detected (model + deterministic
	 * backstop), but only when `draft` is NOT injected.
	 */
	advice?: boolean;
	/**
	 * Injectable advice judge (tests). Default: the model judge over
	 * issue/history, failing open to case.
	 */
	detectAdvice?: (prompt: string) => Promise<string | null>;
	/**
	 * Injectable translator (tests). Swahili interviews draft in English
	 * and translate at the end; default is one narrow model call.
	 */
	translate?: (
		items: Array<{ id: string; text: string; help?: string; options?: string[] }>
	) => Promise<unknown>;
}

/**
 * Plan the next batch of questions: extract case state, draft one question
 * per missing dimension in a single model call, skipping uncovered
 * dimensions outright. Returns [] when nothing is missing
 * (a complete story goes straight to the plan).
 */
export async function planQuestionBatch(
	issue: string,
	history: HistoryTurn[],
	lang: ResponseLang,
	opts: {
		signal?: AbortSignal;
		trace?: Trace;
		agentId?: unknown;
		focusDimensions?: Dimension[];
		maxQuestions?: number;
	} = {},
	deps: BatchDeps = {}
): Promise<Question[]> {
	const trace = opts.trace;
	if (history.length >= MAX_QUESTIONS) return [];
	// Intent routing: a general legal question ("can my employer dismiss
	// me") is answered from the law, never interrogated. Skipped whenever
	// a test drafter is injected without an explicit advice flag, so unit
	// tests stay offline and fast.
	let advice = deps.advice;
	if (advice === undefined && (deps.draft === undefined || deps.detectAdvice !== undefined)) {
		advice = await detectAdviceQuestion(issue, history, lang, opts, deps.detectAdvice);
	}
	if (advice) {
		if (trace) event(trace, 'interview:skipped-advice', 'general-question');
		return [];
	}
	const state = deps.state ?? (await extractCaseState(issue, history, lang, opts));
	// Drafting language: Swahili interviews draft in English (every gate
	// and the model itself are stronger in it), translating verified
	// questions at the end.
	const draftLang: ResponseLang = lang === 'sw' ? 'en' : lang;
	// True when drafting English against a Kiswahili issue: the model must
	// reuse Kiswahili nouns verbatim so drafts ground in the user's words.
	const swSource = draftLang === 'en' && lang === 'sw';
	// Agent priority: Check foregrounds docs, Draft foregrounds parties/steps.
	// Missing set is unchanged (no starvation), only the draft order shifts.
	// Native-tool focus (draftQuestions{focus,maxQuestions}): intersect missing
	// with the requested focus so ReAct can steer without rephrasing risk.
	let missing = state.missing.slice(0, MAX_QUESTIONS - history.length);
	try {
		const { agentConfig } = await import('../agents.ts');
		const order = agentConfig(opts.agentId).dimensionOrder;
		const rank = new Map(order.map((d, i) => [d, i]));
		missing = [...missing].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
	} catch {
		/* keep default order */
	}
	if (opts.focusDimensions && opts.focusDimensions.length > 0) {
		const wanted = new Set(opts.focusDimensions);
		const focused = missing.filter((d) => wanted.has(d));
		// Unknown/covered focus is ignored (never invent a dimension); an
		// empty intersection means nothing to ask — return [] reliably.
		missing = focused;
	}
	if (typeof opts.maxQuestions === 'number' && Number.isFinite(opts.maxQuestions)) {
		missing = missing.slice(0, Math.max(1, Math.min(4, Math.floor(opts.maxQuestions))));
	}
	if (missing.length === 0) return [];
	// Kiswahili containment (verified live, repeatedly): the local model
	// cannot write Kiswahili — constrained prompts, few-shot-free drafting,
	// and translate-back all produce fluent gibberish ("Watashi nafaa kwa
	// mchezaji?", "Maswali ya mwanambe wanaungu?"). Rather than burn model
	// calls to yield [], Swahili interviews go straight to the plan until a
	// capable model lands. Injected test doubles still run the full path.
	if (lang === 'sw' && deps.draft === undefined && deps.theoryState === undefined) return [];
	const source = evidenceSource(issue, history);
	// Best-effort law grounding for lawyer-like drafts (offline-safe:
	// any failure degrades to ungrounded drafting, never a throw).
	let lawHints = deps.lawHints ?? '';
	let lawContext = deps.lawContext ?? '';
	// Injectable in tests; skipped when a test drafter is injected without an
	// explicit retrieval stub, so unit tests stay offline and fast.
	if (deps.lawHints === undefined && (deps.draft === undefined || deps.retrieve !== undefined)) {
		try {
			const retrieve =
				deps.retrieve ??
				((query: string, k: number) =>
					searchLegal(query, k, undefined, { signal: opts.signal }, trace));
			const queryText = buildRetrievalQuery([issue, ...history.map((h) => `${h.q} ${h.a}`)]);
			// Single base retrieval: story-similarity recall is clean and
			// topical, while a remedy-biased second query returned junk
			// (EACC, waste, FGM lines for car/land cases) that can ground
			// junk drafts. One query, no expansion.
			const passages = await retrieve(queryText, 8);
			if (passages.length > 0) {
				lawHints = formatLawHints(passages, CONTEXT_BUDGETS.INTERVIEW_LAW_HINTS);
				lawContext = passages.map((p) => `${p.title} ${p.content}`).join('\n');
			}
			if (trace)
				event(
					trace,
					'interview:batch-context',
					`recap=${summarizeCaseState(state, history).slice(0, 120)}`
				);
		} catch {
			lawHints = '';
			lawContext = '';
		}
	}
	// Narrow reasoning call: work the case theory BEFORE drafting, so the
	// drafting call only phrases. Skipped whenever a test drafter or
	// precomputed theory is present; null theory falls back to drafting
	// unaided (the analysis field in the draft prompt). Also skipped for
	// Kiswahili: the small model confabulates English theories for
	// three-word non-English issues (rates/rent, import duty), poisoning
	// every draft downstream — containment beats reasoning there.
	let theoryText = '';
	if (deps.theoryState !== undefined) {
		theoryText = renderTheory(deps.theoryState);
	} else if (deps.draft === undefined && lang !== 'sw') {
		try {
			const theory: Theory | null = await planTheory(
				issue,
				history,
				lang,
				missing,
				lawHints,
				{ signal: opts.signal, trace },
				deps.theory
			);
			theoryText = renderTheory(theory);
			if (trace && theoryText)
				event(trace, 'interview:theory', theoryText.slice(0, 300).replace(/\s+/g, ' '));
		} catch {
			theoryText = '';
		}
	}
	// No generic backfill: a dimension without a valid model draft is
	// simply not asked. The interview asks only grounded, single-concept,
	// statute-specific questions — never who/what/when/where scaffolding.

	const draftFn =
		deps.draft ??
		(async (prompt: string): Promise<unknown> => {
			await initAgent();
			const res = await completeJson<unknown[]>(
				prompt,
				{
					predict: 900,
					temp: 0.25,
					repeat_penalty: 1.15,
					frequency_penalty: 0.1,
					signal: opts.signal,
					model: 'draft-questions'
				},
				(p) => {
					// Accept the wrapped shape or a bare array; anything else
					// fails closed and is logged + retried below.
					if (Array.isArray(p)) return p;
					if (!p || typeof p !== 'object') return null;
					const qs = (p as Record<string, unknown>).questions;
					return Array.isArray(qs) ? qs : null;
				},
				trace
			);
			return res.ok ? res.value : null;
		});

	/**
	 * Minimal fallback prompt: when the full lawyer-shape prompt yields nothing
	 * usable, degrade prompt complexity (not the quality bar). Short,
	 * existential-only, few rules — small models sustain this far better in
	 * Kiswahili/Sheng, and every gate still applies to its output.
	 */
	function buildSimpleBatchPrompt(
		issue: string,
		history: HistoryTurn[],
		lang: ResponseLang,
		missing: Dimension[],
		lawHints = '',
		swSource = false
	): string {
		const langDirective =
			lang === 'sw'
				? 'Andika kila swali kwa Kiswahili sanifu. Weka JSON keys kwa Kiingereza.'
				: 'Write every question in English. Keep JSON keys in English.';
		const dims = missing.map((d) => `- ${d}: ${DIMENSION_HINTS[d]}`).join('\n');
		const convo =
			history
				.map((h) => `Q: ${h.q}\nA: ${h.a}`)
				.join('\n')
				.slice(0, 600) || '-';
		const lawSection = lawHints
			? `\nRelevant Kenyan law (use its procedures, documents, offices, deadlines):\n${lawHints}\n`
			: '';
		const eg =
			lang === 'sw'
				? 'Mfano: "Ulipewa kitu chochote?" (muulize moja kwa moja, maneno ya mtumiaji).'
				: 'Example: "Were you given anything in writing?" (ask directly, user words).';
		return `You ask intake questions for counsel. ${langDirective} The user said: "${issue.slice(0, 400)}"\n\nAnswers so far:\n${convo}\n${lawSection}\nStill needed:\n${dims}\n\nWrite ONE short question per needed item above. Each question MUST start with "Was there", "Were you given", "Did you", "Do you have", "When", or "Who" (Swahili: "Kulikuwa", "Ulipewa", "Uli", "Unayo", "Lini", "Nani"), be at most 15 words, name the user's specific event (never "this", "it", or "happen" alone), reuse the user's own nouns${swSource ? ' (their Kiswahili nouns verbatim — translation to Kiswahili happens afterwards)' : ''}, and include 1-2 VERBATIM quotes from the user's words as "anchors". Never ask whether a document the user asked you to CREATE exists, was sent/signed, or was answered. Never ask about loans, police, injuries, or offices the user never mentioned. Never begin with "For example"/"Kwa mfano". ${eg}\n\nReturn ONLY JSON: {"questions":[{"dimension":"${missing[0] ?? 'party'}","text":"...","type":"text","anchors":["..."]}]}`;
	}

	// Accept either the bare array or the wrapped {"questions": [...]} shape.
	const asArray = (raw: unknown): unknown => {
		if (Array.isArray(raw)) return raw;
		if (raw && typeof raw === 'object') {
			const qs = (raw as Record<string, unknown>).questions;
			if (Array.isArray(qs)) return qs;
		}
		return null;
	};

	let drafts: BatchDraft[];
	let drops: string[] = [];
	const noteUnparseable = (raw: unknown) => {
		if (raw === null || raw === undefined) return;
		if (typeof raw === 'string' && !raw.trim()) return;
		drops.push(`unparseable:${JSON.stringify(raw).slice(0, 80)}`);
	};
	let agentDirective = '';
	try {
		const { agentConfig } = await import('../agents.ts');
		agentDirective = agentConfig(opts.agentId).interviewDirective;
	} catch {
		/* keep default */
	}
	const skipped: BatchSkip[] = [];
	/** Dimensions neither drafted nor declined yet — the only ones worth retrying. */
	const pending = () =>
		missing.filter(
			(d) => !drafts.some((x) => x.dimension === d) && !skipped.some((s) => s.dimension === d)
		);
	/** Absorb a decline list, keeping it consistent with drafts accepted so far. */
	const absorbSkipped = (raw: unknown) => {
		const parsed = parseSkipped(raw, missing, new Set(drafts.map((d) => d.dimension)));
		for (const s of parsed.skipped) {
			if (
				drafts.some((x) => x.dimension === s.dimension) ||
				skipped.some((x) => x.dimension === s.dimension)
			) {
				drops.push(`dup-skip:${s.dimension}`);
				continue;
			}
			skipped.push(s);
		}
		drops.push(...parsed.drops);
	};
	/**
	 * Merge rival drafts across attempts: first draft per dimension wins
	 * within one response (parse rule), but across retries the more
	 * specific draft survives — ranked by token overlap with this case's
	 * own user/law texts, never any vocabulary. Logs every replacement.
	 */
	const mergeScored = (incoming: BatchDraft[], extraDrops: string[]) => {
		for (const d of incoming) {
			const ix = drafts.findIndex((x) => x.dimension === d.dimension);
			if (ix === -1) {
				drafts.push(d);
				continue;
			}
			const prev = drafts[ix] as BatchDraft;
			if (
				specificityScore(d.text, issue, history, lawContext) >
				specificityScore(prev.text, issue, history, lawContext)
			) {
				drops.push(`dup-dim-outscored:${prev.text.slice(0, 40).replace(/\s+/g, ' ')}`);
				drafts[ix] = d;
			} else {
				drops.push(`dup-dim:${d.dimension}`);
			}
		}
		drops.push(...extraDrops);
	};
	try {
		const raw = await draftFn(
			buildBatchPrompt(issue, history, draftLang, missing, lawHints, theoryText, swSource) +
				agentDirective
		);
		const arr = asArray(raw);
		({ drafts, drops } = parseBatchDrafts(arr, source, issue, history, draftLang, lawContext));
		absorbSkipped(raw);
		if (arr === null) noteUnparseable(raw);
		if (drafts.length === 0 && pending().length > 0 && !opts.signal?.aborted) {
			// One tighten retry whenever nothing was usable — malformed JSON
			// included. Previously the retry skipped exactly that case.
			// Dimensions the model explicitly declined are NOT retried: the
			// retry covers only dims it neither drafted nor declined.
			if (trace) event(trace, 'interview:batch-retry', 'all-drafts-dropped');
			const raw2 = await draftFn(
				buildBatchPrompt(issue, history, draftLang, pending(), lawHints, theoryText, swSource) +
					TIGHTEN
			);
			const arr2 = asArray(raw2);
			const reparsed = parseBatchDrafts(arr2, source, issue, history, draftLang, lawContext);
			mergeScored(reparsed.drafts, reparsed.drops);
			absorbSkipped(raw2);
			if (arr2 === null) noteUnparseable(raw2);
			if (drafts.length === 0 && pending().length > 0 && !opts.signal?.aborted) {
				// Last resort: degrade prompt complexity, not the quality
				// bar. The full shape prompt is too much for the small
				// model on some issues/languages; a minimal existential
				// prompt often yields valid drafts where the full one
				// aped employment scaffolding. All gates still apply.
				if (trace) event(trace, 'interview:batch-retry', 'simple-prompt');
				try {
					const rawSimple = await draftFn(
						buildSimpleBatchPrompt(issue, history, draftLang, pending(), lawHints, swSource)
					);
					const arrSimple = asArray(rawSimple);
					const simpleParsed = parseBatchDrafts(
						arrSimple,
						source,
						issue,
						history,
						draftLang,
						lawContext
					);
					mergeScored(simpleParsed.drafts, simpleParsed.drops);
					absorbSkipped(rawSimple);
					if (arrSimple === null) noteUnparseable(rawSimple);
				} catch {
					/* uncovered dims are skipped */
				}
			}
		}
		if (!opts.signal?.aborted) {
			// Targeted second pass: dimensions the model ignored — neither
			// drafted nor declined (live repro: 4x party, 0x steps) — get one
			// focused retry instead of skipping the dimension. Declined dims
			// are settled and never retried.
			const seenDims = new Set([
				...drafts.map((d) => d.dimension),
				...skipped.map((s) => s.dimension)
			]);
			const uncovered = missing.filter((d) => !seenDims.has(d));
			// Rival drafts for settled dims are resolved by specificity
			// scoring in mergeScored (keep the sharper phrasing), so the
			// retry parses against history only — not against our own
			// accepted drafts, which would duplicate-drop the rival first.
			if (uncovered.length > 0 && uncovered.length < missing.length) {
				if (trace) event(trace, 'interview:batch-retry', `uncovered=${uncovered.join(',')}`);
				try {
					// Struggling dimensions get the minimal prompt: the full
					// shape already failed them once, repeating it verbatim
					// just apes the same scaffolding.
					const raw3 = await draftFn(
						buildSimpleBatchPrompt(issue, history, draftLang, uncovered, lawHints, swSource)
					);
					const arr3 = asArray(raw3);
					const reparsed = parseBatchDrafts(arr3, source, issue, history, draftLang, lawContext);
					mergeScored(reparsed.drafts, reparsed.drops);
					if (arr3 === null) noteUnparseable(raw3);
				} catch {
					/* uncovered dims are skipped */
				}
			}
		}
	} catch {
		drafts = [];
	}
	// Semantic invention gate: token overlap cannot catch invented people,
	// offices, documents, or events smuggled inside otherwise-grounded text
	// ("caretaker or agent" in a boundary dispute). Fails closed — a judge
	// outage drops the draft outright, never through.
	const judge =
		deps.judgeGrounded ??
		(deps.draft
			? null
			: (text: string) => judgeEntitiesGrounded(text, issue, history, lawContext, opts));
	if (judge && !opts.signal?.aborted) {
		const kept: BatchDraft[] = [];
		for (const d of drafts) {
			let drop: string | null = null;
			try {
				if (!(await judge(d.text))) drop = 'invented';
			} catch {
				drop = 'judge-error';
			}
			if (!drop) {
				kept.push(d);
			} else {
				drops.push(`${drop}:${d.text.slice(0, 40).replace(/\s+/g, ' ')}`);
			}
		}
		drafts = kept;
	}
	// Redundancy gate: a grounded, well-formed draft that re-asks a fact the
	// issue/history already states is still a failure (live repro: "Who is
	// the employer in this case?" on "My employer dismissed me"). Fails OPEN.
	const answeredJudge =
		deps.judgeAnswered ??
		(deps.draft ? null : (text: string) => judgeAlreadyAnswered(text, issue, history, opts));
	if (answeredJudge && !opts.signal?.aborted) {
		const kept: BatchDraft[] = [];
		for (const d of drafts) {
			try {
				if (await answeredJudge(d.text)) {
					drops.push(`answered:${d.text.slice(0, 40).replace(/\s+/g, ' ')}`);
					continue;
				}
			} catch {
				/* fail open: keep the draft */
			}
			kept.push(d);
		}
		drafts = kept;
	}
	// Scope gate (interview-tool reliability): keep only drafts for still-missing
	// dimensions. This enforces draftQuestions{focus} strictly and drops any
	// out-of-scope draft the model volunteers — fewer good beats any off-brief.
	if (missing.length > 0) {
		const wanted = new Set(missing);
		const scoped: BatchDraft[] = [];
		for (const d of drafts) {
			if (wanted.has(d.dimension)) scoped.push(d);
			else drops.push(`out-of-scope:${d.dimension}`);
		}
		drafts = scoped;
	}
	if (trace)
		event(
			trace,
			'interview:batch',
			`missing=${missing.length} drafted=${drafts.length} accepted=[${drafts.map((d) => `${d.text.slice(0, 40).replace(/\s+/g, ' ')}|${d.anchors.join('+')}`).join(';')}] skipped=[${skipped.map((s) => `${s.dimension}:${s.reason.slice(0, 60)}`).join(';')}] drops=[${drops.join(';')}]`
		);

	const questions: Question[] = [];
	// Draft order is decisive-first (per the analysis prompt), so emit in
	// the model's order — not dimension order. Dup-dim is already rejected
	// at parse, so each draft holds a distinct dimension.
	for (const draft of drafts) {
		questions.push(toQuestion(draft, history.length + questions.length, history));
	}
	if (trace) {
		for (const dim of missing) {
			if (drafts.some((d) => d.dimension === dim)) continue;
			// No backfill: an undrafted dimension is skipped, never asked
			// generically. Fewer good questions beats any bad one.
			const skip = skipped.find((s) => s.dimension === dim);
			event(trace, 'interview:batch-skip', skip ? `${dim} declined: ${skip.reason}` : dim);
		}
	}
	// Kiswahili containment: the small model writes weak Kiswahili when it
	// must also reason and shape JSON, so Swahili interviews draft in
	// English (every gate above is tuned for it) and translate at the end —
	// one narrow task. Each item is re-verified in Kiswahili; failures are
	// dropped, never leaked in English.
	if (
		lang === 'sw' &&
		questions.length > 0 &&
		(deps.draft === undefined || deps.translate !== undefined)
	) {
		return translateQuestions(questions, issue, history, opts, deps.translate);
	}
	return questions;
}

/**
 * Translate assembled questions to Kiswahili sanifu. Shape-preserving:
 * ids, types, and flags come from the verified English originals; only
 * display strings cross the model. Items failing language verification
 * are dropped. Never throws — failure returns [] (ask nothing rather than
 * leak the wrong language).
 */
async function translateQuestions(
	questions: Question[],
	issue: string,
	history: HistoryTurn[],
	opts: { signal?: AbortSignal; trace?: Trace },
	run?: BatchDeps['translate']
): Promise<Question[]> {
	const call =
		run ??
		(async (items: Array<{ id: string; text: string; help?: string; options?: string[] }>) => {
			await initAgent();
			// One retry: the small model intermittently returns unparseable
			// output for translation, discarding good drafts (live repro:
			// four good encroachment drafts lost to a null call).
			for (let attempt = 0; attempt < 2; attempt++) {
				try {
					const res = await completeJson<unknown>(
						`Translate each item to Kiswahili sanifu, keeping the meaning exact and the tone direct. Keep every "id" unchanged. Never begin a question with "Kwa mfano" or "For example" — ask directly. Reuse the user's Kiswahili nouns from the issue verbatim (names, places, things). Return ONLY JSON: {"items":[{"id":"...","text":"...","help":"...","options":[...]}]}\n\n${JSON.stringify({ items }).slice(0, 2000)}`,
						{ predict: 400, temp: 0.2, signal: opts.signal, model: 'translate-questions' },
						(p) => {
							if (Array.isArray(p)) return p;
							if (!p || typeof p !== 'object') return null;
							const items = (p as Record<string, unknown>).items;
							return Array.isArray(items) ? items : null;
						},
						opts.trace
					);
					if (res.ok && res.value) return res.value;
				} catch {
					/* retry once, then fall through to [] */
				}
			}
			return null;
		});
	try {
		const raw = await call(
			questions.map((q) => ({ id: q.id, text: q.text, help: q.help, options: q.options }))
		);
		const list: unknown[] = Array.isArray(raw)
			? raw
			: raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).items)
				? ((raw as Record<string, unknown>).items as unknown[])
				: [];
		const kept: Question[] = [];
		// The translation must name the user's own case: word salad with
		// Kiswahili function words fools the language detector, but it
		// shares nothing with the issue — drop anything ungrounded in the
		// user's own words (exact overlap, same bar as the English gates).
		const userToks = contentTokens(evidenceSource(issue, history));
		const dropReasons: string[] = [];
		for (const q of questions) {
			const item = list.find(
				(x) => x && typeof x === 'object' && (x as Record<string, unknown>).id === q.id
			) as Record<string, unknown> | undefined;
			const text = typeof item?.text === 'string' ? item.text.trim() : '';
			if (!text || !outputMatchesLang(text, 'sw')) {
				dropReasons.push(`lang:${q.id}`);
				continue;
			}
			if (![...contentTokens(text)].some((t) => userToks.has(t))) {
				dropReasons.push(`ungrounded-sw:${text.slice(0, 40).replace(/\s+/g, ' ')}`);
				continue;
			}
			const help =
				typeof item?.help === 'string' && item.help.trim() ? item.help.trim() : undefined;
			const options = Array.isArray(item?.options)
				? (item?.options as unknown[]).map(String).slice(0, 6)
				: q.options;
			kept.push({ ...q, text, help: help ?? q.help, options });
		}
		if (opts.trace)
			event(
				opts.trace,
				'interview:translate',
				`kept=${kept.length}/${questions.length} drops=[${dropReasons.join(';')}] raw=${JSON.stringify(raw).slice(0, 160).replace(/\s+/g, ' ')}`
			);
		return kept;
	} catch {
		return [];
	}
}
