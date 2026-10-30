/** Throwaway live probe: real model + real retrieval, print questions asked. */
import { planQuestionBatch } from '#lib/server/agent/interview/batch.ts';
import { newTrace } from '#lib/server/agent/observability.ts';
import type { HistoryTurn } from '#lib/server/agent/types.ts';
import type { ResponseLang } from '#lib/server/agent/types.ts';

const cases: Array<{ issue: string; lang: ResponseLang; history?: HistoryTurn[] }> = [
	{ issue: 'My employer dismissed me without notice', lang: 'en' },
	{ issue: 'my neighbor built a wall on my land without permission', lang: 'en' },
	{
		issue: 'i bought a car from someone and they havent transferred ownership to me yet',
		lang: 'en'
	},
	{
		issue:
			'On 12 May 2025 my landlord John Kamau locked me out of my house in Kisumu and kept my deposit',
		lang: 'en'
	},
	{ issue: 'I lent KES 50000 to a friend and now they refuse to pay me back', lang: 'en' },
	{ issue: 'my landlord wants to evict me next week', lang: 'en' },
	{ issue: 'my father died without a will and we need to divide his land', lang: 'en' },
	{
		issue: 'my employer gave me a salary advance and now deducts half of my pay every month',
		lang: 'en'
	},
	{
		issue:
			'someone stole my phone last week in town, I reported to the police and got an OB number',
		lang: 'en'
	},
	{
		issue: 'My employer dismissed me without notice',
		lang: 'en',
		history: [{ q: 'What is the name of your employer?', a: 'Bidii Ltd' }]
	},
	{ issue: 'jirani amevamia shamba langu', lang: 'sw' },
	{ issue: 'nilipata ajali barabarani jana, gari langu liliharibiwa vibaya', lang: 'sw' }
];

for (const c of cases) {
	const trace = newTrace();
	console.log(`\n===== ISSUE (${c.lang}): ${c.issue.slice(0, 80)}`);
	if (c.history) console.log(`  history: ${c.history.map((h) => `Q:${h.q} A:${h.a}`).join(' | ')}`);
	try {
		const out = await planQuestionBatch(c.issue, c.history ?? [], c.lang, { trace });
		for (const q of out) console.log(`  Q [${q.id}] (${q.type}): ${q.text}`);
		if (out.length === 0) console.log('  (no questions)');
		for (const e of trace.events) {
			if (
				e.name.startsWith('interview:batch') ||
				e.name === 'interview:theory' ||
				e.name === 'interview:translate'
			)
				console.log(`  [trace] ${e.name} ${e.detail ?? ''}`.slice(0, 400));
		}
	} catch (err) {
		console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}
}
console.log('\nDONE');
process.exit(0);
