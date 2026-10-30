/** Fuzz round 3: repair isolation, disclaimer i18n, aux edge cases (pure). */
import { isSingleConcept, hasVagueIntent } from '../src/lib/server/agent/interview/policy.ts';
import {
	packNumbered,
	selectRepairPassages,
	stripUnsafeDisclaimer,
	uncitedSections
} from '../src/lib/server/agent/plan/validator.ts';

let pass = 0;
let fail = 0;
function check(id: string, got: boolean, want: boolean) {
	if (got === want) {
		pass++;
	} else {
		fail++;
		console.error(`  FAIL ${id} got=${got} want=${want}`);
	}
}

console.log('aux edge cases');
check('or-double', isSingleConcept('Did you sign it or was it stamped?'), false);
check('wh-plus-aux-double', isSingleConcept('What did you do and when?'), false);
check(
	'relative-who-ok',
	isSingleConcept('What is the name of the person who sold you the car?'),
	true
);
check('no-question-mark-single', isSingleConcept('Were you dismissed'), true);
check('empty', isSingleConcept(''), false);
check('if-you-kept-out', hasVagueIntent('What would you do if you were the employer?'), true);

console.log('repair isolation');
const P = [
	{ title: 'A', citation: 'c1', content: 'dismissal notice written warning procedure hearing' },
	{ title: 'B', citation: 'c2', content: 'land boundary beacon survey title deed' },
	{ title: 'C', citation: 'c3', content: 'termination notice period final dues contract' }
];
const sel = selectRepairPassages(P, ['weak section about dismissal notice final dues'], 2);
check('repair-ranks', JSON.stringify(sel.map((p) => p.n)) === JSON.stringify([1, 3]), true);
check('repair-empty-bodies', selectRepairPassages(P, [], 2).map((p) => p.n).length === 2, true);
check('repair-zero', selectRepairPassages(P, ['x'], 0).length === 0, true);
const packed = packNumbered(sel, 100000);
check(
	'repair-numbers',
	packed.includes('[1] A') && packed.includes('[3] C') && !packed.includes('[2]'),
	true
);
const cut = packNumbered(
	P.map((p, i) => ({ n: i + 1, ...p })),
	40
);
check('repair-budget', cut.length <= 41, true);

console.log('disclaimer i18n');
const swSafe =
	'## Muhtasari wa Hali\nX.\n\n## Kanusho\nHii sio ushauri wa kisheria. Thibitisha na wakili.';
check('sw-safe-kept', stripUnsafeDisclaimer(swSafe, 'sw') === swSafe, true);
check(
	'sw-weak-stripped',
	!stripUnsafeDisclaimer(
		'## Muhtasari wa Hali\nX.\n\n## Kanusho\nMaelezo ya jumla.',
		'sw'
	).includes('Kanusho'),
	true
);
check(
	'wrong-lang-heading-kept',
	stripUnsafeDisclaimer('## Disclaimer\nThis is not legal advice; see a lawyer.', 'sw').includes(
		'## Disclaimer'
	),
	true
);
check('no-headings', stripUnsafeDisclaimer('Plain text.', 'en') === 'Plain text.', true);

console.log('uncited edge');
check(
	'all-supported',
	uncitedSections(
		'## Situation Summary\nAn employer must give written notice before dismissal [1].\n\n## Disclaimer\nThis is not legal advice; see a lawyer.',
		'en',
		[{ content: 'An employer must give written notice before dismissal.' }]
	).length === 0,
	true
);
check(
	'short-sections-ignored',
	uncitedSections(
		'## Situation Summary\nHi.\n\n## Disclaimer\nThis is not legal advice; see a lawyer.',
		'en',
		[{ content: 'An employer must give written notice.' }]
	).length === 0,
	true
);

console.log(`FUZZ3 ${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
