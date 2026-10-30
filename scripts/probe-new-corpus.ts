/** Probe: do the new batch passages get retrieved for targeted queries? */
import { searchLegal } from '#lib/server/agent/retrieval.ts';

const cases: Array<{ q: string; expect: string[] }> = [
	{ q: 'what makes a will valid signed witnesses', expect: ['ke-suc-will-formal-2026'] },
	{ q: 'wrong CRB listing dispute clearance certificate', expect: ['ke-debt-crb-dispute-2026b'] },
	{ q: 'company misused my personal data complain ODPC', expect: ['ke-priv-odpc-file-2026b'] },
	{ q: 'seller will not transfer logbook TIMS', expect: ['ke-traf-tims-transfer-2026b'] },
	{
		q: 'spousal consent selling matrimonial land',
		expect: ['ke-land-spouse-consent-2026']
	},
	{ q: 'beatmaker split sheet collaboration shares', expect: ['ke-ip-split-sheet-2026b'] },
	{ q: 'loan deduction from salary limits employer', expect: ['ke-debt-salary-deduction-2026b'] },
	{ q: 'assaulted need P3 form medical evidence', expect: ['ke-crim-assault-occasioning-2026'] },
	{ q: 'auction notice redeem property before sale', expect: ['ke-debt-auction-notice-2026b'] },
	{ q: 'dismissed while pregnant maternity protection', expect: ['ke-emp-maternity-dismiss-2026'] }
];

let hits = 0;
for (const c of cases) {
	const passages = await searchLegal(c.q, 5);
	const ids = passages.map((p) => p.id);
	const found = c.expect.filter((e) => ids.includes(e));
	if (found.length > 0) hits++;
	console.log(`\nQ: ${c.q}`);
	console.log(`  expect: ${c.expect.join(', ')} -> ${found.length > 0 ? 'HIT' : 'MISS'}`);
	for (const p of passages.slice(0, 3)) console.log(`    [${p.topic}] ${p.id}`);
}
console.log(`\nTargeted retrieval: ${hits}/${cases.length} hit in top-5`);
process.exit(hits === cases.length ? 0 : 1);
