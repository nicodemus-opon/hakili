/** Focused live probe: Kiswahili only, with translate-trace visibility. */
import { planQuestionBatch } from '#lib/server/agent/interview/batch.ts';
import { newTrace } from '#lib/server/agent/observability.ts';

const cases = [
	'jirani amevamia shamba langu',
	'nilipata ajali barabarani jana, gari langu liliharibiwa vibaya'
];

for (const issue of cases) {
	const trace = newTrace();
	console.log(`\n===== ISSUE (sw): ${issue}`);
	try {
		const out = await planQuestionBatch(issue, [], 'sw', { trace });
		for (const q of out) console.log(`  Q [${q.id}] (${q.type}): ${q.text}`);
		if (out.length === 0) console.log('  (no questions)');
		for (const e of trace.events) {
			if (e.name.startsWith('interview:batch') || e.name === 'interview:translate')
				console.log(`  [trace] ${e.name} ${e.detail ?? ''}`.slice(0, 500));
		}
	} catch (err) {
		console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}
}
console.log('\nDONESW');
process.exit(0);
