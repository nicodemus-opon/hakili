/** Streaming pipeline runners: status + token SSE events, same gates as pipeline.ts. */
import { fetchUserDocExcerpts, searchUserDocuments } from '../documents.ts';
import { streamText } from './llm.ts';
import { buildRetrievalQuery } from './context.ts';
import { newTrace, mark, logError, event } from './observability.ts';
import {
	assignCitations,
	citationCoverage,
	verifyCitations,
	verifyQuoteSpans
} from './plan/validator.ts';
import { translateTextToSwahili } from './language.ts';
import { classifyIssue, deriveTopic, searchLegal } from './retrieval.ts';
import { generatePlan, savePlan } from './plan/generator.ts';
import { agentConfig, normalizeAgentId } from './agents.ts';
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
import {
	buildFollowUpPrompt,
	conversationalReply,
	fallbackPlan,
	type FollowUpInput,
	type PlanInput
} from './pipeline.ts';
import { isProceduralHowTo } from './interview/facts.ts';
import type { StreamEvent, StreamStatusStep } from '#lib/stream-events.ts';

function status(step: StreamStatusStep, label?: string): StreamEvent {
	return { type: 'status', step, status: 'running', label };
}

export async function* streamPlanPipeline(
	input: PlanInput,
	opts: { signal?: AbortSignal } = {}
): AsyncGenerator<StreamEvent, void> {
	const trace = newTrace();
	const signal = opts.signal;
	try {
		yield status('start', 'Preparing your memo');
		const answerMap: Record<string, string> = {};
		for (const q of input.questions) {
			if (!q || typeof q.id !== 'string' || typeof q.text !== 'string') continue;
			const v = input.answers[q.id];
			answerMap[q.text] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
		}
		if (input.questions.length === 0 && input.issue) answerMap['Issue'] = input.issue;
		const hasDocs = input.documentIds.length > 0;
		const effectiveAgent =
			hasDocs &&
			input.agentId === 'ask' &&
			(isVagueIssue(input.issue) || hasDocCheckIntent(input.issue))
				? 'check'
				: input.agentId;
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

		// Dynamic planner path (default): forward live step status + draft tokens.
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
				yield status('planning', 'Planning retrieval');
				// Collect tokens via a queue: the generator below polls.
				const tokenQueue: string[] = [];
				const pushToken = (t: string): void => {
					tokenQueue.push(t);
				};
				let planDone = false;
				const reactiveOpts = {
					agentId: effectiveAgent,
					extra: `answers=${Object.keys(answerMap).length} docs=${input.documentIds.length}`,
					signal,
					trace
				};
				const run = (async () => {
					try {
						if (isReactiveEnabled()) {
							const { plan, stepStatus, subagents } = await runReactiveWithTail(
								bb,
								'plan',
								enrichedIssue,
								{
									...reactiveOpts,
									signal,
									trace
								} as Parameters<typeof runReactiveWithTail>[3]
							);
							// Patch token streaming into the writer tail: reactive tail
							// already ran; stream the final plan as preview below.
							return { plan, stepStatus, subagents };
						}
						const p = await draftExecutionPlan('plan', enrichedIssue, reactiveOpts);
						const r = await executePlan(p, bb, {
							signal,
							trace,
							onToken: pushToken,
							onStage: (s) => {
								void s;
							},
							onStep: () => {
								// Step map is live on return; intermediate pushes
								// go out as status events via the poll loop below.
							}
						});
						return { plan: p, stepStatus: r.stepStatus, subagents: r.subagents };
					} finally {
						planDone = true;
					}
				})();
				// Poll for step changes while the plan runs; tokens for the
				// reactive path arrive as a final preview burst below.
				while (!planDone) {
					await new Promise((r) => setTimeout(r, 200));
					if (signal?.aborted) throw new Error('Plan generation aborted');
					while (tokenQueue.length > 0) {
						const t = tokenQueue.shift() as string;
						yield { type: 'token', text: t };
					}
				}
				const { plan, stepStatus, subagents } = await run;
				if (!bb.plan) {
					yield status('drafting', 'Drafting memo');
					const drafted: string[] = [];
					bb.plan = await generatePlan(
						input.issue,
						answerMap,
						bb.plan ? [] : bb.passages,
						bb.rawUser.map((u) => ({
							id: '',
							documentId: '',
							filename: u.filename,
							content: u.content,
							score: 0
						})),
						bb.lang,
						{
							signal,
							trace,
							agentId: effectiveAgent,
							onToken: (t) => drafted.push(t),
							onStage: () => {}
						}
					).catch(() => '');
					for (const t of drafted) yield { type: 'token', text: t };
					if (!bb.plan) {
						bb.plan = fallbackPlan(
							input.issue,
							answerMap,
							bb.passages,
							input.documentIds,
							[...new Set(bb.rawUser.map((p) => p.filename))],
							effectiveAgent,
							{ docExcerpts: bb.rawUser.map((u) => u.content), clauses: bb.clauses }
						);
						bb.warnings.push('model-fallback');
					}
				} else {
					// Preview the verified plan so the client sees progressive text.
					const preview = bb.plan.slice(0, 8000);
					for (let i = 0; i < preview.length; i += 400) {
						if (signal?.aborted) throw new Error('Plan generation aborted');
						yield { type: 'token', text: preview.slice(i, i + 400) };
					}
				}
				mark(trace, 'planMs');
				const topic =
					bb.topic !== 'general'
						? bb.topic
						: await classifyIssue(enrichedIssue).catch(() => 'general');
				await savePlan(input.issue, answerMap, bb.plan).catch((e) =>
					logError(trace, 'savePlan', e)
				);
				yield {
					type: 'done',
					payload: {
						kind: 'plan',
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
					}
				};
				return;
			} catch (e) {
				logError(trace, 'dynamic-plan', e);
				if (signal?.aborted) {
					yield { type: 'error', message: 'Request aborted.' };
					return;
				}
				// Fall through to the static path below.
				yield status('planning', 'Retrying with direct retrieval');
			}
		}

		yield status('search-legal', 'Searching Kenyan law');
		const agentCfg = agentConfig(effectiveAgent);
		const query = buildRetrievalQuery([
			enrichedIssue,
			...Object.values(answerMap),
			docTerms,
			agentCfg.retrievalBoost
		]);
		const passages = await searchLegal(query, input.topK, undefined, { signal }, trace).catch(
			() => []
		);
		yield status('search-docs', 'Reading your files');
		let rawUser: Array<{ filename: string; content: string }> = [];
		if (input.documentIds.length > 0) {
			try {
				const rows = await searchUserDocuments(query, input.documentIds, 4);
				rawUser = rows.map((p) => ({ filename: p.filename, content: p.content.slice(0, 800) }));
				if (rawUser.length === 0 && docExcerpts.length > 0) {
					rawUser = docExcerpts.map((d) => ({
						filename: d.filename,
						content: d.content.slice(0, 800)
					}));
				}
			} catch {
				rawUser = docExcerpts.map((d) => ({
					filename: d.filename,
					content: d.content.slice(0, 800)
				}));
			}
		}
		yield status('drafting', 'Drafting memo');
		let planText = '';
		const draftQueue: string[] = [];
		let draftDone = false;
		const draftRun = (async (): Promise<string> => {
			try {
				return await generatePlan(
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
					input.langPref,
					{
						signal,
						trace,
						agentId: effectiveAgent,
						onToken: (t) => {
							draftQueue.push(t);
						},
						onStage: (s) => {
							void s;
						}
					}
				);
			} finally {
				draftDone = true;
			}
		})();
		while (!draftDone) {
			while (draftQueue.length > 0) {
				yield { type: 'token', text: draftQueue.shift() as string };
			}
			if (!draftDone) {
				if (signal?.aborted) throw new Error('Plan generation aborted');
				await new Promise((r) => setTimeout(r, 30));
			}
		}
		while (draftQueue.length > 0) {
			yield { type: 'token', text: draftQueue.shift() as string };
		}
		try {
			planText = await draftRun;
		} catch (e) {
			logError(trace, 'generatePlan', e);
			planText = fallbackPlan(
				input.issue,
				answerMap,
				passages,
				input.documentIds,
				[...new Set(rawUser.map((p) => p.filename))],
				effectiveAgent,
				{ docExcerpts: rawUser.map((u) => u.content) }
			);
			// Preview the deterministic floor so the client still progresses.
			yield { type: 'token', text: planText.slice(0, 4000) };
		}
		// Stream the verified plan as preview chunks (post-citation text).
		yield status('citing', 'Verifying citations');
		const derived = deriveTopic(passages);
		const topic =
			derived !== 'general' ? derived : await classifyIssue(enrichedIssue).catch(() => 'general');
		await savePlan(input.issue, answerMap, planText).catch((e) => logError(trace, 'savePlan', e));
		yield {
			type: 'done',
			payload: {
				kind: 'plan',
				plan: planText,
				passages,
				userPassages: rawUser,
				topic,
				lang: input.langPref,
				traceId: trace.id,
				timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
				warnings: []
			}
		};
	} catch (e) {
		logError(trace, 'pipeline', e);
		if (signal?.aborted) {
			yield { type: 'error', message: 'Request aborted.' };
			return;
		}
		try {
			const plan = fallbackPlan(
				String(input.issue ?? ''),
				{ Issue: String(input.issue ?? '') },
				[],
				[],
				[],
				normalizeAgentId(input.agentId)
			);
			yield {
				type: 'done',
				payload: {
					kind: 'plan',
					plan,
					passages: [],
					userPassages: [],
					topic: 'general',
					lang: input.langPref,
					traceId: trace.id,
					timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks },
					warnings: ['pipeline-fallback']
				}
			};
		} catch {
			yield { type: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}
}

