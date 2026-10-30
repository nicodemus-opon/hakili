/** Focused live probe: advice question vs case description. */
import { planQuestionBatch } from '#lib/server/agent/interview/batch.ts';
import { newTrace } from '#lib/server/agent/observability.ts';

const cases = [
	'can my employer dismiss me without a notice',
	'My employer dismissed me without notice'
];

for (const issue of cases) {
	const trace = newTrace();
	console.log(`\n===== ISSUE: ${issue}`);
	try {
		const out = await planQuestionBatch(issue, [], 'en', { trace });
		for (const q of out) console.log(`  Q [${q.id}] (${q.type}): ${q.text}`);
		if (out.length === 0) console.log('  (no questions)');
		for (const e of trace.events) {
			if (e.name.startsWith('interview:'))
				console.log(`  [trace] ${e.name} ${e.detail ?? ''}`.slice(0, 300));
		}
	} catch (err) {
		console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}
}
console.log('\nDONE-ADVICE');
process.exit(0);
