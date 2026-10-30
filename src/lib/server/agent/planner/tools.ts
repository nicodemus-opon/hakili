/** Tool implementations behind the dynamic plan. Each tool is offline-safe. */
import { buildRetrievalQuery } from '../context.ts';
import { deriveTopic, searchLegal } from '../retrieval.ts';
import { fetchUserDocExcerpts, searchUserDocuments } from '../../documents.ts';
import { extractCaseState } from '../interview/facts.ts';
import { planQuestionBatch } from '../interview/batch.ts';
import { isEntailedBySource, presupposesRequestedArtifact } from '../interview/policy.ts';
import { generatePlan } from '../plan/generator.ts';
import { uncitedSections, verifyCitations, weakSections } from '../plan/validator.ts';
import { agentAllHeadings, agentConfig, agentRequiredHeadings } from '../agents.ts';
import type { Trace } from '../observability.ts';
import { event } from '../observability.ts';
import type { HistoryTurn, LangPref, Passage, Question, ResponseLang } from '../types.ts';
import type { UserPassage } from '../types.ts';

/** Shared blackboard the executor threads through every tool. */
export interface Blackboard {
	issue: string;
	history: HistoryTurn[];
	answers: Record<string, string>;
	langPref: LangPref;
	agentId: string;
	topK: number;
	documentIds: string[];
	lang: ResponseLang;
	passages: Passage[];
	userPassages: Array<{ filename: string; content: string }>;
	rawUser: Array<{ filename: string; content: string }>;
	questions: Question[];
	plan: string;
	topic: string;
	clauses: Array<{ index: number; text: string }>;
	needsDocs: boolean;
	warnings: string[];
}

export function newBlackboard(init: Partial<Blackboard> & { issue: string }): Blackboard {
	const langPref = init.langPref ?? 'en';
	return {
		history: [],
		answers: {},
		agentId: 'ask',
		topK: 6,
		documentIds: [],
		passages: [],
		userPassages: [],
		rawUser: [],
		questions: [],
		plan: '',
		topic: 'general',
		clauses: [],
		needsDocs: false,
		warnings: [],
		...init,
		langPref,
		lang: langPref
	};
}

export interface ToolOpts {
	signal?: AbortSignal;
	trace?: Trace;
	onToken?: (delta: string) => void;
	onStage?: (stage: string) => void;
}

export async function toolExtractState(
	bb: Blackboard,
	opts: ToolOpts
): Promise<{ missing: string[] }> {
	const state = await extractCaseState(bb.issue, bb.history, bb.lang, opts);
	(bb as { __state?: typeof state }).__state = state;
	if (opts.trace) event(opts.trace, 'tool:extractState', `missing=${state.missing.join(',')}`);
	return { missing: state.missing };
}

export async function toolSearchLegal(bb: Blackboard, opts: ToolOpts): Promise<Passage[]> {
	const cfg = agentConfig(bb.agentId);
	// Doc-aware: the blackboard issue is already enriched with doc terms
	// when intake was vague, and pre-seeded rawUser covers the parallel-race
	// where searchLegal runs before searchUserDocs.
	const docTerms = bb.rawUser
		.map((u) => u.content)
		.join(' ')
		.slice(0, 600);
	// Reactive loop: the model-supplied query leads when present (set by
	// runReactiveRetrieval after arg validation); otherwise unchanged.
	const reactQuery =
		typeof (bb as { __reactQuery?: unknown }).__reactQuery === 'string'
			? ((bb as { __reactQuery?: string }).__reactQuery ?? '').slice(0, 1000)
			: '';
	const parts =
		Object.keys(bb.answers).length > 0
			? [reactQuery, bb.issue, ...Object.values(bb.answers), docTerms, cfg.retrievalBoost]
			: [
					reactQuery,
					bb.issue,
					...bb.history.map((h) => `${h.q} ${h.a}`),
					docTerms,
					cfg.retrievalBoost
				];
	const query = buildRetrievalQuery(parts);
	try {
		bb.passages = await searchLegal(query, bb.topK, undefined, { signal: opts.signal }, opts.trace);
	} catch {
		bb.passages = [];
	}
	bb.topic = deriveTopic(bb.passages);
	if (opts.trace) event(opts.trace, 'tool:searchLegal', `hits=${bb.passages.length}`);
	return bb.passages;
}

