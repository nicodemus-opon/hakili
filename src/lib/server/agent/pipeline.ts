/** Shared request pipeline: validation, timeouts, tracing for all agent routes. */
import { fetchUserDocExcerpts, searchUserDocuments } from '../documents.ts';
import * as chrono from 'chrono-node';
import { completeText } from './llm.ts';
import { CONTEXT_BUDGETS, buildRetrievalQuery } from './context.ts';
import { newTrace, mark, logError, event, type Trace } from './observability.ts';
import {
	assignCitations,
	citationCoverage,
	packPassages,
	verifyCitations,
	verifyQuoteSpans
} from './plan/validator.ts';
import { outputMatchesLang, translateTextToSwahili } from './language.ts';
import { classifyIssue, deriveTopic, filterApplicablePassages, searchLegal } from './retrieval.ts';
import { nextQuestion } from './interview/loop.ts';
import { planQuestionBatch } from './interview/batch.ts';
import { isEntailedBySource, presupposesRequestedArtifact } from './interview/policy.ts';
import { detectAdviceQuestion, isProceduralHowTo } from './interview/facts.ts';
import { generatePlan, savePlan } from './plan/generator.ts';
import { agentConfig, normalizeAgentId, type AgentId } from './agents.ts';
import {
	answerAddressesQuestion,
	hasDocCheckIntent,
	hasSubstantiveContent,
	isVagueIssue
} from './jurisdiction.ts';
import { draftExecutionPlan } from './planner/planner.ts';
import { executePlan } from './planner/executor.ts';
import { isReactiveEnabled, runReactiveWithTail } from './planner/react.ts';
import { newBlackboard } from './planner/tools.ts';
import type {
	HistoryTurn,
	LangPref,
	Passage,
	PlanResult,
	Question,
	ResponseLang
} from './types.ts';

export const PIPELINE_TIMEOUT_MS = 180_000;
const MAX_HISTORY = 12;
const MAX_DOCUMENT_IDS = 10;

function cleanProjectInstructions(v: unknown): string {
	return cleanString(v, 2000).trim();
}

function cleanString(v: unknown, max = 4000): string {
	return String(v ?? '').slice(0, max);
}

function cleanHistory(v: unknown): HistoryTurn[] {
	if (!Array.isArray(v)) return [];
	return v.slice(0, MAX_HISTORY).map((t) => {
		const r = (t ?? {}) as Record<string, unknown>;
		return { q: cleanString(r.q, 2000), a: cleanString(r.a, 2000) };
	});
}

function cleanDocIds(v: unknown): string[] {
	if (!Array.isArray(v)) return [];
	return v.map(String).filter(Boolean).slice(0, MAX_DOCUMENT_IDS);
}

export interface InterviewStartInput {
	issue: string;
	langPref: LangPref;
	agentId: AgentId;
	documentIds: string[];
	projectInstructions: string;
}

export function parseInterviewStart(body: unknown): InterviewStartInput | { error: string } {
	const b = (body ?? {}) as Record<string, unknown>;
	const issue = cleanString(b.issue).trim();
	if (!issue) return { error: 'Please describe your issue first.' };
	const pref = (b.langPref ?? b.lang ?? 'en') as string;
	return {
		issue,
		langPref: pref === 'sw' ? 'sw' : 'en',
		agentId: normalizeAgentId(b.agentId),
		documentIds: cleanDocIds(b.documentIds),
		projectInstructions: cleanProjectInstructions(b.projectInstructions)
	};
}

export interface InterviewNextInput extends InterviewStartInput {
	history: HistoryTurn[];
}

export function parseInterviewNext(body: unknown): InterviewNextInput | { error: string } {
	const base = parseInterviewStart(body);
	if ('error' in base) return base;
	const b = (body ?? {}) as Record<string, unknown>;
	return { ...base, history: cleanHistory(b.history) };
}

export interface PlanInput extends InterviewStartInput {
	questions: Question[];
	answers: Record<string, string>;
	topK: number;
	documentIds: string[];
}

export function parsePlanInput(body: unknown): PlanInput | { error: string } {
	const base = parseInterviewStart(body);
	if ('error' in base) return base;
	const b = (body ?? {}) as Record<string, unknown>;
	const questions = Array.isArray(b.questions) ? (b.questions as Question[]) : [];
	const rawAnswers = (b.answers ?? {}) as Record<string, unknown>;
	const answers: Record<string, string> = {};
	for (const [k, v] of Object.entries(rawAnswers)) {
		answers[String(k).slice(0, 500)] = Array.isArray(v)
			? v.map(String).join(', ').slice(0, 2000)
			: cleanString(v, 2000);
	}
	const topK = Math.min(Math.max(Number(b.topK ?? 6) || 6, 1), 12);
	return { ...base, questions, answers, topK, documentIds: cleanDocIds(b.documentIds) };
}

export interface FollowUpTurn {
	role: 'user' | 'assistant';
	content: string;
}

export interface FollowUpInput extends InterviewStartInput {
	history: HistoryTurn[];
	plan: string;
	turns: FollowUpTurn[];
	message: string;
}

function cleanTurns(v: unknown): FollowUpTurn[] {
	if (!Array.isArray(v)) return [];
	return v
		.slice(-10)
		.map((t) => {
			const r = (t ?? {}) as Record<string, unknown>;
			return {
				role: r.role === 'assistant' ? ('assistant' as const) : ('user' as const),
				content: cleanString(r.content, 2000)
			};
		})
		.filter((t) => t.content.trim().length > 0);
}

export function parseFollowUp(body: unknown): FollowUpInput | { error: string } {
	const base = parseInterviewStart(body);
	if ('error' in base) return base;
	const b = (body ?? {}) as Record<string, unknown>;
	const message = cleanString(b.message, 2000).trim();
	if (!message) return { error: 'Please type a message.' };
	return {
		...base,
		history: cleanHistory(b.history),
		plan: cleanString(b.plan, 8000),
		turns: cleanTurns(b.turns),
		message
	};
}

/**
 * Conversational fallback: the deterministic floor under drafted replies.
 * States what Hakili does and invites the matter. No retrieval, no model
 * call, no citations — always safe, never personal.
 */
export function conversationalAnswer(lang: ResponseLang): string {
	if (lang === 'sw') {
		return 'Mimi ni Hakili, msaidizi wa wakili nje ya mtandao. Naweza: kuuliza maswali ya ufafanuzi kuhusu jambo lako; kueleza mahitaji ya kisheria kutoka sheria za Kenya; kupitia hati uliyoambatanisha; na kuandaa rasimu ya barua au ombi. Tafadhali eleza jambo lako kwa sentensi moja au mbili: nini kilitokea, nani anahusika, na unahitaji nini.';
	}
	return 'I’m Hakili, an offline assistant for an advocate in Kenya. I can: ask clarifying questions about your matter; explain legal requirements from Kenyan law; review a document you attach; and draft a letter or application. Please describe your matter in a sentence or two: what happened, who is involved, and what you need.';
}

/**
 * Drafted-reply quality bar (pure, unit-tested): short, marker-free, and
 * in the requested language. Anything else falls back to the canned
 * floor instead of reaching the user.
 */
export function isUsableConversational(text: string, lang: ResponseLang): boolean {
	const t = String(text ?? '').trim();
	if (!t || t.length > 600) return false;
	if (/\[\d+\]/.test(t)) return false;
	return outputMatchesLang(t, lang);
}

/**
 * Draft a genuine reply to a non-legal input (greeting, capability
 * question, noise) instead of dumping the canned paragraph: greet back
 * when greeted, state capabilities when asked, always end by inviting
 * the matter. Never states law, so there is nothing to ground. Returns
 * null when drafting fails or the draft trips the quality bar — callers
 * use the canned floor. `run` is injectable for tests.
 */
export async function draftConversational(
	message: string,
	lang: ResponseLang,
	opts: { signal?: AbortSignal; trace?: Trace } = {},
	run: (prompt: string) => Promise<string | null> = async (prompt) => {
		try {
			return await completeText(
				prompt,
				{ predict: 150, temp: 0.7, signal: opts.signal, model: 'conversational' },
				opts.trace
			);
		} catch {
			return null;
		}
	}
): Promise<string | null> {
	const langLine =
		lang === 'sw'
			? 'Respond ENTIRELY in Kiswahili (Kiswahili sanifu).'
			: 'Respond entirely in English.';
	const prompt = `You are Hakili, an offline assistant for an advocate in Kenya. The user has not stated a legal matter yet; their message is below. Reply briefly, responding to what they actually said: greet them back if greeted, briefly state what you can help with if they ask, and invite them to describe their legal matter. ${langLine} Never state law, never cite sources, never use [n] markers, never invent names or facts. Keep it short.\n\nUser message: ${message.slice(0, 300)}`;
	const out = (await run(prompt))?.trim() ?? '';
	if (!isUsableConversational(out, lang)) return null;
	return verifyCitations(out, 0);
}

/**
 * Conversational path entry point: drafted reply first, canned floor on
 * any failure. Owns its own timeout when the caller has no abort signal
 * (the pre-pipeline gates), so a stuck model can never hang the request.
 */
export async function conversationalReply(
	message: string,
	lang: ResponseLang,
	opts: { signal?: AbortSignal; trace?: Trace } = {}
): Promise<string> {
	if (opts.signal) {
		try {
			const draft = await draftConversational(message, lang, opts);
			if (draft) return draft;
		} catch {
			/* fall through to the floor */
		}
		return conversationalAnswer(lang);
	}
	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), 20000);
	try {
		const draft = await draftConversational(message, lang, { ...opts, signal: ctl.signal });
		if (draft) return draft;
	} catch {
		/* fall through to the floor */
	} finally {
		clearTimeout(timer);
	}
	return conversationalAnswer(lang);
}

