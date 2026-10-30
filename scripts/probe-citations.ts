/** End-to-end: do generated plans cite the new batch passages? */
import { runPlanPipeline } from '#lib/server/agent/pipeline.ts';

const cases = [
	{
		issue: 'My father died without a will. How do we share his land?',
		answers: { party: 'my siblings and I', when_where_proof: 'he died last year in Nakuru' },
		expect: [
			'ke-suc-will-formal-2026',
			'ke-suc-intestate-spouse-2026',
			'ke-suc-chiefs-letter-2026b'
		]
	},
	{
		issue: 'I was listed with CRB by mistake and the lender ignores me. What can I do?',
		answers: { party: 'the digital lender', when_where_proof: 'last month' },
		expect: ['ke-debt-crb-dispute-2026b', 'ke-debt-crb-clearance-2026']
	}
];

for (const c of cases) {
	console.log(`\n===== ISSUE: ${c.issue}`);
	try {
		const out = await runPlanPipeline({
			issue: c.issue,
			answers: c.answers,
			questions: [],
			langPref: 'en',
			agentId: 'ask',
			documentIds: []
		});
		const cited = out.passages.map((p) => p.id);
		console.log(`  passages used (${cited.length}):`);
		for (const id of cited) {
			const isNew =
				/ke-(suc|debt|priv|traf|land|ip|emp|fam|hou|con|biz|gen|proc|crim)-.*-2026b?$/.test(id);
			console.log(`    ${isNew ? 'NEW' : 'old'} ${id}`);
		}
		const hit = c.expect.filter((e) => cited.includes(e));
		console.log(`  expected cited: ${hit.length > 0 ? hit.join(', ') : '(none of expected)'}`);
	} catch (err) {
		console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}
}
console.log('\nDONE-CITE');
process.exit(0);