export async function* streamFollowUp(
	input: FollowUpInput,
	opts: { signal?: AbortSignal } = {}
): AsyncGenerator<StreamEvent, void> {
	const trace = newTrace();
	const signal = opts.signal;
	try {
		yield status('start', 'Reading your follow-up');
		if (!hasSubstantiveContent(`${input.message} ${input.issue}`)) {
			const answer = await conversationalReply(input.message, input.langPref, { signal, trace });
			for (let i = 0; i < answer.length; i += 400) {
				yield { type: 'token', text: answer.slice(i, i + 400) };
			}
			yield {
				type: 'done',
				payload: {
					kind: 'followup',
					answer,
					passages: [],
					lang: input.langPref,
					traceId: trace.id,
					timings: { totalMs: Date.now() - trace.startedAt }
				}
			};
			return;
		}
		const facts = input.history.map((h) => `${h.q ?? ''} ${h.a ?? ''}`.trim()).filter(Boolean);
		const scopedIssue = input.projectInstructions
			? `${input.issue}\n\nProject instructions: ${input.projectInstructions}`
			: input.issue;
		yield status('search-legal', 'Searching Kenyan law');
		const agentFollowCfg = agentConfig(input.agentId);
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
		const passages = await searchLegal(query, 10, undefined, { signal }, trace).catch(() => []);
		yield status('drafting', 'Drafting answer');
		const prompt = buildFollowUpPrompt({
			issue: scopedIssue,
			facts,
			plan: input.plan,
			turns: input.turns,
			message: input.message,
			passages,
			lang: 'en',
			agentId: input.agentId
		});
		let answer = '';
		try {
			const gen = streamText(prompt, { predict: 1000, signal, model: 'followup' }, trace);
			while (true) {
				const r = await gen.next();
				if (!r.done && r.value) {
					yield { type: 'token', text: r.value };
				}
				if (r.done) {
					answer = String(r.value ?? '');
					break;
				}
			}
		} catch (e) {
			logError(trace, 'followup', e);
			answer = '';
		}
		yield status('citing', 'Verifying citations');
		let usedFallback = false;
		if (answer) {
			answer = assignCitations(answer, 'en', passages);
			answer = verifyQuoteSpans(answer, passages);
			answer = verifyCitations(answer, passages.length);
			if (passages.length > 0 && citationCoverage(answer, passages) < 0.15) {
				event(trace, 'followup:uncited-fallback', 'coverage-low');
				answer = '';
			}
		}
		// Reuse the same deterministic floor without importing internals:
		// keep it small and matter-neutral here.
		if (!answer) {
			const short = input.message.length > 200 ? `${input.message.slice(0, 200)}…` : input.message;
			const srcs = passages
				.slice(0, 2)
				.map((p) => `- ${p.title} — ${p.citation}`)
				.join('\n');
			answer =
				input.langPref === 'sw'
					? `Samahani, sikuweza kutayarisha jibu kamili kwa swali ("${short}") hivi sasa. Vyanzo hivi vinaonekana kuhusiana:\n${srcs}\n\nJaribu kuuliza tena, au taja unachotaka kuthibitisha.`
					: `I could not put together a full answer to "${short}" right now. These sources look relevant:\n${srcs}\n\nTry asking again, or state what to confirm.`;
			usedFallback = true;
		} else if (input.langPref === 'sw' && !usedFallback) {
			yield status('translating', 'Translating answer');
			const translated = await translateTextToSwahili(answer, { signal, trace });
			if (translated) answer = translated;
		}
		if (!usedFallback && !answerAddressesQuestion(answer, [input.message, scopedIssue, ...facts])) {
			event(trace, 'followup:off-topic-fallback', 'no-query-overlap');
			answer = await conversationalReply(input.message, input.langPref, { signal, trace });
			yield {
				type: 'done',
				payload: {
					kind: 'followup',
					answer,
					passages: [],
					lang: input.langPref,
					traceId: trace.id,
					timings: { totalMs: Date.now() - trace.startedAt }
				}
			};
			return;
		}
		// Final verified text goes in `done`; tokens above were the preview.
		yield {
			type: 'done',
			payload: {
				kind: 'followup',
				answer,
				passages,
				lang: input.langPref,
				traceId: trace.id,
				timings: { totalMs: Date.now() - trace.startedAt, ...trace.marks }
			}
		};
	} catch (e) {
		logError(trace, 'followup', e);
		if (signal?.aborted) {
			yield { type: 'error', message: 'Request aborted.' };
			return;
		}
		yield { type: 'error', message: e instanceof Error ? e.message : String(e) };
	}
}