async function withPipelineTimeout<T>(
	trace: Trace,
	fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), PIPELINE_TIMEOUT_MS);
	try {
		return await fn(controller.signal);
	} catch (e) {
		if (controller.signal.aborted)
			throw new Error('Request timed out; please try again.', { cause: e });
		throw e;
	} finally {
		clearTimeout(timer);
	}
}

export interface InterviewResult {
	question: Question | null;
	/** Fact-first batch (INTERVIEW_FACT_FIRST=1): the full remaining queue. */
	questions?: Question[];
	/** Advice intent: direct grounded answer, no interview and no plan. */
	answer?: string;
	answerPassages?: Passage[];
	lang: ResponseLang;
	topic: string;
	title: string;
	traceId: string;
	timings: Record<string, number>;
	executionPlan?: import('./planner/types.ts').ExecutionPlan;
	stepStatus?: Record<string, import('./planner/types.ts').PlanStepStatus>;
	subagents?: import('./planner/types.ts').SubagentRun[];
	/** Server-resolved agent (auto-routed to check for doc reviews). */
	effectiveAgentId?: AgentId;
}

export function fallbackTitle(issue: string): string {
	const t = issue.trim().replace(/\s+/g, ' ');
	if (!t) return 'New chat';
	return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

function sanitizeTitle(raw: string, issue: string): string {
	const line = raw
		.replace(/```/g, '')
		.split('\n')
		.map((s) => s.trim())
		.find((s) => s.length > 0)
		?.replace(/^["'“”‘’*#\-–—\d.)\s]+/, '')
		.replace(/["'“”‘’]+$/g, '')
		.replace(/[.。!?:;]+$/g, '')
		.trim();
	if (!line) return fallbackTitle(issue);
	const single = line.replace(/\s+/g, ' ');
	return single.length > 42 ? `${single.slice(0, 42).trimEnd()}…` : single;
}

export async function generateTitle(
	issue: string,
	history: HistoryTurn[] = [],
	opts: { signal?: AbortSignal; trace?: Trace; lang?: ResponseLang } = {}
): Promise<string> {
	try {
		const context =
			history.length > 0
				? ` Issue: ${issue.slice(0, 500)}\nAnswers so far: ${history
						.map((h) => h.a)
						.join(' | ')
						.slice(0, 500)}`
				: ` Issue: ${issue.slice(0, 500)}`;
		const titleLang =
			opts.lang === 'sw'
				? 'Write the title in Kiswahili (Kiswahili sanifu), even though the user wrote in English.'
				: 'Write the title in English.';
		const raw = await completeText(
			`You name chat sessions for Hakili, a Kenyan legal-preparation assistant. Write a very short chat title (3-6 words, max 42 characters) naming the topic of this issue. ${titleLang} No quotes, no emoji, no trailing period. Return ONLY the title.${context}`,
			{ predict: 24, temp: 0.3, signal: opts.signal, model: 'title' },
			opts.trace
		);
		if (opts.signal?.aborted) return fallbackTitle(issue);
		return sanitizeTitle(raw, issue);
	} catch {
		return fallbackTitle(issue);
	}
}

async function runInterview(
	history: HistoryTurn[],
	issue: string,
	langPref: LangPref,
	agentId: AgentId = 'ask',
	documentIds: string[] = [],
	projectInstructions = ''
): Promise<InterviewResult> {
	const trace = newTrace();
	// Auto-route: attached docs + vague/doc-check intake belongs to check,
	// not the ask generalist. The client mirrors this; the server is
	// authoritative so direct API calls get the same behavior.
	const hasDocs = documentIds.length > 0;
	// Substance tripwire (deterministic, no model, no vocabulary): the
	// user's text must contain at least one content token or there is
	// nothing to retrieve on. Only token-free noise fails here; relevance
	// is decided post-generation by answerAddressesQuestion. Replies are
	// drafted to the actual input, with the canned floor on any failure.
	if (!hasDocs && !hasSubstantiveContent([issue, ...history.map((h) => h.a ?? '')].join(' '))) {
		const lang: ResponseLang = langPref;
		event(trace, 'interview:conversational', 'no-substantive-content');
		const answer = await conversationalReply(issue, lang, { trace });
		return {
			question: null,
			questions: [],
			answer,
			answerPassages: [],
			lang,
			topic: 'general',
			title: fallbackTitle(issue),
			traceId: trace.id,
			timings: { totalMs: Date.now() - trace.startedAt },
			effectiveAgentId: agentId
		};
	}
	const effectiveAgent: AgentId =
		hasDocs && agentId === 'ask' && (isVagueIssue(issue) || hasDocCheckIntent(issue))
			? 'check'
			: agentId;
	if (effectiveAgent !== agentId)
		event(trace, 'interview:agent-route', `ask->check docs=${documentIds.length}`);
	// Query-independent doc preload: with a vague issue ("review this")
	// vector similarity over the issue returns arbitrary chunks. First
	// chunks in document order ground retrieval + drafting instead.
	let docExcerpts: Array<{ filename: string; content: string }> = [];
	if (hasDocs) {
		try {
			const rows = await fetchUserDocExcerpts(documentIds, 6);
			docExcerpts = rows.map((r) => ({ filename: r.filename, content: r.content }));
		} catch {
			docExcerpts = [];
		}
	}
	const enrichedBase =
		docExcerpts.length > 0 && isVagueIssue(issue)
			? `${issue} — attached document excerpt: ${docExcerpts[0]?.content.slice(0, 500)}`
			: issue;
	// Project scope: instructions join retrieval + drafting, never the chat title.
	const enrichedIssue = projectInstructions
		? `${enrichedBase}\n\nProject instructions: ${projectInstructions}`
		: enrichedBase;
	try {
		return await withPipelineTimeout(trace, async (signal) => {
			// Document check with the file attached needs no interview: the
			// user asked for a review ("review this" + PDF) and the document
			// carries the facts. Return an empty batch so the client goes
			// straight to the clause review instead of inventing
			// dispute-presupposing questions (e.g. tribunal deadlines the
			// user never mentioned). Check without attached files still
			// interviews (doc-focused questions / requestDocs path below).
			if (effectiveAgent === 'check' && hasDocs && history.length === 0) {
				const lang: ResponseLang = langPref;
				mark(trace, 'langMs');
				const [topic, title] = await Promise.all([
					classifyIssue(enrichedIssue.slice(0, 1000)).catch(() => 'general'),
					generateTitle(issue, history, { signal, trace, lang }).catch(() => fallbackTitle(issue))
				]);
				event(trace, 'interview:skipped', 'check-with-docs->review');
				return {
					question: null,
					questions: [],
					lang,
					topic,
					title,
					traceId: trace.id,
					timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
					effectiveAgentId: effectiveAgent
				};
			}
			// Advice intent on a fresh issue: a general legal question is
			// answered from the law, never interrogated and never planned.
			// Follow-ups stay free-form, so "what about X?" just works.
			// Fails open to the normal interview below on any trouble.
			if (history.length === 0) {
				const lang: ResponseLang = langPref;
				mark(trace, 'langMs');
				const advice = await detectAdviceQuestion(enrichedIssue, [], lang, {
					signal,
					trace
				}).catch(() => false);
				if (advice) {
					const [topic, title] = await Promise.all([
						classifyIssue(enrichedIssue.slice(0, 1000)).catch(() => 'general'),
						generateTitle(issue, history, { signal, trace, lang }).catch(() => fallbackTitle(issue))
					]);
					try {
						const follow = await runFollowUp({
							issue: enrichedIssue,
							history: [],
							plan: '',
							turns: [],
							message: enrichedIssue,
							langPref,
							agentId: effectiveAgent,
							documentIds,
							projectInstructions: ''
						});
						if (follow.answer.trim()) {
							event(trace, 'interview:skipped-advice', 'advice->answer');
							return {
								question: null,
								questions: [],
								answer: follow.answer,
								answerPassages: follow.passages,
								lang,
								topic,
								title,
								traceId: trace.id,
								timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
								effectiveAgentId: effectiveAgent
							};
						}
					} catch (e) {
						logError(trace, 'advice-answer', e);
					}
					// Answer pipeline failed: fall through to the normal
					// interview instead of stranding the user.
				}
			}
			// Dynamic plan first: the model (or deterministic fallback) decides
			// the interview steps for this agent; the executor follows them.
			// PLANNER_DYNAMIC=0 opts out to the legacy static path.
			if (process.env.PLANNER_DYNAMIC !== '0') {
				try {
					const bb = newBlackboard({
						issue: enrichedIssue,
						history,
						langPref,
						agentId: effectiveAgent,
						topK: 6,
						documentIds
					});
					// Pre-seed so law search sees the document even when the
					// executor runs searchLegal before searchUserDocs.
					if (docExcerpts.length > 0) {
						bb.rawUser = docExcerpts.map((d) => ({
							filename: d.filename,
							content: d.content.slice(0, 800)
						}));
						bb.userPassages = bb.rawUser;
					}
					const reactiveOpts = {
						agentId: effectiveAgent,
						extra: history.length > 0 ? `Answers so far: ${history.length}` : 'no answers yet',
						signal,
						trace
					};
					// Reactive retrieval (native tool-calling) + writer tail.
					// PLANNER_REACTIVE=0 opts out to the draft-then-execute path.
					const { plan, stepStatus, subagents } = isReactiveEnabled()
						? await runReactiveWithTail(bb, 'interview', enrichedIssue, reactiveOpts)
						: await (async () => {
								const p = await draftExecutionPlan('interview', enrichedIssue, reactiveOpts);
								const r = await executePlan(p, bb, { signal, trace });
								return { plan: p, stepStatus: r.stepStatus, subagents: r.subagents };
							})();
					bb.questions = bb.questions.filter(
						(q) =>
							!isEntailedBySource(q.text, enrichedIssue, history) &&
							!presupposesRequestedArtifact(q.text, enrichedIssue)
					);
					mark(trace, 'interviewMs');
					const [topic, title] = await Promise.all([
						classifyIssue(
							[enrichedIssue, ...history.map((h) => h.a)].join(' ').slice(0, 1000)
						).catch(() => bb.topic || 'general'),
						generateTitle(issue, history, { signal, trace, lang: bb.lang }).catch(() =>
							fallbackTitle(issue)
						)
					]);
					console.log(
						`[interview][${trace.id}] path=dynamic:${plan.dynamic ? 'llm' : 'static'} questions=${bb.questions.length} ` +
							trace.events
								.map((e) => (e.detail ? `${e.name}=${e.detail}` : e.name).slice(0, 120))
								.join(' | ')
								.slice(0, 600)
					);
					return {
						question: bb.questions[0] ?? null,
						questions: bb.questions,
						lang: bb.lang,
						topic,
						title,
						traceId: trace.id,
						timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
						executionPlan: plan,
						stepStatus,
						subagents,
						effectiveAgentId: effectiveAgent
					};
				} catch (e) {
					logError(trace, 'dynamic-interview', e);
					// fall through to the legacy static path below
				}
			}
			const lang: ResponseLang = langPref;
			mark(trace, 'langMs');
			// Fact-first batch interview (default; INTERVIEW_FACT_FIRST=0 opts out
			// to the legacy single-question path): one state extraction +
			// one batched draft instead of per-question draft/judge loops.
			const factFirst = process.env.INTERVIEW_FACT_FIRST !== '0';
			const [batch, topic, title] = await Promise.all([
				factFirst
					? planQuestionBatch(enrichedIssue, history, lang, {
							signal,
							trace,
							agentId: effectiveAgent
						})
					: nextQuestion(enrichedIssue, history, lang, undefined, { signal, trace }).then((q) =>
							q ? [q] : []
						),
				classifyIssue([enrichedIssue, ...history.map((h) => h.a)].join(' ').slice(0, 1000)).catch(
					() => 'general'
				),
				generateTitle(issue, history, { signal, trace, lang }).catch(() => fallbackTitle(issue))
			]);
			const filtered = batch.filter(
				(q) =>
					!isEntailedBySource(q.text, enrichedIssue, history) &&
					!presupposesRequestedArtifact(q.text, enrichedIssue)
			);
			if (filtered.length !== batch.length)
				event(
					trace,
					'interview:filtered-entailed',
					'dropped=' + String(batch.length - filtered.length)
				);
			mark(trace, 'interviewMs');
			// One terse server-console line per interview step: without this the
			// trace stays in memory and there is no way to tell which layer
			// (batch draft vs ladder backfill vs legacy) produced a question.
			console.log(
				`[interview][${trace.id}] path=${factFirst ? 'fact-first' : 'legacy'} questions=${filtered.length} ` +
					trace.events
						.map((e) => (e.detail ? `${e.name}=${e.detail}` : e.name).slice(0, 120))
						.join(' | ')
						.slice(0, 600)
			);
			return {
				question: filtered[0] ?? null,
				questions: factFirst ? filtered : undefined,
				lang,
				topic,
				title,
				traceId: trace.id,
				timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
				effectiveAgentId: effectiveAgent
			};
		});
	} catch (e) {
		logError(trace, 'interview', e);
		throw e;
	}
}

export function runInterviewStart(input: InterviewStartInput): Promise<InterviewResult> {
	return runInterview(
		[],
		input.issue,
		input.langPref,
		input.agentId,
		input.documentIds,
		input.projectInstructions
	);
}

export function runInterviewNext(input: InterviewNextInput): Promise<InterviewResult> {
	return runInterview(
		input.history,
		input.issue,
		input.langPref,
		input.agentId,
		input.documentIds,
		input.projectInstructions
	);
}

/**
 * Deterministic failure floor (no model; exported for unit testing): when
 * generation degenerates, the
 * user still gets their own facts back — issue, answers, attached files,
 * and the retrieved sources — plus a generic preparation way-forward that
 * states no law (file evidence, timeline, where to take the file). Never
 * invents legal conclusions: every legal claim quotes caller-provided data
 * or retrieved passage metadata; the way-forward steps are procedural only.
 */

/**
 * Matter-neutral failure floor. Content comes from retrieved passages,
 * never from a per-matter script: a guessed matter label once drove
 * accident steps (police abstract, P3, scene photos) for transfer delays
 * and dismissal hearings for car sales, and every new matter demanded a
 * new branch. Now the floor extracts what the passages say to keep, adds
 * a neutral spine, and stops. No passages -> the spine only. Anything the
 * passages do not state is never invented: no offices, no forums, no
 * procedures.
 */

/** Trailing "Keep ..." evidence sentences - the corpus convention for what to preserve. */
export function keepDirectives(passages: Array<{ title: string; content: string }>): string[] {
	const out: string[] = [];
	for (const p of passages.slice(0, 3)) {
		const sentences = String(p.content ?? '')
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.trim())
			.filter(Boolean);
		const keep = sentences.find((s) => /^keep\b/i.test(s));
		if (keep) out.push(`- ${p.title}: ${keep}`);
	}
	return out;
}

/** Ordered way forward: file first, passage-derived evidence, timeline, counsel. */
export function nextStepsFallback(sentDemand: boolean, keeps: string[]): string[] {
	const steps = [
		sentDemand
			? '1. File your demand/notice copy + delivery proof (date sent, how delivered, any reply) — you said you already sent one.'
			: '1. File dated copies of everything you already did (messages, letters, receipts, photos) in one folder.'
	];
	if (keeps.length > 0) {
		steps.push(`2. Gather what the sources above say to keep:\n${keeps.join('\n')}`);
		steps.push(
			'3. Write a one-page timeline: what happened, when, who was involved, and what proof you hold for each point.'
		);
		steps.push('4. Take that file to a paralegal/lawyer for the first formal step.');
	} else {
		steps.push(
			'2. Keep every agreement, receipt, message, photo and reference number together in one folder.'
		);
		steps.push(
			'3. Write a one-page timeline: what happened, when, who was involved, and what proof you hold for each point.'
		);
		steps.push('4. Take that file to a paralegal/lawyer for the first formal step.');
	}
	return steps;
}

/** Confirmation points derived from the retrieved passages only - no invented offices or forums. */
export function authorityChecks(passages: Array<{ title: string; citation: string }>): string {
	const items = passages
		.slice(0, 3)
		.map(
			(p) =>
				`- ${p.title} (${p.citation}): confirm what it requires and that it applies to this file.`
		);
	return [
		...items,
		'- Check the sources above for any time limit, forum, or office they name, and verify each against the current gazette.'
	].join('\n');
}

/** Generic deterministic letter instrument for the draft fallback floor.
 *  Matter-neutral: no per-topic branches. Works for ANY letter (demand,
 *  reply, complaint, notice) from instructed facts only. Never invents
 *  parties, dates, amounts, or admissions: unknown slots stay in
 *  [brackets] for counsel to settle. Shape satisfies `isDraftInstrument`
 *  (salutation + numbered paragraphs + signature/dated block) and keeps
 *  the legacy `Facts:` / `Relief and signature block` markers the
 *  contract tests expect. */
function sentenceCase(s: string): string {
	const t = s.trim().replace(/\s+/g, ' ');
	if (!t) return t;
	return t.charAt(0).toUpperCase() + t.slice(1);
}

function splitSentences(s: string, max = 4): string[] {
	const parts = (s.match(/[^.!?]+[.!?]+/g) ?? [s]).map((x) => x.trim()).filter(Boolean);
	return parts.slice(0, max);
}

/** Generic party slot: role-worded answers first, else a name-like value. */
function pickParty(substantive: Array<[string, string]>): string {
	for (const [k, v] of substantive) {
		if (/party|other|oppos|recipient|respondent|addressee/i.test(k)) {
			const val = String(v).trim().slice(0, 80);
			if (val && !/^(no|none|n\/a|not yet|never)$/i.test(val)) return val;
		}
	}
	for (const [, v] of substantive) {
		const m = String(v).match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}/);
		if (m) return m[0].slice(0, 80);
	}
	return '[Recipient name]';
}

function isReliefValue(v: string): boolean {
	return /\b(want|ask|request|seek|demand|need|pray)\b/i.test(v) && v.trim().length > 3;
}

function isPartyKey(k: string): boolean {
	return /party|other|oppos|recipient|respondent|addressee/i.test(k);
}

function isBareAnswer(v: string): boolean {
	return /^(yes|no|not yet|never|none|n\/a|no action)$/i.test(v.trim());
}

function pickRequest(issue: string, substantive: Array<[string, string]>): string {
	for (const [k, v] of substantive) {
		const val = String(v).trim();
		if (/want|relief|seek|outcome|pray/i.test(k) && val.length > 2)
			return sentenceCase(val.replace(/\.+$/, '')) + '.';
	}
	for (const [, v] of substantive) {
		const val = String(v).trim();
		if (isReliefValue(val)) return sentenceCase(val.replace(/\.+$/, '')) + '.';
	}
	const m = issue.match(
		/\b(want\b[^.!?]+|ask for[^.!?]+|request[^.!?]+|seeking[^.!?]+|asking for[^.!?]+)/i
	);
	if (m) return sentenceCase(m[0].replace(/\.+$/, '')) + '.';
	return 'Resolve this matter fairly and confirm your position in writing.';
}

/** Generic person shift only (no matter nouns): first-person instructions
 *  become counsel's third-person voice. */
function clientVoice(s: string): string {
	const out = s
		.replace(/\bMy\b/g, "Our client's")
		.replace(/\bmy\b/g, "our client's")
		.replace(/\bI have\b/g, 'Our client has')
		.replace(/\bI want\b/g, 'Our client wants')
		.replace(/\bI\b/g, 'Our client')
		.replace(/\bi\b/g, 'our client')
		.replace(/\bme\b/g, 'our client');
	return out.replace(/that Our client/g, 'that our client');
}

/** Generic yes/no-to-statement transforms over interrogative shape only. */
function statementFromQA(q: string, a: string): string | null {
	const ans = a.trim();
	if (!ans || isPartyKey(q)) return null;
	if (isReliefValue(ans)) return null;
	if (/want|relief|seek|outcome|pray/i.test(q) && ans.length > 2) {
		const lowered = ans.charAt(0).toLowerCase() + ans.slice(1);
		return `Our client seeks ${lowered.replace(/\.+$/, '')}.`;
	}
	const clean = q.replace(/\?+$/, '').trim();
	const patterns: Array<{
		re: RegExp;
		yes: (rest: string) => string;
		no: (rest: string) => string;
	}> = [
		{
			re: /^were you given\s+(.+)/i,
			yes: (r) => `Our client was given ${r}.`,
			no: (r) => `Our client was not given ${r}.`
		},
		{
			re: /^was there\s+(.+)/i,
			yes: (r) => `There was ${r}.`,
			no: (r) => `There was no ${r}.`
		},
		{
			re: /^is there\s+(.+)/i,
			yes: (r) => `There is ${r}.`,
			no: (r) => `There is no ${r}.`
		},
		{
			re: /^did you\s+(.+)/i,
			yes: (r) => `Our client did ${r}.`,
			no: (r) => `Our client did not ${r}.`
		},
		{
			re: /^have you\s+(.+)/i,
			yes: (r) => `Our client has ${r}.`,
			no: (r) => `Our client has not ${r}.`
		},
		{
			re: /^are you\s+(.+)/i,
			yes: (r) => `Our client is ${r}.`,
			no: (r) => `Our client is not ${r}.`
		}
	];
	for (const p of patterns) {
		const m = clean.match(p.re);
		if (m) {
			if (/^yes\b/i.test(ans)) return p.yes(m[1].trim());
			if (/^no\b/i.test(ans)) return p.no(m[1].trim());
			return null;
		}
	}
	if (!isBareAnswer(ans) && ans.length > 15) return `${sentenceCase(clean)}: ${ans}`;
	return null;
}

/** Generic subject: the issue's topic (request tail cut off), else the
 *  stated request. No matter keywords. */
function subjectFor(issue: string, requestRaw: string): string {
	const topic = issue
		.split(/\b[Ii] want\b/)[0]
		.replace(/\s+/g, ' ')
		.trim();
	const short = topic.length >= 20 ? topic : issue.replace(/\s+/g, ' ').trim();
	const cut = short.slice(0, 64);
	const atWord = cut
		.replace(/\s+\S*$/, '')
		.replace(/\b(to|a|an|the|of|for|and|or|in|on)\s*$/i, '')
		.trim();
	const base = sentenceCase(clientVoice(atWord.length >= 20 ? atWord : cut));
	if (/^(want|ask|request|seeking)\b/i.test(base)) {
		const req = requestRaw.replace(/\.+$/, '').trim();
		return sentenceCase(req.charAt(0).toLowerCase() + req.slice(1)).slice(0, 80);
	}
	return base;
}

function settledFacts(
	issue: string,
	substantive: Array<[string, string]>,
	party: string,
	requestRaw: string
): string[] {
	const out: string[] = [];
	for (const s of splitSentences(clientVoice(issue.replace(/\s+/g, ' ').trim()), 3)) {
		if (/^\s*(our client wants|our client seeks|i want|want\b)/i.test(s)) continue;
		if (s.length > 10) out.push(sentenceCase(s));
	}
	for (const [k, v] of substantive.slice(0, 6)) {
		const s = statementFromQA(k, String(v));
		if (s && !out.includes(sentenceCase(s))) out.push(sentenceCase(s));
		if (out.length >= 5) break;
	}
	if (party && !party.startsWith('[') && !out.some((l) => l.includes(party)))
		out.push(`The other party is ${party}.`);
	if (requestRaw && !out.some((l) => l.includes(requestRaw.replace(/\.+$/, ''))))
		out.push(`The relief sought is: "${requestRaw.replace(/\.+$/, '')}."`);
	return out.slice(0, 5);
}

function buildDraftInstrument(
	issue: string,
	substantive: Array<[string, string]>,
	passages: Passage[]
): string {
	const party = pickParty(substantive);
	const requestRaw = pickRequest(issue, substantive);
	const demandCore = requestRaw.replace(/\.+$/, '').trim();
	const demand = demandCore.charAt(0).toLowerCase() + demandCore.slice(1) + '.';
	const subject = subjectFor(issue, requestRaw);
	const date = new Date().toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
	const factParas = settledFacts(issue, substantive, party, requestRaw).slice(0, 3);
	const bodyParas = factParas.filter(
		(f) => !/other party is/i.test(f) && !/relief sought is/i.test(f)
	);
	const reliance =
		passages.length > 0
			? `We rely, among others, on ${passages
					.slice(0, 2)
					.map((p) => `${p.title} (${p.citation})`)
					.join(' and ')}.`
			: 'We shall verify the applicable provision before taking further steps.';
	const settled = settledFacts(issue, substantive, party, requestRaw);
	const paras: string[] = [
		`We act for our client [Client full name, ID/No. — to be confirmed]. We write with reference to the above matter on our client's instructions.`,
		...bodyParas.map((f) => `Our instructions are that ${f.charAt(0).toLowerCase() + f.slice(1)}`),
		`Our client's position is that the facts disclose a matter requiring your urgent response. ${reliance} Nothing herein admits any fact against our client's interest; liability, if any, is expressly denied save as stated.`,
		`The relief sought is: "${demand}" Time is of the essence.`,
		`TAKE NOTICE that unless we receive your substantive written response within seven (7) days of receipt of this letter, our client shall pursue such further remedies as counsel may advise, including filing before the competent forum, without further reference to you. Costs are reserved.`
	];
	const numbered = paras.map((p, i) => `${i + 1}. ${p}`).join('\n');
	const body =
		`[Your firm name | Address | Phone | Email]\n${date}\n\nTo: ${party}\nRe: ${subject}\n\nDear Sir/Madam,\n\n` +
		`${numbered}\n\n` +
		`Facts:\n${settled.map((v, i) => `${i + 1}. ${v.slice(0, 240)}`).join('\n') || '1. [No facts recorded — take full instructions before drafting]'}\n\n` +
		`Relief and signature block to be completed on filing or service.\n\n` +
		`Yours faithfully,\n\nSigned: ____________________\n[Advocate name, firm, signature]\nFor: [Client full name]\nDated at [Place] this [Date]`;
	return body;
}

type CheckClause = { index: number; text: string };

function splitCheckClauses(excerpts: string[]): CheckClause[] {
	const text = excerpts.join('\n');
	if (!text.trim()) return [];
	const normalized = text.replace(/\s+/g, ' ').trim();
	const withBreaks = normalized.replace(
		/(?<!\d)\b(\d{1,2})\.\s+(?=[A-Z][A-Z\s&'’-]{3,})/g,
		'\n$1. '
	);
	const parts = withBreaks
		.split(/\n\s*(?:\d+[.)]\s+|clause\s+\d+[:.]\s+)/i)
		.map((s) => s.trim())
		.filter((s) => s.length > 20)
		.slice(0, 20);
	if (parts.length > 1) {
		// Overlapping doc excerpts repeat the same clause: group by the
		// 60-char opening and keep the longest text, so the walk-through
		// numbers each clause once with its full wording.
		const best = new Map<string, string>();
		for (const t of parts) {
			const key = t.replace(/\s+/g, ' ').trim().slice(0, 60).toLowerCase();
			if (t.length > (best.get(key) ?? '').length) best.set(key, t);
		}
		return [...best.values()].slice(0, 20).map((t, i) => ({ index: i + 1, text: t.slice(0, 500) }));
	}
	// Unnumbered document: chunk into ~400-char windows so the fallback still
	// walks the file instead of printing 3 raw excerpts.
	const chunks: CheckClause[] = [];
	for (let i = 0; i < excerpts.length && chunks.length < 12; i++) {
		const c = (excerpts[i] ?? '').replace(/\s+/g, ' ').trim();
		if (c.length > 20) chunks.push({ index: chunks.length + 1, text: c.slice(0, 500) });
	}
	return chunks;
}

function rateCheckClause(t: string): 'High risk' | 'Medium risk' | 'Low risk' {
	const s = t.toLowerCase();
	if (
		/abandonment|surrender|termination by them|financially responsible|full legal and financial|neither .* will be accepted|no.*excuse|\$\d+\s*(late fee|per day)|additional \$\d+ per day|never.*applied to|forfeit|evict/i.test(
			t
		)
	)
		return 'High risk';
	if (
		/cleaning fee|security deposit|no interest|pet(-rent| application)?|utilities|deduct.*deposit|written (consent|permission)|without.*written|vehicles?|garage|trailer|notice|repair|fee|charge|fine/i.test(
			t
		) ||
		/\$\s?[\d,]+/.test(t)
	)
		return 'Medium risk';
	void s;
	return 'Low risk';
}

function checkClauseAdvice(t: string): string {
	if (/additional \$\d+ per day|late fee/i.test(t))
		return 'daily accrual adds up fast — ask for a cap and a cure period before late fees run.';
	if (/no.*excuse|neither ill health/i.test(t))
		return 'blanket no-excuses wording may be unenforceable — ask what hardship procedure applies.';
	if (/security deposit|no interest|within \d+ days/i.test(t))
		return 'photograph move-in/out condition and demand itemised deductions plus receipts in writing.';
	if (/cleaning fee/i.test(t))
		return 'agree a joint move-in cleanliness record so you do not pay for pre-existing dirt.';
	if (/abandonment|surrender/i.test(t))
		return 'deemed abandonment is disproportionate — ask to narrow it to wilful removal with notice to cure.';
	if (/financially responsible/i.test(t))
		return 'this shifts structural-repair cost to you — report defects in writing immediately and keep delivery proof.';
	if (/full legal and financial|fully understand/i.test(t))
		return 'do not sign until each flagged term below is answered in writing.';
	if (/pet/i.test(t))
		return 'confirm total monthly pet cost, who decides nuisance/dangerous, and get permission in writing.';
	if (/without.*written consent|written permission/i.test(t))
		return 'get every permission in writing before acting.';
	if (/personal check|cashier|money order|cash/i.test(t))
		return 'confirm an auditable payment method and keep receipts for every payment.';
	if (/utilit|deduct.*deposit|water|garbage|sewer|electricity|gas/i.test(t))
		return 'take meter readings and account-transfer dates in writing at move-in.';
	if (/vehicle|garage|trailer|boat/i.test(t))
		return 'confirm parking for your vehicles in writing.';
	if (/automatically|month-to-month|30 days/i.test(t))
		return 'calendar the non-renewal deadline or the term extends automatically.';
	return 'verify this wording against your copy before signing or paying.';
}

function quoteCheckClause(t: string): string {
	const clean = t.replace(/\s+/g, ' ').trim();
	const money = clean.match(/\$\s?[\d,]+(?:\.\d{2})?[^.]{0,60}/);
	const dated = clean.match(
		/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}[^.]{0,40}|\d+\s+days?[^.]{0,50}|at least \d+[^.]{0,50}/i
	);
	const key = money?.[0] ?? dated?.[0] ?? clean.slice(0, 140);
	return key.length > 180 ? `${key.slice(0, 180)}…` : key;
}

export function fallbackPlan(
	issue: string,
	answers: Record<string, string>,
	passages: Passage[],
	documentIds: string[],
	userFilenames: string[],
	agentId: unknown = 'ask',
	opts: { docExcerpts?: string[]; clauses?: Array<{ index: number; text: string }> } = {}
): string {
	// Check fallback ignores placeholder answers: with no interview the map
	// is just {Issue: "review the doc"} — printing that as "flagged clauses"
	// is the thin output to avoid. Only substantive answers count here.
	const substantive = Object.entries(answers).filter(([k, v]) => {
		const val = String(v ?? '').trim();
		if (!val) return false;
		if (k === 'Attached documents') return false;
		if (
			k === 'Issue' &&
			/^(review\s+(this|the\s+doc(ument)?)|review|please\s+review|check\s+this)/i.test(val)
		)
			return false;
		return true;
	});
	const userText = `${issue} ${Object.entries(answers)
		.map(([k, v]) => `${k} ${v}`)
		.join(' ')} ${(opts.docExcerpts ?? []).join(' ').slice(0, 2000)}`;
	// Same applicability gate as the model paths: inapplicable lines
	// (accident guidance for a transfer delay) never reach the floor.
	const applicable = filterApplicablePassages(userText, passages);
	const facts = substantive
		.map(([k, v]) => `- ${k}: ${v}`.slice(0, 300))
		.filter((l) => l.replace(/[^A-Za-z0-9]/g, '').length > 0)
		.join('\n');
	const sources = applicable
		.slice(0, 3)
		.map((q, i) => `${i + 1}. ${q.title} — ${q.citation}`)
		.join('\n');
	const docs =
		userFilenames.length > 0
			? userFilenames.join(', ')
			: documentIds.length > 0
				? `${documentIds.length} file(s) attached`
				: 'None provided yet — instructions, correspondence, receipts, and proof of service strengthen the file.';
	const docQuotes = (opts.docExcerpts ?? []).slice(0, 3).map((c) => `> ${c.slice(0, 280)}`);
	const lawText = applicable
		.slice(0, 3)
		.map((q) => `${q.title} ${q.content}`)
		.join('\n');
	// Conditional sections, same contract as the model path: deadlines only
	// when the retrieved law actually states time rules; risks only when
	// deadlines exist or the matter class is genuinely urgent. Otherwise
	// omit — a generic "act quickly" lecture is the filler to avoid.
	const hasTimeRules =
		/\b(deadline|period|limit|within|days?|weeks?|months?|notice)\b/i.test(lawText) ||
		(() => {
			// chrono arm (additive): an actual parsed date in the retrieved law
			// states a time rule even when none of the keywords appear.
			try {
				return chrono.parse(lawText.slice(0, 2000)).length > 0;
			} catch {
				return false;
			}
		})();
	const valueText = Object.values(answers).join(' ');
	const mentionsDocWord = /\b(demand|notice|letter)\b/i.test(
		`${issue} ${Object.keys(answers).join(' ')} ${valueText}`
	);
	const affirmsSend = /\b(yes|sent|delivered|served|gave|issued)\b/i.test(valueText);
	const deniesSend =
		/^\s*(no|not yet|never|none)\s*$/i.test(valueText.trim()) ||
		/\bwithout\s+(notice|demand|letter)\b/i.test(valueText);
	const sentDemand = mentionsDocWord && affirmsSend && !deniesSend;
	const nextSteps = nextStepsFallback(sentDemand, keepDirectives(applicable));
	const lawyerQuestions = authorityChecks(applicable);
	const isUrgentMatter =
		hasTimeRules ||
		/\b(evict|demolish|arrest|summons?|auction|disconnect|suspend|terminat|dismiss|injunct)\b/i.test(
			userText
		);
	const isCheck = normalizeAgentId(agentId) === 'check';
	const isDraft = normalizeAgentId(agentId) === 'draft';
	const checkClauses: CheckClause[] = isCheck
		? (opts.clauses ?? []).length > 0
			? (opts.clauses ?? []).slice(0, 20)
			: splitCheckClauses(opts.docExcerpts ?? [])
		: [];
	const moneyTerms = isCheck
		? [
				...new Set(
					((opts.docExcerpts ?? []).join(' ').match(/\$\s?[\d,]+(?:\.\d{2})?/g) ?? []).slice(0, 6)
				)
			]
		: [];
	const checkDocSummary =
		userFilenames.length > 0 || documentIds.length > 0
			? `${userFilenames.length > 0 ? userFilenames.join(', ') : `${documentIds.length} file(s) attached`} covers ${checkClauses.length > 0 ? `${checkClauses.length} numbered clause(s)` : 'your attached file'}${
					moneyTerms.length > 0 ? ` — key money terms found: ${moneyTerms.join(', ')}` : ''
				}. Verify every quote below against your copy before signing or paying.`
			: 'No document attached yet. Attach the agreement so each clause can be checked.';
	const checkRisky =
		checkClauses.length > 0
			? `${facts ? `Your answers:\n${facts}\n\n` : ''}Walk-through in document order (verify each quote against your copy):\n${checkClauses
					.map(
						(c) =>
							`**${rateCheckClause(c.text)}** — Clause ${c.index}: "${quoteCheckClause(c.text)}" — ${checkClauseAdvice(c.text)}`
					)
					.join(
						'\n'
					)}\n${sources ? `Compare against these sources:\n${sources}` : 'No legal passages were retrieved — confirm the authorities are still current and apply independent professional judgment before signing or filing.'}`
			: `${
					facts
						? `Clauses flagged from your answers (verify against your copy):\n${facts}`
						: (opts.docExcerpts ?? []).length > 0
							? `Key terms found in your file (verify against your copy):\n${(
									opts.docExcerpts ?? []
								)
									.slice(0, 6)
									.map((c) => `> ${c.slice(0, 280)}`)
									.join('\n')}`
							: 'List each clause you are unsure about and verify it against your copy.'
				}\n${sources ? `Compare against these sources:\n${sources}` : 'No passages retrieved. Confirm the authorities are still current before filing.'}`;
	// Draft fallback: the model path promises the ACTUAL instrument, so the
	// deterministic floor keeps that shape — material as instructed in
	// numbered paragraphs, relief, verification/signature — with blanks
	// where counsel must settle. Never invents parties, dates, prayers,
	// or admissions; quotes instructed material only.
	const draftReply = buildDraftInstrument(issue, substantive, applicable);
	const draftAttachments = `Attach: ${userFilenames.length > 0 ? userFilenames.join(', ') : 'instructions, correspondence, receipts, and proof of service'}.\nNext: settle the draft, then file or serve per forum rules and keep proof.`;
	const draftIssues =
		'Whether the facts disclose a cause of action or defence, and what relief or response is available.';
	const sections = [
		`## Facts\n${issue}`,
		...(isCheck
			? [
					`## Document\n${checkDocSummary}${docQuotes.length > 0 && checkClauses.length === 0 ? `\nExcerpts from your file (verify against your copy):\n${docQuotes.join('\n')}` : ''}`,
					`## Clauses\n${checkRisky}`
				]
			: isDraft
				? [
						`## Issues\n${draftIssues}`,
						`## Law\n${sources ? `Start with these sources (full memo unavailable right now):\n${sources}` : 'No passages retrieved. Confirm the authorities are still current before filing.'}`,
						`## Draft\n${draftReply}`,
						`## Attachments\n${draftAttachments}`,
						`## Next Steps\n${facts ? `Your answers so far:\n${facts}\n` : 'Write down what happened, when, and who was involved.\n'}\nWay forward — do these in order:\n${nextSteps.join('\n')}`
					]
				: [
						`## Law\n${sources ? `Start with these sources (full memo unavailable right now):\n${sources}` : 'No passages retrieved. Confirm the authorities are still current before filing.'}`,
						`## Next Steps\n${facts ? `Your answers so far:\n${facts}\n` : 'Write down what happened, when, and who was involved.\n'}\nWay forward — do these in order:\n${nextSteps.join('\n')}\nKeep every document listed below together for your file.`
					])
	];
	if (hasTimeRules)
		sections.push(
			'## Deadlines\nVerify the time limits in the sources above against the current gazette; delay can bar the claim.'
		);
	sections.push(`## Authorities\n${lawyerQuestions}`);
	// Counsel memo: no lay referral block. Open items carry the remaining checks.
	if (isUrgentMatter)
		sections.push(
			'## Urgent\nAct promptly so limitation periods do not expire and evidence stays fresh.'
		);
	sections.push(
		`## Note\nConfirm the authorities are still current before filing, serving, or advising the client. Attached documents considered: ${docs}`
	);
	return sections.join('\n\n');
}

export async function runPlanPipeline(input: PlanInput): Promise<PlanResult> {
	const trace = newTrace();
	try {
		return await withPipelineTimeout(trace, async (signal) => {
			const answerMap: Record<string, string> = {};
			for (const q of input.questions) {
				if (!q || typeof q.id !== 'string' || typeof q.text !== 'string') continue;
				const v = input.answers[q.id];
				answerMap[q.text] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
			}
			if (input.questions.length === 0 && input.issue) answerMap['Issue'] = input.issue;
			// Auto-route + doc preload shared with the interview path: vague
			// intake with attached files belongs to check, and the query must
			// carry document terms or law retrieval answers "review this".
			const hasDocs = input.documentIds.length > 0;
			const effectiveAgent: AgentId =
				hasDocs &&
				input.agentId === 'ask' &&
				(isVagueIssue(input.issue) || hasDocCheckIntent(input.issue))
					? 'check'
					: input.agentId;
			const warnings: string[] = [];
			if (effectiveAgent !== input.agentId) {
				warnings.push('agent-routed:ask->check');
				event(trace, 'plan:agent-route', `ask->check docs=${input.documentIds.length}`);
			}
			let docExcerpts: Array<{ filename: string; content: string }> = [];
			if (hasDocs) {
				try {
					const rows = await fetchUserDocExcerpts(input.documentIds, 6);
					docExcerpts = rows.map((r) => ({ filename: r.filename, content: r.content }));
				} catch {
					docExcerpts = [];
				}
			}
			const docTerms = docExcerpts
				.map((d) => d.content)
				.join(' ')
				.slice(0, 600);
			const enrichedIssue = input.projectInstructions
				? `${docExcerpts.length > 0 && isVagueIssue(input.issue) ? `${input.issue} ${docTerms.slice(0, 500)}` : input.issue}\n\nProject instructions: ${input.projectInstructions}`
				: docExcerpts.length > 0 && isVagueIssue(input.issue)
					? `${input.issue} ${docTerms.slice(0, 500)}`
					: input.issue;
			if (process.env.PLANNER_DYNAMIC !== '0') {
				try {
					const bb = newBlackboard({
						issue: enrichedIssue,
						answers: answerMap,
						langPref: input.langPref,
						agentId: effectiveAgent,
						topK: input.topK,
						documentIds: input.documentIds
					});
					if (docExcerpts.length > 0) {
						bb.rawUser = docExcerpts.map((d) => ({
							filename: d.filename,
							content: d.content.slice(0, 800)
						}));
						bb.userPassages = bb.rawUser;
					}
					const reactiveOpts = {
						agentId: effectiveAgent,
						extra: `answers=${Object.keys(answerMap).length} docs=${input.documentIds.length}`,
						signal,
						trace
					};
					// Reactive retrieval (native tool-calling) + writer tail.
					// PLANNER_REACTIVE=0 opts out to the draft-then-execute path.
					const { plan, stepStatus, subagents } = isReactiveEnabled()
						? await runReactiveWithTail(bb, 'plan', enrichedIssue, reactiveOpts)
						: await (async () => {
								const p = await draftExecutionPlan('plan', enrichedIssue, reactiveOpts);
								const r = await executePlan(p, bb, { signal, trace });
								return { plan: p, stepStatus: r.stepStatus, subagents: r.subagents };
							})();
					mark(trace, 'planMs');
					const topic =
						bb.topic !== 'general'
							? bb.topic
							: await classifyIssue(enrichedIssue).catch(() => 'general');
					if (!bb.plan) {
						bb.plan = fallbackPlan(
							input.issue,
							answerMap,
							bb.passages,
							input.documentIds,
							[...new Set(bb.rawUser.map((p) => p.filename))],
							effectiveAgent,
							{
								docExcerpts: bb.rawUser.map((u) => u.content),
								clauses: bb.clauses
							}
						);
						bb.warnings.push('model-fallback');
					}
					for (const w of warnings) if (!bb.warnings.includes(w)) bb.warnings.push(w);
					await savePlan(input.issue, answerMap, bb.plan).catch((e) =>
						logError(trace, 'savePlan', e)
					);
					console.log(
						`[plan][${trace.id}] path=dynamic:${plan.dynamic ? 'llm' : 'static'} agent=${effectiveAgent} steps=${plan.steps.length}`
					);
					return {
						plan: bb.plan,
						passages: bb.passages,
						userPassages: bb.userPassages,
						topic,
						lang: bb.lang,
						traceId: trace.id,
						timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
						warnings: bb.warnings,
						executionPlan: plan,
						stepStatus,
						subagents
					};
				} catch (e) {
					logError(trace, 'dynamic-plan', e);
					// fall through to the legacy static path below
				}
			}
			const lang: ResponseLang = input.langPref;
			mark(trace, 'langMs');

			// Select: open retrieval first — never let a guessed topic starve
			// the vector/FTS legs. Topic is display-only, derived from what
			// retrieval actually found. classifyIssue runs only as a
			// fallback label, off the retrieval critical path.
			// Agent boost: append agent terms so Check/Draft retrieve the
			// right procedures without hard topic filters.
			// Doc terms: a vague issue ("review this") retrieves noise, so
			// the preloaded excerpts join the query.
			const agentCfg = agentConfig(effectiveAgent);
			const query = buildRetrievalQuery([
				enrichedIssue,
				...Object.values(answerMap),
				docTerms,
				agentCfg.retrievalBoost
			]);
			let passages: Passage[];
			try {
				passages = await searchLegal(query, input.topK, undefined, { signal }, trace);
			} catch (e) {
				logError(trace, 'search', e);
				passages = [];
			}
			mark(trace, 'searchMs');
			const derived = deriveTopic(passages);
			let topic = derived;
			if (topic === 'general') {
				try {
					topic = await classifyIssue(enrichedIssue);
				} catch {
					topic = 'general';
				}
				mark(trace, 'classifyMs');
			}
			if (trace) event(trace, 'pipeline:topic', `topic=${topic}`);

			let userPassages: Array<{ filename: string; content: string }> = [];
			let rawUser: Array<{ filename: string; content: string }> = [];
			if (input.documentIds.length > 0) {
				try {
					const rows = await searchUserDocuments(query, input.documentIds, 4);
					rawUser = rows.map((p) => ({
						filename: p.filename,
						content: p.content.slice(0, 800)
					}));
					// Vague-query fallback: vector search over "review this"
					// can miss; ordered excerpts never come back empty.
					if (rawUser.length === 0 && docExcerpts.length > 0) {
						rawUser = docExcerpts.map((d) => ({
							filename: d.filename,
							content: d.content.slice(0, 800)
						}));
					}
					userPassages = rawUser.length > 0 ? rawUser : docExcerpts;
				} catch (e) {
					logError(trace, 'user-docs', e);
					rawUser =
						docExcerpts.length > 0
							? docExcerpts.map((d) => ({ filename: d.filename, content: d.content.slice(0, 800) }))
							: [];
					userPassages = rawUser;
				}
				answerMap['Attached documents'] = input.documentIds.length + ' file(s) attached';
			}
			mark(trace, 'userDocsMs');

			let plan: string;
			try {
				plan = await generatePlan(
					input.issue,
					answerMap,
					passages,
					rawUser.map((u) => ({
						id: '',
						documentId: '',
						filename: u.filename,
						content: u.content,
						score: 0
					})),
					lang,
					{ signal, trace, agentId: effectiveAgent }
				);
			} catch (e) {
				logError(trace, 'generatePlan', e);
				warnings.push('model-fallback');
				plan = fallbackPlan(
					input.issue,
					answerMap,
					passages,
					input.documentIds,
					[...new Set(rawUser.map((p) => p.filename))],
					effectiveAgent,
					{ docExcerpts: rawUser.map((u) => u.content) }
				);
			}
			mark(trace, 'planMs');
			await savePlan(input.issue, answerMap, plan).catch((e) => logError(trace, 'savePlan', e));
			return {
				plan,
				passages,
				userPassages,
				topic,
				lang,
				traceId: trace.id,
				timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
				warnings
			};
		});
	} catch (e) {
		logError(trace, 'pipeline', e);
		// Never 500 the plan endpoint: return the deterministic failure
		// floor (user facts + generic way-forward, no invented law) so the
		// UI always gets a usable plan with a warning instead of an error.
		// This covers pipeline timeouts, malformed question payloads, and
		// any other unexpected failure outside the inner fallbacks.
		try {
			const safeAnswers: Record<string, string> = {};
			try {
				for (const q of input.questions ?? []) {
					if (!q || typeof q.id !== 'string' || typeof q.text !== 'string') continue;
					const v = (input.answers as Record<string, unknown>)?.[q.id];
					safeAnswers[q.text] = Array.isArray(v)
						? v.map(String).join(', ').slice(0, 2000)
						: String(v ?? '').slice(0, 2000);
				}
				if (Object.keys(safeAnswers).length === 0 && input.issue)
					safeAnswers['Issue'] = String(input.issue).slice(0, 4000);
			} catch {
				if (input.issue) safeAnswers['Issue'] = String(input.issue).slice(0, 4000);
			}
			const warnings = ['pipeline-fallback'];
			if (e instanceof Error && /timed out/i.test(e.message)) warnings.push('timeout-fallback');
			const agent = normalizeAgentId((input as { agentId?: unknown }).agentId);
			const plan = fallbackPlan(
				String(input.issue ?? ''),
				safeAnswers,
				[],
				Array.isArray((input as { documentIds?: unknown }).documentIds)
					? (input.documentIds as string[]).map(String).slice(0, 5)
					: [],
				[],
				agent
			);
			await savePlan(String(input.issue ?? ''), safeAnswers, plan).catch((se) =>
				logError(trace, 'savePlan', se)
			);
			return {
				plan,
				passages: [],
				userPassages: [],
				topic: 'general',
				lang: input.langPref,
				traceId: trace.id,
				timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
				warnings
			};
		} catch {
			throw e;
		}
	}
}

export interface FollowUpPromptInput {
	issue: string;
	facts: string[];
	plan: string;
	turns: FollowUpTurn[];
	message: string;
	passages: Passage[];
	lang: ResponseLang;
	agentId?: AgentId;
}

/** Strict sequel for the follow-up retry: short, cite-every-sentence. */
const FOLLOWUP_STRICT_SUFFIX =
	'\n\nPrevious draft was rejected for missing citations. Answer again in at most 6 short sentences. Every sentence stating Kenyan law MUST end with an [n] marker pointing at a passage above.';

/**
 * Extractive grounded floor: the top passages quoted directly, each
 * sentence carrying its own passage number. Grounded by construction —
 * verbatim quotes always survive the citation verifiers — so a model
 * answer that fails the coverage floor degrades to the sources speaking
 * for themselves instead of the honest-but-useless "could not put
 * together" fallback. Capped at a few sentences; the confirm footer is
 * procedural, never law.
 */
export function extractiveAnswer(passages: Passage[], maxSentences = 6): string {
	const picked: string[] = [];
	const cap = Math.max(1, Math.min(8, Math.floor(maxSentences)));
	for (let i = 0; i < passages.length && picked.length < cap; i++) {
		const content = String(passages[i]?.content ?? '');
		const sentences = content
			.split(/(?<=[.!?])\s+/)
			.map((s) => s.replace(/\s+/g, ' ').trim())
			.filter((s) => s.length >= 24 && s.length <= 400 && /[a-zA-Z]/.test(s));
		for (const s of sentences.slice(0, 2)) {
			if (picked.length >= cap) break;
			picked.push(`${s} [${i + 1}]`);
		}
	}
	const body = picked.join(' ');
	return `${body}\n\nConfirm before acting: whether the law above is still current (gazette, case law). Apply independent professional judgment.`;
}

/**
 * Strip passage-header echoes: the small model sometimes answers by copying
 * the packed `[n] Title — Citation` header lines instead of writing
 * sentences. A header names a source; it states no law and answers nothing
 * (live repro: a title list passed the coverage floor via title overlap,
 * then died at the relevance gate). Headers are matched as spans and cut
 * wherever they appear — the packed prompt puts no sentence break between
 * a header and its content, so whole-segment matching misses them.
 */
function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripPassageHeaderEchoes(
	text: string,
	passages: Array<{ title: string; citation: string }>
): string {
	if (!text || passages.length === 0) return text ?? '';
	let out = String(text);
	for (const p of passages) {
		const t = String(p.title ?? '').trim();
		const c = String(p.citation ?? '').trim();
		if (t.length < 8 || c.length < 4) continue;
		// With marker: "[2] Title — Citation".
		const marked = new RegExp(
			`\\[\\d+\\]\\s*${escapeRegExp(t)}\\s*[—–\\-:;,.]*\\s*${escapeRegExp(c)}`,
			'gi'
		);
		out = out.replace(marked, '');
		// Bare: "Title — Citation".
		const bare = new RegExp(`${escapeRegExp(t)}\\s*[—–\\-:]\\s*${escapeRegExp(c)}`, 'gi');
		out = out.replace(bare, '');
	}
	return out
		.replace(/ {2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.split('\n')
		.map((line) => line.replace(/^[.\s,;]+/, '').trimEnd())
		.filter((line, i, arr) => line.trim().length > 0 || (arr[i - 1]?.trim() && arr[i + 1]?.trim()))
		.join('\n')
		.trim();
}

/** Explicit drafting intent only: a draft verb in the follow-up message plus a
 *  document noun in message or issue. Bare legal nouns ("notice", "reply",
 *  "response", "complaint") without a draft verb are advice questions, not
 *  drafting requests. Exported for unit testing. */
export function detectDraftIntent(message: string, issue: string): boolean {
	const hasDraftVerb =
		/\b(draft|write|prepare|compose|create|generate|redraft|rewrite)\b/i.test(message) ||
		/\b(help me|need help|assist me)\b.{0,40}\b(write|draft|prepare|reply|respond)\b/i.test(
			message
		) ||
		/\b(andika|tayarisha|tunga)\b/i.test(message);
	if (!hasDraftVerb) return false;
	return /\b(letter|demand|reply|notice|petition|complaint|response|plaint|defen[cs]e|affidavit|agreement|memo|application|statement|barua)\b/i.test(
		`${message} ${issue}`
	);
}

/** Pure prompt builder, exported for unit testing. Compress budgets enforced here. */
export function buildFollowUpPrompt(p: FollowUpPromptInput): string {
	const langLine =
		p.lang === 'sw'
			? 'Respond ENTIRELY in Kiswahili (Kiswahili sanifu) — even though the user wrote in English. Every sentence must be Kiswahili; never answer in English. Keep titles and citations in their original language. Be direct.'
			: 'Respond entirely in English. Be direct. Refer to the client in third person.';
	// Compress: freshest turns only (distraction), fixed windows (select).
	const convo = p.turns
		.slice(-CONTEXT_BUDGETS.FOLLOWUP_TURNS)
		.map((t) => `${t.role === 'assistant' ? 'Assistant' : 'User'}: ${t.content.slice(0, 500)}`)
		.join('\n');
	const facts = p.facts.join('\n').slice(0, CONTEXT_BUDGETS.FOLLOWUP_FACTS) || 'None.';
	const plan = p.plan.slice(0, CONTEXT_BUDGETS.FOLLOWUP_PLAN) || 'None yet.';
	// Isolate: ranked passages packed to budget; user docs are claims, law is verified.
	const packedLaw = packPassages(p.passages, CONTEXT_BUDGETS.FOLLOWUP_PASSAGES) || 'None.';
	const agentLine = p.agentId ? agentConfig(p.agentId).followupDirective : '';
	const wantsLetter = detectDraftIntent(p.message, p.issue);
	// Procedural how-to ("how do I start...", "steps to register...") needs
	// action-order prose, not the flat position/exception/confirm shape:
	// each requirement in order, each grounded in the passages. Steps the
	// passages do not support are omitted rather than written uncited, so
	// the citation floor below keeps the guide instead of replacing it
	// with the thin sources-only fallback.
	const wantsGuide = !wantsLetter && isProceduralHowTo(p.message);
	const taskLine = wantsLetter
		? " Write the ACTUAL letter now: To/Re/Dear Sir/Madam header, numbered paragraphs stating ONLY instructed facts from COUNSEL'S INSTRUCTIONS, INSTRUCTED FACTS, and CONVERSATION — never invent names, dates, places, amounts, or agreement terms, and never copy example templates. Leave anything unknown as [brackets]. Include a clear request with a 7-day response deadline, and a signature/dated block. Do not write instructions about drafting."
		: wantsGuide
			? ' Answer in the order the user must act: state each requirement grounded in the VERIFIED LEGAL PASSAGES above, each with its [n] citation, omitting anything the passages do not cover rather than writing uncited steps. End with what to confirm (whether the law is still current, gazette, fees, case law). Begin directly with the answer; do not restate the question. Do NOT write a letter (no To/Re/Dear Sir/Madam header) unless the user explicitly asked for one.'
			: " Answer ONLY the follow-up: give the direct position or requirements first, each with its [n] citation; then state any exception or opposing position the passages support; then end with what to confirm (whether the law is still current, gazette, case law, missing facts). Begin directly with the answer; do not restate the user's question. Every sentence stating Kenyan LAW must end with an [n] marker pointing at a VERIFIED LEGAL PASSAGE above that supports that exact sentence — sentences about the user's own story need no marker. Do NOT write a letter (no To/Re/Dear Sir/Madam header) unless the user explicitly asked for one.";
	return `You are Hakili, an offline assistant for an advocate in Kenya. ${langLine}${agentLine} A memo is already on file.${taskLine} Cite passages by number only when a passage supports the claim. Never invent names, places, amounts, dates, or legal conclusions. If the facts and passages do not cover the question, say so briefly and state what to confirm (whether the law is still current, gazette, case law). Client files are instructions and evidence, not law — attribute by filename, never cite it as law.

COUNSEL'S INSTRUCTIONS:
${p.issue.slice(0, CONTEXT_BUDGETS.FOLLOWUP_ISSUE)}

INSTRUCTED FACTS:
${facts}

MEMO SO FAR:
${plan}

CONVERSATION SO FAR:
${convo || 'None.'}

VERIFIED LEGAL PASSAGES:
${packedLaw}

FOLLOW-UP QUESTION:
${p.message.slice(0, 500)}`;
}

export function fallbackFollowUp(message: string, passages: Passage[], lang: ResponseLang): string {
	const short = message.length > 200 ? `${message.slice(0, 200)}…` : message;
	const srcs = passages
		.slice(0, 2)
		.map((p) => `- ${p.title} — ${p.citation}`)
		.join('\n');
	// No passages: omit the sources line rather than printing an empty
	// list — an honest miss, never invented law.
	if (srcs.length === 0) {
		if (lang === 'sw') {
			return `Samahani, sikuweza kutayarisha jibu kamili kwa swali ("${short}") hivi sasa. Jaribu kuuliza tena, au taja unachotaka kuthibitisha (usasa wa mamlaka, gazeti). Tumia uamuzi huru wa kitaaluma.`;
		}
		return `I could not put together a full answer to "${short}" right now. Try asking again, or state what to confirm (whether the law is still current, gazette, case law). Apply independent professional judgment.`;
	}
	if (lang === 'sw') {
		return `Samahani, sikuweza kutayarisha jibu kamili kwa swali ("${short}") hivi sasa. Vyanzo hivi vinaonekana kuhusiana:\n${srcs}\n\nJaribu kuuliza tena, au taja unachotaka kuthibitisha (usasa wa mamlaka, gazeti). Tumia uamuzi huru wa kitaaluma.`;
	}
	return `I could not put together a full answer to "${short}" right now. These sources look relevant:\n${srcs}\n\nTry asking again, or state what to confirm (whether the law is still current, gazette, case law). Apply independent professional judgment.`;
}

export interface FollowUpResult {
	answer: string;
	passages: Passage[];
	lang: ResponseLang;
	traceId: string;
	timings: Record<string, number>;
	executionPlan?: import('./planner/types.ts').ExecutionPlan;
	stepStatus?: Record<string, import('./planner/types.ts').PlanStepStatus>;
	subagents?: import('./planner/types.ts').SubagentRun[];
}

export async function runFollowUp(input: FollowUpInput): Promise<FollowUpResult> {
	const trace = newTrace();
	// Substance tripwire: same rule as the interview path. Token-free
	// inputs never reach retrieval; the reply is drafted to the input.
	if (!hasSubstantiveContent(`${input.message} ${input.issue}`)) {
		const lang: ResponseLang = input.langPref;
		event(trace, 'followup:conversational', 'no-substantive-content');
		return {
			answer: await conversationalReply(input.message, lang, { trace }),
			passages: [],
			lang,
			traceId: trace.id,
			timings: { totalMs: Date.now() - trace.startedAt }
		};
	}
	try {
		return await withPipelineTimeout(trace, async (signal) => {
			const facts = input.history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`.trim()).filter(Boolean);
			// Project scope: instructions join retrieval + answering.
			const scopedIssue = input.projectInstructions
				? `${input.issue}\n\nProject instructions: ${input.projectInstructions}`
				: input.issue;
			const plan =
				process.env.PLANNER_DYNAMIC !== '0'
					? await draftExecutionPlan('followup', input.message, {
							agentId: input.agentId,
							extra: input.issue.slice(0, 200),
							signal,
							trace
						}).catch(() => null)
					: null;
			const lang: ResponseLang = input.langPref;
			// Kiswahili containment: draft in English, translate at the end.
			const wantSw = lang === 'sw';
			mark(trace, 'langMs');
			// Open retrieval: topic never filters the legs (display-only).
			const agentFollowCfg = agentConfig(input.agentId);
			// Procedural how-to needs procedure/office/fee passages, not
			// dispute remedy ones: bias the query with generic procedure
			// terms (no matter vocabulary) so the guide steps have support.
			const proceduralBoost = isProceduralHowTo(input.message)
				? 'procedure requirements steps office fee permit registration'
				: '';
			const query = buildRetrievalQuery([
				input.message,
				scopedIssue,
				...facts.slice(-4),
				proceduralBoost,
				agentFollowCfg.retrievalBoost
			]);
			let passages: Passage[];
			try {
				passages = await searchLegal(query, 10, undefined, { signal }, trace);
			} catch (e) {
				logError(trace, 'search', e);
				passages = [];
			}
			mark(trace, 'searchMs');
			let answer = '';
			const basePrompt = buildFollowUpPrompt({
				issue: scopedIssue,
				facts,
				plan: input.plan,
				turns: input.turns,
				message: input.message,
				passages,
				lang: 'en',
				agentId: input.agentId
			});
			try {
				answer = (
					await completeText(basePrompt, { predict: 1000, signal, model: 'followup' }, trace)
				).trim();
			} catch (e) {
				logError(trace, 'followup', e);
			}
			// Deterministic answer floor. Shippable = grounded (citation
			// coverage) AND relevant (shares content with the question).
			// Anything else degrades with evidence on hand: header echoes
			// are stripped first (title lists state no law), a failed first
			// draft gets one strict retry, and the last resort is the
			// extractive floor — top passages quoted directly — checked for
			// relevance itself. The honest "could not put together"
			// fallback is only for empty retrieval, never for failed
			// drafting (live repros: hedging with no sources; a title list
			// that passed coverage then died at relevance).
			const queryParts = [input.message, scopedIssue, ...facts];
			const groundAnswer = (text: string): string =>
				verifyCitations(
					verifyQuoteSpans(
						assignCitations(stripPassageHeaderEchoes(text, passages), 'en', passages),
						passages
					),
					passages.length
				);
			const shippable = (text: string): boolean =>
				text.trim().length > 0 &&
				citationCoverage(text, passages) >= 0.15 &&
				answerAddressesQuestion(text, queryParts);
			let usedFallback = false;
			if (answer) {
				answer = groundAnswer(answer);
				if (!shippable(answer) && passages.length > 0 && !signal?.aborted) {
					event(trace, 'followup:retry', 'strict-citations');
					try {
						const retry = (
							await completeText(
								`${basePrompt}${FOLLOWUP_STRICT_SUFFIX}`,
								{ predict: 600, signal, model: 'followup' },
								trace
							)
						).trim();
						if (retry) answer = groundAnswer(retry);
					} catch (e) {
						logError(trace, 'followup-retry', e);
					}
				}
			}
			if (!shippable(answer)) {
				if (passages.length > 0) {
					const ext = extractiveAnswer(passages);
					if (answerAddressesQuestion(ext, queryParts)) {
						event(trace, 'followup:extractive-fallback', `passages=${passages.length}`);
						answer = ext;
					} else {
						event(trace, 'followup:uncited-fallback', 'coverage-low');
						answer = fallbackFollowUp(input.message, passages, lang);
						usedFallback = true;
					}
				} else {
					event(trace, 'followup:uncited-fallback', 'coverage-low');
					answer = fallbackFollowUp(input.message, passages, lang);
					usedFallback = true;
				}
			}
			if (!answer) {
				answer = fallbackFollowUp(input.message, passages, lang);
				usedFallback = true;
			} else if (wantSw && !usedFallback) {
				const translated = await translateTextToSwahili(answer, { signal, trace });
				if (translated) answer = translated;
				else if (trace) event(trace, 'followup:sw-fallback', 'kept-english');
			}
			// Post-translation relevance guard: translation can garble even a
			// good answer. Same policy as above — extractive when evidence
			// is on hand, conversational only with none.
			if (
				!usedFallback &&
				!answerAddressesQuestion(answer, [input.message, scopedIssue, ...facts])
			) {
				event(trace, 'followup:off-topic-fallback', 'no-query-overlap');
				if (passages.length > 0) {
					const ext = extractiveAnswer(passages);
					answer = answerAddressesQuestion(ext, [input.message, scopedIssue, ...facts])
						? ext
						: fallbackFollowUp(input.message, passages, lang);
				} else {
					answer = await conversationalReply(input.message, lang, { signal, trace });
					passages = [];
				}
			}
			mark(trace, 'followupMs');
			// Honest step statuses: the follow-up path runs law
			// retrieval and grounded answering only. Any
			// other drafted steps (extractState, draftQuestions, …) never
			// ran — mark them skipped so the Plan element never claims
			// progress it did not make.
			const RAN_TOOLS = new Set(['searchLegal', 'searchUserDocs', 'generatePlan']);
			const stepStatus: Record<string, import('./planner/types.ts').PlanStepStatus> | undefined =
				plan
					? Object.fromEntries(
							plan.steps.map((s): [string, import('./planner/types.ts').PlanStepStatus] => [
								s.id,
								RAN_TOOLS.has(s.tool) ? 'done' : 'skipped'
							])
						)
					: undefined;
			const subagents = plan
				? [
						{
							id: 'retrieval-run',
							name: 'retrieval',
							task: 'Search Kenyan law for the follow-up',
							status: 'done' as const,
							tools: [
								{
									tool: 'searchLegal' as const,
									title: `Searched law (${passages.length} passages)`,
									status: 'done' as const
								}
							]
						}
					]
				: undefined;
			return {
				answer,
				passages,
				lang,
				traceId: trace.id,
				timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
				executionPlan: plan ?? undefined,
				stepStatus,
				subagents
			};
		});
	} catch (e) {
		logError(trace, 'followup', e);
		throw e;
	}
}
