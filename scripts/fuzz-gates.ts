/** Sync adversarial fuzz of pure gates (no model/DB). Run, patch, repeat. */
import {
	presupposesUnknownDocument,
	isGenericQuestion,
	isSingleConcept,
	hasVagueIntent
} from '../src/lib/server/agent/interview/policy.ts';
import { stripUnsafeDisclaimer, uncitedSections } from '../src/lib/server/agent/plan/validator.ts';

let pass = 0;
let fail = 0;
function check(id: string, got: boolean, want: boolean) {
	if (got === want) {
		pass++;
		console.log(`  ok ${id}`);
	} else {
		fail++;
		console.error(`  FAIL ${id} got=${got} want=${want}`);
	}
}
const LAW_CAR =
	'logbook transfer NTSA TIMS sale agreement payment proof Logbook Loan Clearance Letter hire purchase agreement';
const LAW_EMP =
	'Employment Act termination notice hearing written reasons dismissal procedure labour office';

console.log('presuppose fuzz');
const P = presupposesUnknownDocument;
check(
	'loan-letter',
	P(
		"What did the Logbook Loan Clearance Letter say about the car's ownership status?",
		'i bought a car ownership not transferred',
		[],
		LAW_CAR
	),
	true
);
check(
	'lowercase-sale-agreement',
	P(
		'What did the sale agreement say about the payment?',
		'i bought a car ownership not transferred',
		[],
		LAW_CAR
	),
	true
);
check(
	'title-deed',
	P(
		'When was the Title Deed issued?',
		'my neighbor built a wall on my land',
		[],
		'title deed survey lands office'
	),
	true
);
check(
	'lowercase-eviction-notice',
	P(
		'What did the eviction notice say?',
		'landlord wants to evict me',
		[],
		'eviction notice rent tribunal procedure'
	),
	true
);
check(
	'user-doc-ok',
	P(
		'What did the termination letter say?',
		'employer dismissed me',
		[{ q: 'proof?', a: 'I have the termination letter' }],
		LAW_EMP
	),
	false
);
check(
	'user-word-ok',
	P('What did the notice say?', 'dismissed without notice', [], LAW_EMP),
	false
);
check(
	'existential-ok',
	P(
		'Were you given a Hire Purchase Agreement when you bought the car?',
		'i bought a car',
		[],
		LAW_CAR
	),
	false
);
check(
	'existential-was-there-ok',
	P('Was there a written agreement for the sale?', 'i bought a car', [], LAW_CAR),
	false
);
check(
	'single-noun-seller-ok',
	P('What did the seller say?', 'i bought a car from someone', [], 'seller transfer TIMS'),
	false
);
check(
	'single-noun-notice-ok',
	P('When was the notice issued?', 'dismissed without notice', [], LAW_EMP),
	false
);
check(
	'statute-quiz-flagged',
	P('What does the Employment Act say about dismissal?', 'dismissed without notice', [], LAW_EMP),
	true
);
check(
	'unrelated-q-ok',
	P('On what date did this happen?', 'dismissed without notice', [], LAW_EMP),
	false
);
check(
	'empty-law',
	P('What did the Logbook Loan Clearance Letter say?', 'i bought a car', [], ''),
	false
);
check(
	'swahili-frame',
	P('Barua ya kufukuzwa ilisema nini?', 'mwajiri alinifuta kazi', [], 'barua notice'),
	false
);

console.log('generic interplay');
check(
	'loan-q-generic',
	isGenericQuestion('What is the loan amount?', 'i bought a car ownership not transferred', [], ''),
	true
);

console.log('disclaimer fuzz');
const safe =
	'## Situation Summary\nX.\n\n## Disclaimer\nThis is not legal advice; confirm with a qualified lawyer on 0800 720 640.';
check('safe-kept', stripUnsafeDisclaimer(safe, 'en') === safe, true);
check(
	'weak-stripped',
	!stripUnsafeDisclaimer(
		'## Situation Summary\nX.\n\n## Disclaimer\nGeneral info only, see a professional.',
		'en'
	).includes('Disclaimer'),
	true
);
check(
	'dup-weak-stripped',
	!stripUnsafeDisclaimer(
		'## Situation Summary\nX.\n\n## Disclaimer\nGeneral info.\n\n## Disclaimer\nMore general info.',
		'en'
	).includes('Disclaimer'),
	true
);
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

console.log('uncited fuzz');
const EMP = [
	{
		title: 'E',
		citation: 'c',
		content:
			'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
	}
];
check(
	'unsupported-flagged',
	uncitedSections(
		'## Situation Summary\nThe moon landing was faked by your employer last Tuesday morning.\n\n## Disclaimer\nThis is not legal advice; see a lawyer.',
		'en',
		EMP
	).length > 0,
	true
);
check(
	'supported-clean',
	uncitedSections(
		'## Situation Summary\nAn employer must give written notice before dismissal [1].\n\n## Disclaimer\nThis is not legal advice; see a lawyer.',
		'en',
		EMP
	).length === 0,
	true
);
check(
	'no-passages-clean',
	uncitedSections('## Situation Summary\nAnything at all here today now.', 'en', []).length === 0,
	true
);

console.log('aux doubles + meta-framing fuzz');
const SC = isSingleConcept;
check(
	'aux-double',
	SC('Were you employed by a specific employer and did the slip occur during your work hours?'),
	false
);
check('aux-single-did', SC('Did the seller sign the transfer forms?'), true);
check('aux-single-was-there', SC('Was there a written agreement for the sale?'), true);
check('aux-single-have', SC('Have you reported to the labour office about the dismissal?'), true);
check(
	'lived-hire-purchase',
	SC('Were you given a Hire Purchase Agreement when you bought the car?'),
	true
);
check('wengine-vague', hasVagueIntent('Wanaamka wengine na kesi yangu?'), true);
check('kwa-mfano-vague', hasVagueIntent('Kwa mfano wa kazi, unapewa nafasi ya kujieleza?'), true);
check('for-example-vague', hasVagueIntent('For example, were you given notice?'), true);
check('kilichotokea-vague', hasVagueIntent('Nini kilichotokea siku hiyo?'), true);
check('good-sw-kept', hasVagueIntent('Ulipewa nafasi ya kujieleza kabla ya kufukuzwa?'), false);
check(
	'meta-generic',
	isGenericQuestion(
		'Kwa mfano wa kazi yasiyo kusikiliza, unapewa nafasi ya kujieleza?',
		'mwajiri alinifuta kazi bila notisi',
		[],
		''
	),
	true
);

console.log(`\nFUZZ ${pass} pass / ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
