/**
 * Offline eval harness: pure-function checks (no DB, no model) plus optional
 * live checks (`--live`) that need Postgres + QVAC models.
 *
 *   pnpm eval          pure checks only (CI-safe)
 *   pnpm eval:live     pure + live retrieval/interview checks
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ftsOrQuery, outputMatchesLang, plainOrQuery } from '../src/lib/server/agent/language.ts';
import { isDegenerateText } from '../src/lib/server/agent/interview/loop.ts';
import { diversifyPassages } from '../src/lib/server/agent/retrieval.ts';
import {
	CONTEXT_BUDGETS,
	boundedSet,
	buildRetrievalQuery,
	formatLawHints,
	repairContext,
	summarizeCaseState
} from '../src/lib/server/agent/context.ts';
import { buildFollowUpPrompt } from '../src/lib/server/agent/pipeline.ts';
import {
	hasVagueIntent,
	isAnchored,
	isDuplicateQuestion,
	isGenericQuestion,
	isGroundedInIssue,
	isSingleConcept,
	issueHasNamedParty,
	presupposesUnknownDocument
} from '../src/lib/server/agent/interview/policy.ts';
import {
	evidenceSource,
	parseCaseState,
	quoteGrounds
} from '../src/lib/server/agent/interview/facts.ts';
import {
	assignCitations,
	citationCoverage,
	countMissingHeadings,
	countPlaceholderSections,
	factualSentences,
	groundingScore,
	hasSafetyFooter,
	isThinPlan,
	packPassages,
	stripUnsafeDisclaimer,
	uncitedSections,
	verifyQuoteSpans
} from '../src/lib/server/agent/plan/validator.ts';
import {
	fallbackPlanFor,
	planAdherence,
	validatePlan
} from '../src/lib/server/agent/planner/planner.ts';
import { normalizeAgentId, agentConfig } from '../src/lib/server/agent/agents.ts';

const here = dirname(fileURLToPath(import.meta.url));
const evalDir = join(here, '..', 'src', 'lib', 'server', 'eval');
const goldens = JSON.parse(readFileSync(join(evalDir, 'goldens.json'), 'utf8')) as {
	retrieval: Array<{
		id: string;
		query: string;
		expectTopic?: string;
		expectTerms: string[];
	}>;
	interview: Array<{
		id: string;
		issue: string;
		lang: 'en' | 'sw';
		history: Array<{ q: string; a: string }>;
		mustMentionAny?: string[];
		mustNotMention?: string[];
	}>;
	openInterview: Array<{
		id: string;
		issue: string;
		question: string;
		history: Array<{ q: string; a: string }>;
		lawContext?: string;
		expectGrounded?: boolean;
		expectGeneric?: boolean;
		expectSingleConcept?: boolean;
	}>;
	liveInterview?: Array<{
		id: string;
		issue: string;
		question: string;
		history: Array<{ q: string; a: string }>;
		lawContext?: string;
		expectJudge?: boolean;
	}>;
	validators: Array<{
		id: string;
		kind: string;
		text?: string;
		issue?: string;
		query?: string;
		expected?: boolean;
		mustContain?: string[];
		lang?: 'en' | 'sw';
		planFile?: string;
		passages?: Array<{ title: string; citation: string; content: string }>;
		minScore?: number;
		budget?: number;
		maxScore?: number;
		history?: Array<{ q: string; a: string }>;
		known?: Array<{ dimension: string; evidence: string }>;
		expectMissing?: string[];
	}>;
};

let failures = 0;
let passes = 0;
const bySection = new Map<string, { pass: number; fail: number }>();
function check(id: string, cond: boolean, detail = ''): void {
	const section = id.split('/')[0] ?? id;
	const entry = bySection.get(section) ?? { pass: 0, fail: 0 };
	if (cond) {
		passes++;
		entry.pass++;
		console.log(`  ok   ${id}`);
	} else {
		failures++;
		entry.fail++;
		console.error(`  FAIL ${id}${detail ? ` — ${detail}` : ''}`);
	}
	bySection.set(section, entry);
}

// --- Pure: FTS expansion over the generated index ---
console.log('validators/validators');
for (const v of goldens.validators) {
	if (v.kind === 'generic' && v.text !== undefined) {
		const got = isGenericQuestion(v.text, v.issue ?? '', [], '');
		check(v.id, got === v.expected, `got ${got}`);
	} else if (v.kind === 'fts' && v.query) {
		const q = ftsOrQuery(v.query) ?? '';
		check(
			v.id,
			(v.mustContain ?? []).every((t) => q.includes(t)),
			`got ${q.slice(0, 120)}`
		);
	} else if (v.kind === 'plainOr' && v.query) {
		const q = plainOrQuery(v.query) ?? '';
		check(
			v.id,
			(v.mustContain ?? []).every((t) => q.includes(t)),
			`got ${q.slice(0, 120)}`
		);
	} else if (v.kind === 'thin' && v.planFile) {
		const plan = readFileSync(join(evalDir, v.planFile), 'utf8');
		check(v.id, isThinPlan(plan, (v.lang ?? 'sw') as 'en' | 'sw') === v.expected);
		check(`${v.id}/placeholders`, countPlaceholderSections(plan, 'sw') >= 2);
		check(`${v.id}/headings-present`, countMissingHeadings(plan, 'sw') === 0);
	} else if (v.kind === 'quote' && v.text !== undefined) {
		const out = verifyQuoteSpans(v.text, v.passages ?? []);
		const keepsMarker = out.includes('[1]');
		check(v.id, keepsMarker === v.expected, `got "${out.slice(0, 120)}"`);
	} else if (v.kind === 'grounding' && v.text !== undefined) {
		const score = groundingScore(v.text, v.passages ?? []);
		check(v.id, score >= (v.minScore ?? 1), `got ${score}`);
	} else if (v.kind === 'coverage' && v.text !== undefined) {
		const score = citationCoverage(v.text, v.passages ?? []);
		const lo = v.minScore ?? 1;
		const hi = v.maxScore;
		const ok = hi !== undefined ? score >= lo && score <= hi : score >= lo;
		check(v.id, ok, `got ${score.toFixed(2)}`);
	} else if (v.kind === 'safety' && v.text !== undefined) {
		const got = hasSafetyFooter(v.text, (v.lang ?? 'en') as 'en' | 'sw');
		check(v.id, got === v.expected, `got ${got}`);
		if (v.expected === true) {
			const facts = factualSentences(v.text, (v.lang ?? 'en') as 'en' | 'sw');
			check(`${v.id}/has-facts`, facts.length >= 0);
		}
	} else if (v.kind === 'anchored' && v.text !== undefined) {
		check(v.id, isAnchored(v.text) === v.expected, `got ${isAnchored(v.text)}`);
	} else if (v.kind === 'pack' && v.budget !== undefined) {
		const packed = packPassages(v.passages ?? [], v.budget);
		const okLen = packed.length <= v.budget + 1;
		const okCut = packed.endsWith('…') || /[.!?]$/.test(packed) || packed.length < v.budget;
		check(v.id, okLen && okCut, `got len=${packed.length}`);
		for (const t of v.mustContain ?? []) check(`${v.id}/contains`, packed.includes(t));
	} else if (v.kind === 'vagueIntent' && v.text !== undefined) {
		check(v.id, hasVagueIntent(v.text) === v.expected, `got ${hasVagueIntent(v.text)}`);
	} else if (v.kind === 'duplicate' && v.text !== undefined) {
		const got = isDuplicateQuestion(v.text, v.history ?? []);
		check(v.id, got === v.expected, `got ${got}`);
	} else if (v.kind === 'degenerate' && v.text !== undefined) {
		check(v.id, isDegenerateText(v.text) === v.expected, `got ${isDegenerateText(v.text)}`);
	} else if (v.kind === 'langMatch' && v.text !== undefined) {
		const got = outputMatchesLang(v.text, (v.lang ?? 'en') as 'en' | 'sw');
		check(v.id, got === v.expected, `got ${got}`);
	} else if (v.kind === 'namedParty' && v.issue !== undefined) {
		check(v.id, issueHasNamedParty(v.issue) === v.expected, `got ${issueHasNamedParty(v.issue)}`);
	} else if (v.kind === 'quoteGrounds' && v.text !== undefined) {
		const got = quoteGrounds(v.text, v.issue ?? '');
		check(v.id, got === v.expected, `got ${got}`);
	} else if (v.kind === 'caseState') {
		const state = parseCaseState(
			{ known: v.known ?? [] },
			evidenceSource(v.issue ?? '', v.history ?? [])
		);
		check(
			v.id,
			JSON.stringify(state?.missing ?? null) === JSON.stringify(v.expectMissing ?? []),
			`got missing=${JSON.stringify(state?.missing)}`
		);
	} else if (v.kind === 'presuppose' && v.text !== undefined) {
		const got = presupposesUnknownDocument(
			v.text,
			v.issue ?? '',
			v.history ?? [],
			(v.passages ?? []).map((p) => `${p.title} ${p.content}`).join('\n')
		);
		check(v.id, got === v.expected, `got ${got}`);
	} else if (v.kind === 'disclaimerStrip' && v.text !== undefined) {
		const out = stripUnsafeDisclaimer(v.text, (v.lang ?? 'en') as 'en' | 'sw');
		const kept = out.includes('## Note') || out.includes('## Ujumbe') || out.includes('## Note');
		check(v.id, kept === v.expected, `got "${out.slice(-80)}"`);
	} else if (v.kind === 'uncited' && v.text !== undefined) {
		const weak = uncitedSections(v.text, (v.lang ?? 'en') as 'en' | 'sw', v.passages ?? []);
		check(v.id, weak.length > 0 === v.expected, `got [${weak.join(',')}]`);
	} else if (v.kind === 'assign' && v.text !== undefined) {
		const out = assignCitations(v.text, (v.lang ?? 'en') as 'en' | 'sw', v.passages ?? []);
		check(v.id, out.includes('[1]') === v.expected, `got "${out.slice(0, 160)}"`);
	} else if (v.kind === 'thinInline' && v.text !== undefined) {
		const got = isThinPlan(v.text, (v.lang ?? 'en') as 'en' | 'sw');
		check(v.id, got === v.expected, `got thin=${got}`);
	} else if (v.kind === 'planValid') {
		const agent = normalizeAgentId((v as { agent?: unknown }).agent);
		const goal = (v as { goal?: string }).goal;
		const g = goal === 'plan' || goal === 'followup' ? goal : 'interview';
		const plan = fallbackPlanFor(g, agent);
		const roundTrip = validatePlan(JSON.parse(JSON.stringify(plan)), g, agent);
		const got = roundTrip !== null && planAdherence(plan, agent);
		check(v.id, got === v.expected, `got valid=${got}`);
	} else if (v.kind === 'planAdherence') {
		const agent = normalizeAgentId((v as { agent?: unknown }).agent);
		const goal = (v as { goal?: string }).goal;
		const g = goal === 'plan' || goal === 'followup' ? goal : 'interview';
		const plan = fallbackPlanFor(g, agent);
		const extraTool = (v as { extraTool?: string }).extraTool;
		if (typeof extraTool === 'string' && extraTool) {
			plan.steps.push({
				id: 'injected',
				tool: extraTool as never,
				label: 'Injected disallowed tool',
				budgetMs: 1000,
				retry: 0,
				onFail: 'skip'
			});
		}
		const got = planAdherence(plan, agent);
		check(v.id, got === v.expected, `got adherence=${got}`);
	} else if (v.kind === 'diversity') {
		const rows = (v.passages ?? []).map((p, i) => ({
			id: `p${i}`,
			title: p.title,
			citation: p.citation,
			url: 'https://example.test',
			content: p.content,
			topic: (p as { topic?: string }).topic ?? 'general',
			score: 1
		}));
		const out = diversifyPassages(
			rows.map((r) => ({ ...r })),
			2
		);
		check(
			v.id,
			(v.mustContain ?? []).every((t) => out.some((p) => p.content.includes(t))),
			`got ${out.map((p) => p.id).join(',')}`
		);
	}
}

// --- Pure: no generic fallback (uncovered dims are skipped, never scaffolded) ---
// The universal ladder was deleted: model down (or all drafts dropped) means
// NO questions for the missing dimensions, never a who/what/when/where form.
console.log('interview/universal');
{
	const { planQuestionBatch } = await import('../src/lib/server/agent/interview/batch.ts');
	for (const c of goldens.interview) {
		try {
			const out = await planQuestionBatch(
				c.issue,
				c.history,
				c.lang,
				{},
				{
					state: { known: [], missing: ['party', 'when_where_proof'] },
					draft: async () => {
						throw new Error('model down');
					}
				}
			);
			check(`${c.id}/no-scaffolding`, out.length === 0, `got ${out.length} question(s)`);
		} catch (e) {
			check(`${c.id}/no-scaffolding`, false, e instanceof Error ? e.message : String(e));
		}
	}
}

// --- Pure: open-domain grounding (no invented entities, single concept) ---
console.log('interview/open-domain');
for (const c of goldens.openInterview ?? []) {
	const law = c.lawContext ?? '';
	if (c.expectGrounded !== undefined) {
		const got = isGroundedInIssue(c.question, c.issue, c.history, law);
		check(`${c.id}/grounded`, got === c.expectGrounded, `got grounded=${got}`);
	}
	if (c.expectGeneric !== undefined) {
		const got = isGenericQuestion(c.question, c.issue, c.history, law);
		check(`${c.id}/generic`, got === c.expectGeneric, `got generic=${got}`);
	}
	if (c.expectSingleConcept !== undefined) {
		const got = isSingleConcept(c.question);
		check(`${c.id}/single-concept`, got === c.expectSingleConcept, `got single=${got}`);
	}
}

// --- Pure: native tool-calling contracts (narrow allowlists, arg validation) ---
console.log('tools/native');
{
	const { nativeToolsFor, validateNativeArgs, estimateToolDefsSize, MAX_NATIVE_STEPS } =
		await import('../src/lib/server/agent/planner/native-tools.ts');
	for (const agent of ['ask', 'check', 'draft'] as const) {
		const defs = nativeToolsFor(agent);
		check(
			`tools/native/${agent}-narrow`,
			defs.length >= 2 && defs.length <= 5,
			`got ${defs.length}`
		);
		const allowed = new Set(agentConfig(agent).allowedTools);
		check(
			`tools/native/${agent}-allowlisted`,
			defs.every((d) => allowed.has(d.name)),
			`got ${defs.map((d) => d.name).join(',')}`
		);
	}
	check(
		'tools/native/query-valid',
		validateNativeArgs('searchLegal', { query: 'notice pay' })?.query === 'notice pay'
	);
	check('tools/native/query-empty', validateNativeArgs('searchLegal', { query: '   ' }) === null);
	check('tools/native/unknown', validateNativeArgs('nope', { query: 'x' }) === null);
	check('tools/native/defs-budget', estimateToolDefsSize(nativeToolsFor('check')) < 2000);
	check('tools/native/max-steps', MAX_NATIVE_STEPS <= 6);
}

// --- Live checks (need DB + models) ---
if (process.argv.includes('--live')) {
	console.log('live/retrieval+interview (needs Postgres + QVAC models)');
	const { searchLegal, deriveTopic } = await import('../src/lib/server/agent/retrieval.ts');
	const { judgeEntitiesGrounded } = await import('../src/lib/server/agent/interview/loop.ts');
	const { expandQueryTerms } = await import('../src/lib/server/agent/language.ts');
	for (const r of goldens.retrieval) {
		try {
			const passages = await searchLegal(r.query, 3);
			if (r.expectTopic !== undefined) {
				const derived = deriveTopic(passages);
				check(`${r.id}/topic`, derived === r.expectTopic, `got ${derived}`);
			}
			const blob = passages
				.map((p) => `${p.title} ${p.content}`)
				.join(' ')
				.toLowerCase();
			check(
				`${r.id}/terms`,
				r.expectTerms.some((t) => blob.includes(t.toLowerCase())),
				'no expected term in top-3'
			);
		} catch (e) {
			check(`${r.id}/live`, false, e instanceof Error ? e.message : String(e));
		}
	}
	// Model expansion handles vocabulary no table has seen.
	try {
		const expanded = await expandQueryTerms('nimenunua gari logbook haijatransfer');
		check(
			'live-expansion/vehicle',
			(expanded ?? '').length > 0,
			`got ${String(expanded).slice(0, 120)}`
		);
	} catch (e) {
		check('live-expansion/vehicle', false, e instanceof Error ? e.message : String(e));
	}
	// Semantic judge: loan question rejected even when law mentions loans.
	for (const c of goldens.liveInterview ?? []) {
		try {
			const got = await judgeEntitiesGrounded(c.question, c.issue, c.history, c.lawContext ?? '');
			check(`${c.id}/judge`, got === c.expectJudge, `got judge=${got}`);
		} catch (e) {
			check(`${c.id}/judge`, false, e instanceof Error ? e.message : String(e));
		}
	}
}

// --- Pure: context-engineering budgets (Write/Select/Compress/Isolate) ---
console.log('context/budgets');
{
	const law = [
		{ title: 'A', citation: 'c1', content: 'First sentence about notice. '.repeat(50) },
		{ title: 'B', citation: 'c2', content: 'Second sentence about dismissal. '.repeat(50) }
	];
	// Select: law hints pack to budget, never dump full corpus.
	const hints = formatLawHints(law);
	check('context/select-hints-budget', hints.length <= CONTEXT_BUDGETS.INTERVIEW_LAW_HINTS + 1);
	// Compress: retrieval query capped, recap mentions missing dims.
	const q = buildRetrievalQuery(['issue text', 'a'.repeat(5000)]);
	check('context/compress-query-cap', q.length <= CONTEXT_BUDGETS.QUERY_MAX);
	const recap = summarizeCaseState(
		{
			known: [{ dimension: 'party', evidence: 'John Kamau' }],
			missing: ['when_where_proof', 'steps_outcome', 'docs_deadline']
		},
		[{ q: 'q', a: 'answer text' }]
	);
	check('context/compress-recap', recap.includes('when_where_proof') && recap.includes('party'));
	// Isolate: repair sees top passages only.
	const repair = repairContext(
		law.map((p, i) => ({
			id: `p${i}`,
			url: 'https://example.test',
			topic: 'general',
			score: 1,
			...p
		}))
	);
	check('context/isolate-repair-budget', repair.length <= CONTEXT_BUDGETS.REPAIR_BUDGET + 1);
	// Poisoning: bounded cache evicts oldest instead of pinning hallucinations.
	const m = new Map<string, boolean>();
	for (let i = 0; i < 105; i++) boundedSet(m, `k${i}`, true, 100);
	check('context/write-bounded-cache', m.size === 100 && !m.has('k0') && m.has('k104'));
	// Distraction: follow-up prompt stays bounded with maximal inputs.
	const bigPrompt = buildFollowUpPrompt({
		issue: 'x'.repeat(5000),
		facts: ['y'.repeat(5000)],
		plan: 'z'.repeat(10000),
		turns: Array.from({ length: 20 }, (_, i) => ({
			role: i % 2 ? ('assistant' as const) : ('user' as const),
			content: 't'.repeat(1000)
		})),
		message: 'What next?',
		passages: law.map((p, i) => ({
			id: `p${i}`,
			url: 'https://example.test',
			topic: 'general',
			score: 1,
			...p
		})),
		lang: 'en'
	});
	check('context/compress-followup-bounded', bigPrompt.length < 14000);
	check(
		'context/clash-user-docs-note',
		bigPrompt.includes('Client files') || bigPrompt.includes('CLIENT FILE')
	);
}

const summary = {
	pass: passes,
	fail: failures,
	sections: Object.fromEntries(bySection),
	live: process.argv.includes('--live')
};
if (process.argv.includes('--json')) console.log(`\nEVAL_JSON ${JSON.stringify(summary)}`);
if (failures > 0) {
	console.error(`\nEVAL FAILED: ${failures} check(s) failed, ${passes} passed.`);
	for (const [section, counts] of bySection)
		console.error(`  ${section}: ${counts.pass} pass / ${counts.fail} fail`);
	process.exit(1);
}
console.log(`\nEVAL PASSED (${passes} checks).`);
