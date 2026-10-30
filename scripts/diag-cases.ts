/** Focused diagnostic: print anchors + full drops for cases 8/10/12. */
import { planQuestionBatch } from '../src/lib/server/agent/interview/batch.ts';
import { extractCaseState } from '../src/lib/server/agent/interview/facts.ts';
import { searchLegal } from '../src/lib/server/agent/retrieval.ts';
import { newTrace } from '../src/lib/server/agent/observability.ts';

const CASES = [
	{
		id: '8 duplicate-history',
		issue: 'My employer dismissed me without notice',
		history: [{ q: 'Who is the other party?', a: 'Bidii Ltd' }]
	},
	{ id: '10 eviction', issue: 'landlord wants to evict me next week', history: [] },
	{ id: '12 injury', issue: 'I slipped in a supermarket and hurt my back', history: [] }
];

async function main(): Promise<void> {
	for (const c of CASES) {
		const trace = newTrace();
		const state = await extractCaseState(c.issue, c.history, 'en', { trace });
		console.log(`--- ${c.id} missing: ${state.missing.join(', ') || '(none)'}`);
		const lawRows = await searchLegal(
			[c.issue, ...c.history.map((h) => `${h.q} ${h.a}`)].join(' ').slice(0, 1000),
			6,
			undefined,
			undefined,
			trace
		);
		console.log(`\n=== ${c.id} law: ${lawRows.map((p) => p.title).join(' | ')}`);
		const qs = await planQuestionBatch(c.issue, c.history, 'en', { trace });
		console.log(`out: ${qs.map((q) => q.text).join(' || ') || '(none)'}`);
		for (const e of trace.events)
			if (e.name.startsWith('interview:batch')) console.log(`  [${e.name}] ${e.detail}`);
	}
}

void main().then(
	() => process.exit(0),
	(e) => {
		console.error(e);
		process.exit(1);
	}
);
