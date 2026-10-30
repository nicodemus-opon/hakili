/** Trace diagnostic for silent batches: prints drop reasons. */
import { planQuestionBatch } from '../src/lib/server/agent/interview/batch.ts';
import { newTrace } from '../src/lib/server/agent/observability.ts';

async function main(): Promise<void> {
	for (const issue of [
		'mkopo sijalipa deni, mdai ananitishia',
		'baba amefariki bila wosia kugawa shamba',
		'beat yangu imeibiwa'
	]) {
		const trace = newTrace();
		const lang = /[a-z]*[aeiou]{2}/.test(issue) ? ('sw' as const) : ('sw' as const);
		const qs = await planQuestionBatch(issue, [], lang, { trace });
		console.log(`\n### ${issue}\nquestions: ${qs.map((q) => q.text).join(' || ') || '(none)'}`);
		for (const e of trace.events) console.log(`  [${e.name}] ${(e.detail ?? '').slice(0, 300)}`);
	}
}

void main().then(
	() => process.exit(0),
	(e) => {
		console.error(e);
		process.exit(1);
	}
);