export async function toolSearchUserDocs(bb: Blackboard, opts: ToolOpts): Promise<number> {
	if (bb.documentIds.length === 0) {
		// Keep any pre-seeded excerpts (interview/plan preload).
		if (bb.rawUser.length === 0) bb.userPassages = [];
		else bb.userPassages = bb.rawUser;
		return bb.rawUser.length;
	}
	const query = buildRetrievalQuery([
		(typeof (bb as { __reactQuery?: unknown }).__reactQuery === 'string'
			? ((bb as { __reactQuery?: string }).__reactQuery ?? '')
			: ''
		).slice(0, 1000),
		bb.issue,
		...Object.values(bb.answers)
	]);
	try {
		const rows = await searchUserDocuments(query, bb.documentIds, 4);
		if (rows.length > 0) {
			bb.rawUser = rows.map((p) => ({ filename: p.filename, content: p.content.slice(0, 800) }));
			bb.userPassages = bb.rawUser;
		} else {
			// Vague-query fallback: ordered excerpts never come back empty.
			const fallback = await fetchUserDocExcerpts(bb.documentIds, 6);
			if (fallback.length > 0 && bb.rawUser.length === 0) {
				bb.rawUser = fallback.map((p) => ({
					filename: p.filename,
					content: p.content.slice(0, 800)
				}));
				bb.userPassages = bb.rawUser;
			}
		}
	} catch {
		if (bb.rawUser.length === 0) {
			const fallback = await fetchUserDocExcerpts(bb.documentIds, 6).catch(() => []);
			bb.rawUser = fallback.map((p) => ({
				filename: p.filename,
				content: p.content.slice(0, 800)
			}));
			bb.userPassages = bb.rawUser;
		}
	}
	if (opts.trace) event(opts.trace, 'tool:searchUserDocs', `docs=${bb.rawUser.length}`);
	return bb.rawUser.length;
}

export async function toolDraftQuestions(bb: Blackboard, opts: ToolOpts): Promise<Question[]> {
	try {
		const stash = (bb as { __reactDraft?: { focus?: string[]; maxQuestions?: number } })
			.__reactDraft;
		const focus = Array.isArray(stash?.focus)
			? stash.focus.filter(
					(d): d is 'party' | 'when_where_proof' | 'steps_outcome' | 'docs_deadline' =>
						d === 'party' ||
						d === 'when_where_proof' ||
						d === 'steps_outcome' ||
						d === 'docs_deadline'
				)
			: undefined;
		const max =
			typeof stash?.maxQuestions === 'number' && Number.isFinite(stash.maxQuestions)
				? Math.max(1, Math.min(4, Math.floor(stash.maxQuestions)))
				: undefined;
		const batch = await planQuestionBatch(bb.issue, bb.history, bb.lang, {
			signal: opts.signal,
			trace: opts.trace,
			agentId: bb.agentId,
			...(focus ? { focusDimensions: focus } : {}),
			...(max !== undefined ? { maxQuestions: max } : {})
		});
		// Final deterministic sweep: a reactive focus on an already-stated
		// fact must not leak through — drop entailed drafts for every dim.
		const kept = batch.filter(
			(q) =>
				!isEntailedBySource(q.text, bb.issue, bb.history) &&
				!presupposesRequestedArtifact(q.text, bb.issue)
		);
		if (kept.length !== batch.length && opts.trace)
			event(
				opts.trace,
				'tool:draftQuestions-filtered',
				'dropped=' + String(batch.length - kept.length)
			);
		bb.questions = kept;
		if (opts.trace) event(opts.trace, 'tool:draftQuestions', `questions=${batch.length}`);
		return batch;
	} catch {
		// Interview tool never throws: fewer good questions beats any error.
		bb.questions = [];
		return [];
	}
}

export async function toolGeneratePlan(bb: Blackboard, opts: ToolOpts): Promise<string> {
	const answerMap: Record<string, string> =
		Object.keys(bb.answers).length > 0
			? { ...bb.answers }
			: Object.fromEntries(bb.history.map((h) => [h.q, h.a]));
	// Check: hand the clause split to the writer so Risky Clauses walks the
	// document in order instead of paraphrasing from memory.
	if (bb.clauses.length > 0) {
		answerMap['Numbered clauses from your file'] = bb.clauses
			.map((c) => `${c.index}. ${c.text.slice(0, 220)}`)
			.join('\n')
			.slice(0, 2000);
	}
	const userDocs: UserPassage[] = bb.rawUser.map((u) => ({
		id: '',
		documentId: '',
		filename: u.filename,
		content: u.content,
		score: 0
	}));
	bb.plan = await generatePlan(bb.issue, answerMap, bb.passages, userDocs, bb.lang, {
		signal: opts.signal,
		trace: opts.trace,
		agentId: bb.agentId,
		onToken: opts.onToken,
		onStage: opts.onStage
	});
	if (opts.trace) event(opts.trace, 'tool:generatePlan', `chars=${bb.plan.length}`);
	return bb.plan;
}

export async function toolRepairSections(bb: Blackboard, opts: ToolOpts): Promise<string> {
	if (!bb.plan) return '';
	const lang = bb.lang;
	const cfg = agentConfig(bb.agentId);
	const all = agentAllHeadings(cfg.id, lang);
	const weak = [
		...new Set([
			...weakSections(bb.plan, lang, all),
			...uncitedSections(bb.plan, lang, bb.passages, all)
		])
	];
	if (weak.length === 0) return bb.plan;
	// Targeted repair is inside generatePlan already; here we only verify +
	// prune so the executor step is deterministic and offline-safe.
	const before = bb.plan;
	bb.plan = verifyCitations(bb.plan, bb.passages.length);
	if (opts.trace)
		event(opts.trace, 'tool:repairSections', `weak=${weak.length} repaired=${before !== bb.plan}`);
	return bb.plan;
}

export async function toolVerifyCitations(bb: Blackboard, opts: ToolOpts): Promise<string> {
	if (!bb.plan) return '';
	bb.plan = verifyCitations(bb.plan, bb.passages.length);
	if (opts.trace) event(opts.trace, 'tool:verifyCitations', `passages=${bb.passages.length}`);
	return bb.plan;
}

/** Check-only: split attached docs into numbered clauses for per-clause review. */
export async function toolSplitClauses(bb: Blackboard, opts: ToolOpts): Promise<number> {
	const text = bb.rawUser.map((u) => u.content).join('\n');
	if (!text.trim()) {
		bb.clauses = [];
		return 0;
	}
	// PDFs extract to running text, so numbered headings often sit inline
	// ("...property. 8. CLEANING FEE Tenant..."). Split on newlines AND on
	// inline "N. HEADING" boundaries, keeping the heading with the clause.
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
	bb.clauses = parts.map((t, i) => ({ index: i + 1, text: t.slice(0, 500) }));
	if (opts.trace) event(opts.trace, 'tool:splitClauses', `clauses=${bb.clauses.length}`);
	return bb.clauses.length;
}

/** Draft-only deterministic guard: strip first-person admissions the user never made. */
export async function toolAdmissionGuard(bb: Blackboard, opts: ToolOpts): Promise<string> {
	if (!bb.plan) return '';
	const source =
		`${bb.issue} ${Object.values(bb.answers).join(' ')} ${bb.history.map((h) => h.a).join(' ')}`.toLowerCase();
	const banned = ['i admit', 'i agree i owe', 'i confess', 'nakiri', 'nakubali kuwa na hatia'];
	let out = bb.plan;
	for (const phrase of banned) {
		if (!source.includes(phrase)) {
			const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
			out = out.replace(re, '[removed: not stated by user]');
		}
	}
	const changed = out !== bb.plan;
	bb.plan = out;
	if (opts.trace) event(opts.trace, 'tool:admissionGuard', `stripped=${changed}`);
	return bb.plan;
}

/** Check-only: mark that attached docs are still needed instead of inventing a plan. */
export async function toolRequestDocs(bb: Blackboard, opts: ToolOpts): Promise<string> {
	bb.needsDocs = true;
	if (opts.trace) event(opts.trace, 'tool:requestDocs', 'docs-missing');
	return 'docs-missing';
}

export function requiredHeadingsFor(bb: Blackboard): string[] {
	return agentRequiredHeadings(
		(bb.agentId === 'check' || bb.agentId === 'draft' ? bb.agentId : 'ask') as
			'ask' | 'check' | 'draft',
		bb.lang
	);
}
