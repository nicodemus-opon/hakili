import { describe, expect, it } from 'vitest';
import { diversifyPassages, fuseRankings } from './retrieval.ts';
import {
	firstClause,
	hasDanglingDefinite,
	isAnchored,
	isDuplicateQuestion,
	isGenericQuestion,
	isGroundedInIssue,
	isGroundedInLaw,
	isSingleConcept,
	isSubstantiveEvidence,
	isUserEcho,
	presupposesUnknownDocument
} from './interview/policy.ts';
import { isDegenerateText, judgeEntitiesGrounded } from './interview/loop.ts';
import { planQuestionBatch } from './interview/batch.ts';
import type { CaseState } from './interview/facts.ts';
import { outputMatchesLang } from './language.ts';
import {
	assignCitations,
	citationCoverage,
	factualSentences,
	groundingScore,
	hasSafetyFooter,
	isThinPlan,
	packNumbered,
	packPassages,
	pruneOptionalSections,
	selectRepairPassages,
	sentenceSupported,
	splitSections,
	stripUnsafeDisclaimer,
	uncitedSections,
	verifyCitations,
	verifyQuoteSpans,
	weakSections
} from './plan/validator.ts';

function row(id: string) {
	return {
		id,
		title: id,
		citation: id,
		url: 'https://example.test',
		content: 'content',
		topic: 'general'
	};
}

describe('fuseRankings', () => {
	it('prefers items ranked highly in both legs', () => {
		const fused = fuseRankings([row('a'), row('b')], [row('b'), row('c')], 1, 3);
		expect(fused[0]?.id).toBe('b');
		expect(fused.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
	});

	it('weights the FTS leg higher when expanded', () => {
		const low = fuseRankings([row('a')], [row('b')], 1, 2);
		const high = fuseRankings([row('a')], [row('b')], 3, 2);
		expect(high[0]?.id).toBe('b');
		expect(low[0]?.id).toBe('a');
	});
});

describe('citation verifier', () => {
	it('drops out-of-range markers', () => {
		expect(verifyCitations('Claim [1] and more [9].', 2)).toBe('Claim [1] and more.');
	});

	it('strips all markers when no passages exist', () => {
		expect(verifyCitations('Claim [1].', 0)).toBe('Claim.');
	});
});

describe('quote-span verifier (adversarial)', () => {
	const passages = [
		{
			title: 'Employment Act',
			citation: 'Employment Act, 2007',
			content:
				'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
		},
		{
			title: 'Logbook transfer',
			citation: 'NTSA TIMS',
			content:
				'Motor vehicle ownership passes when the seller initiates transfer on TIMS and the buyer accepts with sale agreement and payment proof.'
		}
	];

	it('keeps markers whose sentence shares a quoted span with the passage', () => {
		const text = 'An employer must give written notice before dismissal [1].';
		expect(verifyQuoteSpans(text, passages)).toContain('[1]');
	});

	it('strips invented claims wearing a valid marker', () => {
		const text = 'The moon landing was faked by your employer [1].';
		const out = verifyQuoteSpans(text, passages);
		expect(out).not.toContain('[1]');
		expect(out).toContain('moon landing');
	});

	it('strips cross-citation (sentence matches passage 2 but cites 1)', () => {
		const text = 'The seller initiates transfer on TIMS with payment proof [1].';
		expect(verifyQuoteSpans(text, passages)).not.toContain('[1]');
	});

	it('scores grounding as supported/cited ratio', () => {
		const good = 'An employer must give written notice before dismissal [1].';
		const bad = 'The moon landing was faked by your employer [1].';
		expect(groundingScore(good, passages)).toBe(1);
		expect(groundingScore(bad, passages)).toBe(0);
		expect(groundingScore('No citations here.', passages)).toBe(1);
		expect(groundingScore('Claim [1].', [])).toBe(0);
		expect(
			groundingScore(
				'An employer must give written notice before dismissal [1]. The moon is cheese [1].',
				passages
			)
		).toBe(0.5);
	});

	it('strips single-token overlap and bare markers', () => {
		expect(verifyQuoteSpans('The employer danced at lunch [1].', passages)).not.toContain('[1]');
		expect(verifyQuoteSpans('[1]', passages)).not.toContain('[1]');
	});

	it('preserves plan line breaks and headings verbatim', () => {
		const plan =
			'## Situation Summary\nAn employer must give written notice before dismissal [1].\n\n## Note\nThis is not legal advice.';
		const out = verifyQuoteSpans(plan, passages);
		expect(out).toContain('## Situation Summary\n');
		expect(out).toContain('\n\n## Note\n');
		expect(out).toContain('[1]');
	});
});

describe('passage packing (adversarial)', () => {
	it('never cuts mid-word and prefers sentence boundaries', () => {
		const passages = [
			{
				title: 'A',
				citation: 'c1',
				content: 'First sentence about notice. Second sentence about dismissal terms here.'
			},
			{
				title: 'B',
				citation: 'c2',
				content: 'Another passage with more words about contracts and deadlines.'
			}
		];
		const packed = packPassages(passages, 80);
		expect(packed.length).toBeLessThanOrEqual(81);
		expect(packed.endsWith('…') || /[.!?]$/.test(packed)).toBe(true);
		// No mid-word cut: the last word before … must be a complete source word.
		if (packed.endsWith('…')) {
			const tailWord = packed.replace(/…$/, '').split(/\s+/).pop() ?? '';
			expect('First sentence about notice. Second sentence about dismissal terms here.').toContain(
				tailWord
			);
		}
	});

	it('returns full text when under budget', () => {
		const passages = [{ title: 'A', citation: 'c1', content: 'Short.' }];
		expect(packPassages(passages, 5000)).toContain('[1] A');
	});
});

describe('retrieval diversity (adversarial)', () => {
	function passage(id: string, topic: string, content: string) {
		return {
			id,
			title: id,
			citation: id,
			url: 'https://example.test',
			content,
			topic,
			score: 1
		};
	}

	it('drops exact near-duplicates', () => {
		const dup = 'Same content about dismissal notice '.repeat(4);
		const out = diversifyPassages(
			[passage('a', 'employment', dup), passage('b', 'employment', dup)],
			3
		);
		expect(out.map((p) => p.id)).toEqual(['a']);
	});

	it('caps a dominant topic so minorities survive', () => {
		const list = [
			passage('e1', 'employment', 'dismissal notice content alpha one'),
			passage('e2', 'employment', 'dismissal notice content beta two'),
			passage('e3', 'employment', 'dismissal notice content gamma three'),
			passage('l1', 'land', 'boundary encroachment dispute content delta')
		];
		const out = diversifyPassages(list, 2, 3);
		expect(out.map((p) => p.id)).toContain('l1');
		expect(out.filter((p) => p.topic === 'employment')).toHaveLength(2);
	});

	it('fill pass never starves a single-topic answer', () => {
		const list = [
			passage('e1', 'employment', 'dismissal notice content alpha one'),
			passage('e2', 'employment', 'dismissal notice content beta two'),
			passage('e3', 'employment', 'dismissal notice content gamma three')
		];
		const out = diversifyPassages(list, 1, 3);
		expect(out.map((p) => p.id)).toEqual(['e1', 'e2', 'e3']);
	});
});

describe('interview anchoring (adversarial)', () => {
	it('detects concrete detail structurally', () => {
		expect(isAnchored('When exactly in May 2024 were you dismissed?')).toBe(true);
		expect(isAnchored('Who is the other party in this matter?')).toBe(false);
		expect(isAnchored('')).toBe(false);
	});

	it('never emits who/what/when/where scaffolding — uncovered dims are skipped', async () => {
		// The universal ladder is deleted. Model down (or all drafts
		// dropped) means NO questions for the missing dimensions, never a
		// generic fallback. The interview goes straight to the plan.
		const out = await planQuestionBatch(
			'employer dismissed me without notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				draft: async () => {
					throw new Error('model down');
				}
			}
		);
		expect(out).toEqual([]);
	});
});

describe('batch drafting without scaffolding (live repros)', () => {
	it('screenshot follow-up: model drafts off the fresh answer, never scaffolding', async () => {
		// User: "employer dismissed me with no notice" -> Q1 (name).
		// User answers "storyblok gmbh, no action" -> party is known via the
		// extractor backstop; the follow-up must be drafted from the answers,
		// never a who/what/when/where form.
		const out = await planQuestionBatch(
			'employer dismissed me with no notice',
			[{ q: 'What is the other party\u2019s name?', a: 'storyblok gmbh, no action' }],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				lawHints:
					'- Employment Act: An employer must give written notice before termination. Unfair dismissal can be challenged.',
				lawContext:
					'Employment Act An employer must give written notice before termination Unfair dismissal can be challenged',
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'On what date did Storyblok dismiss you?',
							type: 'text',
							anchors: ['storyblok']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual(['On what date did Storyblok dismiss you?']);
	});

	it('substantive evidence is structural, not a word list', () => {
		// Names and facts pass in any language; thin air fails everywhere.
		// This replaced a multilingual evasion regex ("none", "hakuna", ...).
		expect(isSubstantiveEvidence('John Kamau')).toBe(true);
		expect(isSubstantiveEvidence('Bidii Ltd')).toBe(true);
		expect(isSubstantiveEvidence('storyblok gmbh, no action')).toBe(true);
		expect(isSubstantiveEvidence('12 May 2025')).toBe(true);
		expect(isSubstantiveEvidence('locked me out')).toBe(true);
		expect(isSubstantiveEvidence('none')).toBe(false);
		expect(isSubstantiveEvidence('hakuna')).toBe(false);
		expect(isSubstantiveEvidence('sijui')).toBe(false);
		expect(isSubstantiveEvidence('hapana')).toBe(false);
		expect(isSubstantiveEvidence('idk')).toBe(false);
		expect(isSubstantiveEvidence('yes')).toBe(false);
		expect(isSubstantiveEvidence('no action')).toBe(false);
		expect(isSubstantiveEvidence('n/a')).toBe(false);
		expect(isSubstantiveEvidence('')).toBe(false);
	});

	it('law-grounded anchors keep lawyer-like drafts (live repro)', async () => {
		// "termination" is not in the issue — it comes from retrieved law.
		// The old verbatim-only gate dropped this good draft as invalid-anchor.
		const out = await planQuestionBatch(
			'employer dismissed me with no notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['docs_deadline'] },
				lawHints: '- Employment Act: An employer must give written notice before termination.',
				lawContext: 'Employment Act An employer must give written notice before termination',
				draft: async () => ({
					questions: [
						{
							dimension: 'docs_deadline',
							text: 'What did your written termination notice say?',
							type: 'text',
							anchors: ['termination', 'notice']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual(['What did your written termination notice say?']);
	});

	it('firstClause salvages doubles to their first question', () => {
		expect(firstClause('When was the notice sent and what did it say?')).toBe(
			'When was the notice sent?'
		);
		expect(firstClause('What is the name of the person who sold you the car?')).toBeNull();
		expect(firstClause('Who is the other party in this matter?')).toBeNull();
		expect(firstClause('')).toBeNull();
	});

	it('batch splits doubles instead of falling back to the ladder (live repro)', async () => {
		const out = await planQuestionBatch(
			'employer dismissed me with no notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				lawHints: '- Employment Act: An employer must give written notice before termination.',
				lawContext: 'Employment Act An employer must give written notice before termination',
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'When was the termination notice sent and what did it say?',
							type: 'text',
							anchors: ['termination', 'notice']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual(['When was the termination notice sent?']);
	});

	it('batch kills invented entities via the semantic judge (live repro)', async () => {
		// "caretaker or agent" shares the user noun "wall" (passes token
		// gates and the user-anchor rule), so only the judge can kill it.
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				lawHints: '- Land boundaries: Verify title deeds and beacons through an official search.',
				lawContext: 'Land boundaries Verify title deeds and beacons through an official search',
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'Was there a caretaker or agent near the wall?',
							type: 'text',
							anchors: ['wall']
						}
					]
				}),
				judgeGrounded: async (text) => !/caretaker|agent/i.test(text)
			}
		);
		// Invention killed, dimension uncovered, ladder deleted: no question.
		expect(out).toEqual([]);
	});

	it('batch retries uncovered dimensions instead of laddering them (live repro)', async () => {
		// First response covers party twice (second is dup-dim) and nothing
		// else; the targeted retry drafts the missing dimension.
		let calls = 0;
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				lawHints:
					'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
				lawContext:
					'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor',
				draft: async () => {
					calls++;
					if (calls === 1)
						return {
							questions: [
								{
									dimension: 'party',
									text: 'What is the name of the neighbor?',
									type: 'text',
									anchors: ['neighbor']
								},
								{
									dimension: 'party',
									text: 'What is the name of the person who built the wall?',
									type: 'text',
									anchors: ['wall']
								}
							]
						};
					return {
						questions: [
							{
								dimension: 'when_where_proof',
								text: 'When did the licensed surveyor confirm the beacons on your wall?',
								type: 'text',
								anchors: ['surveyor', 'wall']
							}
						]
					};
				}
			}
		);
		expect(calls).toBe(2);
		expect(out.map((q) => q.text)).toEqual([
			'What is the name of the neighbor?',
			'When did the licensed surveyor confirm the beacons on your wall?'
		]);
	});

	it('batch splits a double even when the second half is vague (live repro)', async () => {
		// "...and what do you want?" trips the vague-intent list, so the full
		// draft reads as generic — but the first half is clean and grounded.
		const out = await planQuestionBatch(
			'employer dismissed me with no notice',
			[
				{
					q: 'You said "employer dismissed me with no notice" — what exactly happened?',
					a: 'storyblok gmbh, no action'
				}
			],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				lawHints: '- Employment Act: An employer must give written notice before termination.',
				lawContext: 'Employment Act An employer must give written notice before termination',
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'When was the notice sent and what do you want?',
							type: 'text',
							anchors: ['notice']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual(['When was the notice sent?']);
	});
});

describe('swahili translate-back (draft EN, verify SW)', () => {
	const landLaw = {
		lawHints:
			'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
		lawContext:
			'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor'
	};
	const enDraft = () => ({
		questions: [
			{
				dimension: 'when_where_proof',
				text: 'Did the licensed surveyor confirm the beacons on your shamba?',
				type: 'text',
				anchors: ['shamba', 'beacons']
			}
		]
	});

	it('translates verified Swahili and keeps shape', async () => {
		const out = await planQuestionBatch(
			'jirani amevamia shamba langu',
			[],
			'sw',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => enDraft(),
				translate: async (items) => ({
					items: items.map((i) => ({
						...i,
						text: 'Je, mpimaji alithibitisha alama za shamba lako?'
					}))
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual(['Je, mpimaji alithibitisha alama za shamba lako?']);
		expect(out[0]?.type).toBe('text');
	});

	it('drops items that come back in the wrong language', async () => {
		const out = await planQuestionBatch(
			'jirani amevamia shamba langu',
			[],
			'sw',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => enDraft(),
				translate: async (items) => ({ items })
			}
		);
		expect(out).toEqual([]);
	});

	it('drops fluent Swahili that names nothing in the issue', async () => {
		const out = await planQuestionBatch(
			'jirani amevamia shamba langu',
			[],
			'sw',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				lawHints:
					'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
				lawContext:
					'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor',
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'Did the licensed surveyor confirm the beacons on your shamba?',
							type: 'text',
							anchors: ['shamba', 'beacons']
						}
					]
				}),
				translate: async (items) => ({
					items: items.map((i) => ({ ...i, text: 'Habari za asubuhi njema sana rafiki yangu' }))
				})
			}
		);
		expect(out).toEqual([]);
	});

	it('never calls translate on the English path', async () => {
		let called = 0;
		await planQuestionBatch(
			'my employer dismissed me',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				draft: async () => ({
					questions: [{ dimension: 'party', text: 'x', type: 'text', anchors: [] }]
				}),
				translate: async (items) => {
					called++;
					return { items };
				}
			}
		);
		expect(called).toBe(0);
	});
});

describe('specificity floor (thin drafts)', () => {
	const landLaw = {
		lawHints: '- Land deadlines: The registrar sets a deadline for objections.',
		lawContext: 'Land deadlines registrar sets deadline objections'
	};

	it('drops a law-stapled bare shape, keeps it once it names the case', async () => {
		const thin = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'Was there a deadline?',
							type: 'text',
							anchors: []
						}
					]
				})
			}
		);
		expect(thin).toEqual([]);
		const pinned = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'Was there a deadline for your wall?',
							type: 'text',
							anchors: ['wall']
						}
					]
				})
			}
		);
		expect(pinned.map((q) => q.text)).toEqual(['Was there a deadline for your wall?']);
	});

	it('drops content-free salvaged halves', async () => {
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'Was there a deadline and what do you want?',
							type: 'text',
							anchors: []
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});
});

describe('intent routing (advice skips the interview)', () => {
	it('precomputed advice returns [] without touching the drafter', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'can my employer dismiss me without a notice',
			[],
			'en',
			{},
			{
				state: {
					known: [],
					missing: ['party', 'when_where_proof', 'steps_outcome', 'docs_deadline']
				},
				advice: true,
				draft: async () => {
					calls++;
					return { questions: [] };
				}
			}
		);
		expect(out).toEqual([]);
		expect(calls).toBe(0);
	});

	it('judge-routed advice skips drafting', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'can my employer dismiss me without a notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				detectAdvice: async () => 'yes',
				draft: async () => {
					calls++;
					return { questions: [] };
				}
			}
		);
		expect(out).toEqual([]);
		expect(calls).toBe(0);
	});

	it('judge-routed case drafts normally', async () => {
		const out = await planQuestionBatch(
			'my neighbor built a wall',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				detectAdvice: async () => 'no',
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'What is the name of the neighbor?',
							type: 'text',
							anchors: []
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual(['What is the name of the neighbor?']);
	});

	it('bracket scaffolding is dropped, never user-facing (live repro)', async () => {
		const out = await planQuestionBatch(
			'employer dismissed me with no notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				lawHints: '- Employment Act: An employer must give written notice before termination.',
				lawContext: 'Employment Act An employer must give written notice before termination',
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'What is the name of [your person or office]?',
							type: 'text',
							anchors: ['notice']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});
});

describe('when_where_proof specificity (two-source grounding)', () => {
	const landLaw = {
		lawHints:
			'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
		lawContext:
			'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor'
	};

	it('drops user-noun-only WH with no statute terms', async () => {
		// Names the story (neighbor, wall) but pins no procedure, document,
		// office, or deadline from the law lines — fits any land case.
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'When did your neighbor build the wall?',
							type: 'text',
							anchors: ['neighbor', 'wall']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});

	it('keeps the statute-specific version of the same fact', async () => {
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'Did the licensed surveyor confirm the beacons on your wall?',
							type: 'text',
							anchors: ['wall', 'beacons']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual([
			'Did the licensed surveyor confirm the beacons on your wall?'
		]);
	});

	it('passes law hints to the simple-prompt fallback', async () => {
		const prompts: string[] = [];
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				...landLaw,
				draft: async (prompt: string) => {
					prompts.push(prompt);
					if (!prompt.includes('Still needed:')) return 'not json';
					return {
						questions: [
							{
								dimension: 'when_where_proof',
								text: 'Did the licensed surveyor confirm the beacons on your wall?',
								type: 'text',
								anchors: ['wall']
							}
						]
					};
				}
			}
		);
		expect(out.map((q) => q.text)).toEqual([
			'Did the licensed surveyor confirm the beacons on your wall?'
		]);
		expect(prompts.some((p) => p.includes('Still needed:') && p.includes('Land boundaries'))).toBe(
			true
		);
	});
});

describe('party re-ask gate (possessives + relative clauses)', () => {
	it('kills "Who is your employer?" — "your" is not new content', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'My employer dismissed me without notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				draft: async () => {
					calls++;
					return {
						questions: [
							{
								dimension: 'party',
								text: 'Who is your employer?',
								type: 'text',
								anchors: ['employer']
							}
						]
					};
				}
			}
		);
		expect(out).toEqual([]);
		expect(calls).toBe(3);
	});

	it('keeps "Who is the neighbor who built the wall?" — relative clause identifies an unnamed person', async () => {
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				lawHints:
					'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
				lawContext:
					'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor',
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'Who is the neighbor who built the wall on your land?',
							type: 'text',
							anchors: ['neighbor', 'wall']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual([
			'Who is the neighbor who built the wall on your land?'
		]);
	});
});

describe('declined dimensions (immaterial, never retried)', () => {
	it('carries agreed theory into the draft prompt', async () => {
		const seen: string[] = [];
		await planQuestionBatch(
			'my employer dismissed me without notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'docs_deadline'] },
				theoryState: {
					claim: 'unfair dismissal without notice',
					decisive: [
						{ dimension: 'docs_deadline', fact: 'whether written notice was given', known: false }
					]
				},
				draft: async (prompt: string) => {
					seen.push(prompt);
					return { questions: [] };
				}
			}
		);
		expect(seen.length).toBeGreaterThan(0);
		expect(seen.some((p) => p.includes('unfair dismissal without notice'))).toBe(true);
		expect(seen.some((p) => p.includes('[docs_deadline] whether written notice was given'))).toBe(
			true
		);
	});

	it('drafts unaided when theory is null (old behavior)', async () => {
		let seen = '';
		await planQuestionBatch(
			'my employer dismissed me without notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				theoryState: null,
				draft: async (prompt: string) => {
					seen = prompt;
					return { questions: [] };
				}
			}
		);
		expect(seen).not.toContain('Agreed case theory');
	});

	it('keeps the more specific rival across retries', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				lawHints:
					'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
				lawContext:
					'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor',
				draft: async () => {
					calls++;
					if (calls === 1)
						return {
							questions: [
								{
									dimension: 'party',
									text: 'What is the name of the neighbor?',
									type: 'text',
									anchors: ['neighbor']
								}
							]
						};
					return {
						questions: [
							{
								dimension: 'party',
								text: 'What is the name of the neighbor who built the wall on your land?',
								type: 'text',
								anchors: ['neighbor', 'wall']
							},
							{
								dimension: 'when_where_proof',
								text: 'Did the licensed surveyor confirm the beacons on your wall?',
								type: 'text',
								anchors: ['wall']
							}
						]
					};
				}
			}
		);
		expect(calls).toBe(2);
		expect(out.map((q) => q.text)).toEqual([
			'What is the name of the neighbor who built the wall on your land?',
			'Did the licensed surveyor confirm the beacons on your wall?'
		]);
	});

	it('retrieves once with the base query (no remedy expansion)', async () => {
		const queries: Array<{ query: string; k: number }> = [];
		const runWith = (missing: Array<'party' | 'steps_outcome'>) =>
			planQuestionBatch(
				'my neighbor built a wall',
				[],
				'en',
				{},
				{
					state: { known: [], missing },
					retrieve: async (query: string, k: number) => {
						queries.push({ query, k });
						return [
							{ title: 'base title', citation: 'base cite', content: 'base content land registrar' }
						];
					},
					draft: async () => ({ questions: [] })
				}
			);
		await runWith(['party', 'steps_outcome']);
		expect(queries).toHaveLength(1);
		expect(queries[0]?.k).toBe(8);
		expect(queries[0]?.query).not.toContain('demand');
		queries.length = 0;
		await runWith(['party']);
		expect(queries).toHaveLength(1);
	});
	const partyQ = {
		dimension: 'when_where_proof',
		text: 'Did the licensed surveyor confirm the beacons on your wall?',
		type: 'text',
		anchors: ['wall']
	};

	it('asks drafted dims, skips declined ones, and makes one call', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				lawHints:
					'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
				lawContext:
					'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor',
				draft: async () => {
					calls++;
					return {
						questions: [
							{
								dimension: 'party',
								text: 'What is the name of the neighbor?',
								type: 'text',
								anchors: ['neighbor']
							}
						],
						skipped: [{ dimension: 'when_where_proof', reason: 'place is visible, no dispute' }]
					};
				}
			}
		);
		expect(calls).toBe(1);
		expect(out.map((q) => q.text)).toEqual(['What is the name of the neighbor?']);
	});

	it('a fully declined batch asks nothing and never retries', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				draft: async () => {
					calls++;
					return {
						questions: [],
						skipped: [
							{ dimension: 'party', reason: 'named in history' },
							{ dimension: 'when_where_proof', reason: 'immaterial' }
						]
					};
				}
			}
		);
		expect(calls).toBe(1);
		expect(out).toEqual([]);
	});

	it('ignores skip entries for unknown dims and still retries the rest', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			'my neighbor built a wall on my land without permission',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				lawHints:
					'- Land boundaries: Verify title deeds and beacons through an official search and licensed surveyor.',
				lawContext:
					'Land boundaries Verify title deeds and beacons through an official search and licensed surveyor',
				draft: async () => {
					calls++;
					if (calls === 1)
						return {
							questions: [
								{
									dimension: 'party',
									text: 'What is the name of the neighbor?',
									type: 'text',
									anchors: ['neighbor']
								}
							],
							skipped: [{ dimension: 'loan_amount', reason: 'not a dimension' }]
						};
					return { questions: [partyQ] };
				}
			}
		);
		expect(calls).toBe(2);
		expect(out.map((q) => q.text)).toEqual([
			'What is the name of the neighbor?',
			'Did the licensed surveyor confirm the beacons on your wall?'
		]);
	});
	it('emits questions in the model’s decisive order, not dimension order', async () => {
		const out = await planQuestionBatch(
			'i bought a car from someone and they havent transferred ownership to me yet',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party', 'when_where_proof'] },
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'On what date did you pay for the car?',
							type: 'text',
							anchors: ['car']
						},
						{
							dimension: 'party',
							text: 'What is the name of the person who sold you the car?',
							type: 'text',
							anchors: ['car']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.id)).toEqual(['q1', 'q2']);
		expect(out.map((q) => q.text)).toEqual([
			'On what date did you pay for the car?',
			'What is the name of the person who sold you the car?'
		]);
	});
});

describe('fact-first batch planner (injected state + drafter)', () => {
	const CAR_ISSUE = 'i bought a car from someone and they havent transferred ownership to me yet';
	const allKnown: CaseState = {
		known: [
			{ dimension: 'party', evidence: 'a car from someone' },
			{ dimension: 'when_where_proof', evidence: 'bought a car' },
			{ dimension: 'steps_outcome', evidence: 'ownership to me yet' },
			{ dimension: 'docs_deadline', evidence: 'transferred ownership' }
		],
		missing: []
	};
	const missing = (...dims: Array<CaseState['missing'][number]>): CaseState => ({
		known: [],
		missing: dims
	});

	it('returns [] without touching the model when nothing is missing', async () => {
		let called = false;
		const out = await planQuestionBatch(
			CAR_ISSUE,
			[],
			'en',
			{},
			{
				state: allKnown,
				draft: async () => {
					called = true;
					return null;
				}
			}
		);
		expect(out).toEqual([]);
		expect(called).toBe(false);
	});

	it('drafts one anchored question per missing dimension, ids follow history', async () => {
		const history = [{ q: 'What outcome do you want?', a: 'ownership transferred to me' }];
		const out = await planQuestionBatch(
			CAR_ISSUE,
			history,
			'en',
			{},
			{
				state: missing('party', 'when_where_proof'),
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'What is the full name of the person who sold you the car?',
							type: 'text',
							anchors: ['car', 'bought']
						},
						{
							dimension: 'when_where_proof',
							text: 'On what date did you pay for the car?',
							type: 'text',
							anchors: ['car']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.id)).toEqual(['q2', 'q3']);
		expect(out[0]?.text).toContain('full name');
		expect(out[1]?.text).toContain('what date');
	});

	it('drops drafts without anchors and asks nothing instead of scaffolding', async () => {
		const out = await planQuestionBatch(
			CAR_ISSUE,
			[],
			'en',
			{},
			{
				state: missing('party'),
				draft: async () => ({
					questions: [{ dimension: 'party', text: 'What was the loan amount?', anchors: ['loan'] }]
				})
			}
		);
		expect(out).toEqual([]);
	});

	it('model down asks nothing instead of generic questions', async () => {
		const out = await planQuestionBatch(
			CAR_ISSUE,
			[],
			'en',
			{},
			{
				state: missing('steps_outcome', 'docs_deadline'),
				draft: async () => {
					throw new Error('model down');
				}
			}
		);
		expect(out).toEqual([]);
	});

	it('a vague answer never loops scaffolding — uncovered dims are skipped', async () => {
		const history = [{ q: 'Which documents can you attach?', a: 'none' }];
		const out = await planQuestionBatch(
			CAR_ISSUE,
			history,
			'en',
			{},
			{
				state: missing('steps_outcome', 'docs_deadline'),
				draft: async () => {
					throw new Error('model down');
				}
			}
		);
		expect(out).toEqual([]);
	});

	it('caps the interview at four questions total', async () => {
		const history = [
			{ q: 'a', a: 'x' },
			{ q: 'b', a: 'y' },
			{ q: 'c', a: 'z' }
		];
		const out = await planQuestionBatch(
			CAR_ISSUE,
			history,
			'en',
			{},
			{
				state: missing('party', 'steps_outcome'),
				draft: async () => null
			}
		);
		expect(out).toEqual([]);
		const done = await planQuestionBatch(
			CAR_ISSUE,
			[...history, { q: 'd', a: 'w' }],
			'en',
			{},
			{
				state: missing('party'),
				draft: async () => null
			}
		);
		expect(done).toEqual([]);
	});

	it('keeps one draft per dimension and dedupes within the batch', async () => {
		const out = await planQuestionBatch(
			CAR_ISSUE,
			[],
			'en',
			{},
			{
				state: missing('party', 'when_where_proof'),
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'What is the name of the person who sold you the car?',
							type: 'text',
							anchors: ['car']
						},
						{
							dimension: 'party',
							text: 'What is the name of the person who sold you the car?',
							type: 'text',
							anchors: ['car']
						}
					]
				})
			}
		);
		// Second party draft is dropped; when_where_proof stays uncovered and is skipped.
		expect(out.map((q) => q.text)).toEqual([
			'What is the name of the person who sold you the car?'
		]);
	});

	it('retries once when the first response is unparseable prose (live repro)', async () => {
		let calls = 0;
		const out = await planQuestionBatch(
			CAR_ISSUE,
			[],
			'en',
			{},
			{
				state: missing('party'),
				draft: async () => {
					calls++;
					if (calls === 1) return 'Sure, here is a good question for the user: ...';
					return {
						questions: [
							{
								dimension: 'party',
								text: 'What is the name of the person who sold you the car?',
								type: 'text',
								anchors: ['car']
							}
						]
					};
				}
			}
		);
		expect(calls).toBe(2);
		expect(out.map((q) => q.text)).toEqual([
			'What is the name of the person who sold you the car?'
		]);
	});
});

describe('section repair targeting', () => {
	const full = [
		'## Facts',
		'The client instructs dismissal without notice in May; the letter is in the bundle.',
		'## Issues',
		'Whether dismissal without notice and hearing was lawful and what remedy lies [1].',
		'## Law',
		'Not available.',
		'## Analysis',
		'On the instructions, lack of notice supports the claim while cause remains to be tested [1].',
		'## Risks',
		'Limitation exposure and the cause defence must be checked on the file [1].',
		'## Next Steps',
		'Not available.',
		'## Deadlines',
		'Verify the 30-day deadline against the current gazette promptly [1].',
		'## Authorities',
		'Not available.',
		'## Urgent',
		'Act quickly so limitation periods do not expire on the claim [1].',
		'## Note',
		'Confirm the authorities are still current before filing, serving, or advising the client.'
	].join('\n');

	it('targets only placeholder sections', () => {
		const weak = weakSections(full, 'en');
		expect(weak).toContain('## Law');
		expect(weak).toContain('## Next Steps');
		expect(weak).not.toContain('## Facts');
		expect(splitSections(full, 'en')).toHaveLength(10);
	});
});

describe('conditional sections (deadlines, risks)', () => {
	const counselMemo = [
		'## Facts',
		'The client instructs dismissal from Bidii Ltd without written notice after two years of service.',
		'## Issues',
		'Whether dismissal without notice and hearing was lawful and what remedy lies [1].',
		'## Law',
		'The Employment Act requires written notice before dismissal; the notice period turns on the contract terms [1].',
		'## Analysis',
		'On the instructions, lack of notice supports the claim while cause remains to be tested [1].',
		'## Risks',
		'The counterargument is summary dismissal for cause; limitation exposure must be checked [1].',
		'## Next Steps',
		'Bundle payslips and the termination message, then prepare for filing and service at the correct forum [1].',
		'## Authorities',
		'Confirm the notice period, pay in lieu of notice, limitation, and whether the authorities are still current [1].',
		'## Note',
		'Confirm the authorities are still current before filing, serving, or advising the client.'
	].join('\n');

	it('a complete counsel memo without optionals is not thin', () => {
		expect(isThinPlan(counselMemo, 'en')).toBe(false);
		expect(weakSections(counselMemo, 'en')).toEqual([]);
	});

	it('prunes thin optional sections but keeps substantive ones', () => {
		const withFiller = `${counselMemo}\n\n## Deadlines\nNot available.\n\n## Urgent\nAct quickly.`;
		const pruned = pruneOptionalSections(withFiller, 'en');
		expect(pruned).not.toContain('## Deadlines');
		expect(pruned).not.toContain('## Urgent');
		expect(pruned).toContain('## Facts');
		const withReal = `${counselMemo}\n\n## Deadlines\nVerify the thirty day notice period against the current gazette promptly this week [1].`;
		expect(pruneOptionalSections(withReal, 'en')).toContain('## Deadlines');
	});
});

describe('professional note (counsel safety)', () => {
	it('requires disclaimer heading + advice label + human referral', () => {
		const good =
			'## Facts\nThe client instructs dismissal.\n\n## Note\nConfirm the authorities are still current before filing, serving, or advising the client.';
		expect(hasSafetyFooter(good, 'en')).toBe(true);
		expect(hasSafetyFooter('## Facts\nX.\n\n## Note\nGeneral information only.', 'en')).toBe(false);
		expect(hasSafetyFooter('Verify nothing; see anyone.', 'en')).toBe(false);
		const sw =
			'## Ukweli\nX.\n\n## Ujumbe\nThibitisha kwamba mamlaka bado ni za sasa kabla ya kufungua, kuwasilisha, au kushauri mteja.';
		expect(hasSafetyFooter(sw, 'sw')).toBe(true);
	});
});

describe('citation coverage (anti-vacuous grounding)', () => {
	const employment = [
		{
			title: 'Employment Act',
			citation: 'Employment Act, 2007',
			content:
				'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
		}
	];
	it('scores uncited factual claims low instead of vacuously passing', () => {
		const uncited = 'An employer must give written notice before dismissal.';
		expect(groundingScore(uncited, employment)).toBe(1);
		expect(citationCoverage(uncited, employment)).toBe(1);
		const unrelated = [
			{
				title: 'Logbook',
				citation: 'NTSA TIMS',
				content: 'Motor vehicle ownership passes on TIMS with sale agreement and payment proof.'
			}
		];
		expect(citationCoverage(uncited, unrelated)).toBe(0);
	});

	it('ignores the disclaimer section and rewards empty factual bodies', () => {
		const disclaimerOnly =
			'## Note\nConfirm the authorities are still current before filing, serving, or advising the client.';
		expect(factualSentences(disclaimerOnly, 'en')).toEqual([]);
		expect(citationCoverage(disclaimerOnly, employment)).toBe(1);
	});

	it('scores zero claims with zero passages as unsatisfiable', () => {
		expect(citationCoverage('An employer must give written notice before dismissal [1].', [])).toBe(
			0
		);
	});
});

describe('very-good bar (adversarial, 10 rounds)', () => {
	it('round 1: template scaffolding dies without a law hook, not via denylist', () => {
		// No denylist: these die because they name nothing from the statute,
		// not because a regex lists "outcome" or "tell me more".
		const law = 'Employment Act termination notice hearing fair procedure labour office';
		for (const q of [
			'What outcome do you want?',
			'Who else is involved?',
			'Tell me more about it',
			'What happened?'
		]) {
			expect(isGroundedInLaw(q, law)).toBe(false);
		}
		expect(isGroundedInLaw('Were you given a chance to be heard before the dismissal?', law)).toBe(
			true
		);
		expect(
			isGroundedInIssue(
				'What sale agreement and payment proof do you have for the car?',
				'i bought a car ownership not transferred',
				[],
				''
			)
		).toBe(true);
	});

	it('round 2: how/why join double-barrelled questions', () => {
		expect(isSingleConcept('How was the dismissal and when did it happen?')).toBe(false);
		expect(isSingleConcept('Why were you dismissed and what proof do you have?')).toBe(false);
		expect(isSingleConcept('How were you dismissed?')).toBe(true);
		expect(isSingleConcept('When and where did this happen?')).toBe(false);
		expect(isSingleConcept('On what date did this happen?')).toBe(true);
		expect(isSingleConcept('Who was the employer and what led to dismissal?')).toBe(false);
	});

	it('round 3: grounded specificity outranks anchor cosmetics', () => {
		// Car proof is grounded + single-concept: usable despite no date/name.
		expect(
			isGroundedInIssue(
				'What sale agreement and payment proof do you have for the car?',
				'i bought a car ownership not transferred',
				[],
				''
			)
		).toBe(true);
		expect(isSingleConcept('What sale agreement and payment proof do you have for the car?')).toBe(
			true
		);
	});

	it('round 4: short questions still enforce language', () => {
		expect(outputMatchesLang('Who is the other party?', 'sw')).toBe(false);
		expect(outputMatchesLang('Mwenzako ni nani katika jambo hili?', 'en')).toBe(false);
		expect(outputMatchesLang('Mwenzako ni nani katika jambo hili?', 'sw')).toBe(true);
	});

	it('round 5: short repeat loops are degenerate', () => {
		expect(isDegenerateText('pole pole pole pole pole pole pole pole pole pole pole pole')).toBe(
			true
		);
		expect(
			isDegenerateText('Hayajulikani. Hayajulikani. Hayajulikani. Hayajulikani. Hayajulikani.')
		).toBe(true);
		expect(isDegenerateText('When and where did this happen?')).toBe(false);
	});

	it('round 6: invented amounts never keep a citation', () => {
		const passages = [
			{
				title: 'Employment Act',
				citation: 'Employment Act, 2007',
				content:
					'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
			}
		];
		expect(
			verifyQuoteSpans('The employer must pay ten million shillings compensation [1].', passages)
		).not.toContain('[1]');
		expect(
			verifyQuoteSpans('An employer must give written notice before dismissal [1].', passages)
		).toContain('[1]');
	});

	it('round 7: skeletons are thin, substance is not', () => {
		const skeleton = [
			'## Facts',
			'The client instructs dismissal supported by the bundle and seeks advice on remedy.',
			'## Law',
			'Notice is required under the governing statute [1].',
			'## Next Steps',
			'Bundle the contract and correspondence, then prepare for filing and service [1].',
			'## Deadlines',
			'Verify the limitation period against the current gazette [1].',
			'## Authorities',
			'Confirm whether the authorities are still current, limitation, and forum before filing [1].',
			'## Risks',
			'The counterargument is examined and limitation exposure stated [1].',
			'## Urgent',
			'Act quickly.',
			'## Note',
			'Confirm the authorities are still current before filing, serving, or advising the client.'
		].join('\n');
		expect(isThinPlan(skeleton, 'en')).toBe(true);
	});

	it('round 8: substantive evidence is structural, names need no list', () => {
		// The 4B extractor credits lowercase company names on its own (live
		// verified); the deterministic check is only whether the slice
		// carries content. Thin singles ("none", "hakuna", "idk") can never
		// prove a dimension; anything carrying a fact passes and the
		// extractor prompt (evasions don't count) does the rest — also live
		// verified ("none yet" stays missing).
		expect(isSubstantiveEvidence('John Kamau dismissed me without notice')).toBe(true);
		expect(isSubstantiveEvidence('Bidii Ltd dismissed me')).toBe(true);
		expect(isSubstantiveEvidence('I was dismissed in May without notice')).toBe(true);
		expect(isSubstantiveEvidence('storyblok gmbh, no action')).toBe(true);
		expect(isSubstantiveEvidence('none')).toBe(false);
		expect(isSubstantiveEvidence('hakuna')).toBe(false);
		expect(isSubstantiveEvidence('sijui')).toBe(false);
		expect(isSubstantiveEvidence('hapana')).toBe(false);
		expect(isSubstantiveEvidence('idk')).toBe(false);
		expect(isSubstantiveEvidence('yes')).toBe(false);
		expect(isSubstantiveEvidence('no action')).toBe(false);
		expect(isSubstantiveEvidence('')).toBe(false);
	});

	it('round 9: paraphrase duplicates are caught', () => {
		const history = [{ q: 'Who is the other party in this matter?', a: 'x' }];
		expect(isDuplicateQuestion('What is the other party name?', history)).toBe(true);
		expect(isDuplicateQuestion('Which documents can you attach?', history)).toBe(false);
	});

	it('round 10: short unsupported claims hurt coverage', () => {
		const passages = [
			{
				title: 'Employment Act',
				citation: 'Employment Act, 2007',
				content:
					'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
			}
		];
		expect(factualSentences('Notice is required.', 'en')).toHaveLength(1);
		expect(citationCoverage('Notice is required.', passages)).toBe(0);
	});
});

describe('presupposition gate (adversarial, live repro)', () => {
	const carIssue = 'i bought a car from someone and they havent transferred ownership to me yet';
	const carLaw =
		'Motor vehicle logbook transfer on NTSA TIMS: ownership passes when the seller initiates transfer. Logbook Loan Clearance Letter proves no loan balance.';

	it('catches law-smuggled documents treated as existing', () => {
		expect(
			presupposesUnknownDocument(
				"What did the Logbook Loan Clearance Letter say about the car's ownership status?",
				carIssue,
				[],
				carLaw
			)
		).toBe(true);
	});

	it('catches presupposed signing dates', () => {
		expect(
			presupposesUnknownDocument(
				'When was the Title Deed issued?',
				'my neighbor built a wall on my land',
				[],
				'Title Deed issued by the lands office after survey.'
			)
		).toBe(true);
	});

	it('allows user-mentioned documents and existential shapes', () => {
		const history = [{ q: 'What proof do you have?', a: 'I have the termination letter' }];
		expect(
			presupposesUnknownDocument(
				'What did the termination letter say?',
				'employer dismissed me',
				history,
				'Employment Act notice rules'
			)
		).toBe(false);
		expect(
			presupposesUnknownDocument(
				'Were you given a notice of dismissal?',
				'My employer dismissed me without notice',
				[],
				'Employment Act notice rules'
			)
		).toBe(false);
		expect(
			presupposesUnknownDocument(
				'Were you given notice under the Employment Act?',
				'My employer dismissed me without notice',
				[],
				'Employment Act notice rules'
			)
		).toBe(false);
	});
});

describe('disclaimer de-dupe', () => {
	const safe =
		'## Facts\nThe client instructs dismissal.\n\n## Note\nConfirm the authorities are still current before filing, serving, or advising the client.';
	const weakModel =
		'## Facts\nThe client instructs dismissal.\n\n## Note\nGeneral information only. Consult anyone.';

	it('keeps safe plans untouched, strips weak disclaimers', () => {
		expect(stripUnsafeDisclaimer(safe, 'en')).toBe(safe);
		const stripped = stripUnsafeDisclaimer(weakModel, 'en');
		expect(stripped).not.toContain('## Note');
		expect(stripped).toContain('## Facts');
		expect(stripUnsafeDisclaimer('No headings here.', 'en')).toBe('No headings here.');
	});
});

describe('citation pressure (uncited sections)', () => {
	const employment = [
		{
			title: 'Employment Act',
			citation: 'Employment Act, 2007',
			content:
				'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
		}
	];
	const plan = (rights: string) =>
		[
			'## Facts',
			'The client instructs dismissal without notice in May; the letter is in the bundle.',
			'## Law',
			rights,
			'## Next Steps',
			'Bundle the contract and payslips for filing today with full particulars included here [1].',
			'## Deadlines',
			'Verify the thirty day deadline against the current gazette promptly today without any further delay now [1].',
			'## Authorities',
			'Confirm notice pay and unfair termination evidence and remedies available on the authorities [1].',
			'## Risks',
			'The counterargument is examined and limitation exposure stated for counsel [1].',
			'## Urgent',
			'Act quickly so limitation periods do not expire on your claim and evidence stays fresh.',
			'## Note',
			'Confirm the authorities are still current before filing, serving, or advising the client.'
		].join('\n');

	it('flags fluent sections no passage supports, exempts supported and disclaimer', () => {
		const bad = plan('The moon landing was faked by your employer last Tuesday.');
		expect(uncitedSections(bad, 'en', employment)).toContain('## Law');
		const good = plan('An employer must give written notice before dismissal [1].');
		expect(uncitedSections(good, 'en', employment)).not.toContain('## Law');
		expect(uncitedSections(good, 'en', employment)).not.toContain('## Note');
		expect(uncitedSections(good, 'en', [])).toEqual([]);
	});

	it('sentenceSupported matches the verifier', () => {
		expect(
			sentenceSupported('An employer must give written notice before dismissal.', employment)
		).toBe(true);
		expect(sentenceSupported('The moon is made of cheese.', employment)).toBe(false);
	});
});

describe('numbered repair isolation', () => {
	const passages = [
		{ title: 'A', citation: 'c1', content: 'dismissal notice written warning procedure' },
		{ title: 'B', citation: 'c2', content: 'unrelated land boundary beacon survey' },
		{ title: 'C', citation: 'c3', content: 'termination notice period final dues' }
	];

	it('keeps original ranks and prefers relevant passages', () => {
		const sel = selectRepairPassages(passages, ['weak section about dismissal notice dues'], 2);
		expect(sel.map((p) => p.n)).toEqual([1, 3]);
		const packed = packNumbered(sel, 5000);
		expect(packed).toContain('[1] A');
		expect(packed).toContain('[3] C');
		expect(packed).not.toContain('[2]');
	});

	it('respects the budget without reindexing', () => {
		const packed = packNumbered(
			passages.map((p, i) => ({ n: i + 1, ...p })),
			60
		);
		expect(packed.length).toBeLessThanOrEqual(61);
		expect(packed).toContain('[1]');
	});
});

describe('catch-alls without law hooks (live repros)', () => {
	it('drops Swahili catch-alls and hypotheticals that name nothing from the law', () => {
		// No Swahili denylist: these die because they share no token with
		// the retrieved statute — verified per question.
		const law = 'Employment Act termination notice hearing fair procedure labour office';
		for (const q of [
			'Wanaamka wengine na kesi yangu?',
			'Niambie zaidi kuhusu kesi yako',
			'Nini kilichotokea siku hiyo?',
			'Kwa mfano wa kazi, unapewa nafasi ya kujieleza?',
			'Kama unapoteza matokeo, ulifanya nini?',
			'Kama wamefanyia kazi, nani alikuajiri?'
		]) {
			expect(isGroundedInLaw(q, law)).toBe(false);
		}
		// "For example, were you given notice?" IS law-grounded (notice) —
		// the underlying question is legitimate; only the "For example"
		// throat-clearing is prompt-forbidden, never a gate's job.
		expect(isGroundedInLaw('For example, were you given notice?', law)).toBe(true);
	});

	it('drops the English hypothetical in the batch instead of asking it', async () => {
		const out = await planQuestionBatch(
			'employer dismissed me without notice',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['steps_outcome'] },
				lawHints: '- Employment Act: termination requires notice, hearing, fair procedure.',
				lawContext: 'Employment Act termination requires notice hearing fair procedure',
				draft: async () => ({
					questions: [
						{
							dimension: 'steps_outcome',
							text: 'If you were dismissed, what did you do?',
							type: 'text',
							anchors: ['dismissed']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});
});

describe('single-concept auxiliaries (live repro)', () => {
	it('counts auxiliary-led clauses as questions', () => {
		expect(
			isSingleConcept(
				'Were you employed by a specific employer and did the slip occur during your work hours?'
			)
		).toBe(false);
		expect(isSingleConcept('Did the seller sign the transfer forms?')).toBe(true);
		expect(isSingleConcept('Was there a written agreement for the sale?')).toBe(true);
		expect(isSingleConcept('Have you reported to the labour office?')).toBe(true);
	});
});

describe('dangling definites (grammar, not a denylist)', () => {
	it('rejects unresolvable descriptions, passes user- and law-grounded ones', () => {
		const issue = 'my neighbor started an encroachment dispute';
		const law = 'Land boundaries verify title deeds beacons official search licensed surveyor';
		// "the other party" / "this matter": no head noun resolves anywhere.
		expect(hasDanglingDefinite('Who is the other party in this matter?', issue, [], law)).toBe(
			true
		);
		// User's own words and law vocabulary resolve.
		expect(hasDanglingDefinite('What is the name of your neighbor?', issue, [], law)).toBe(false);
		expect(
			hasDanglingDefinite('Did you report the wall to the land registrar?', issue, [], law)
		).toBe(false);
		// Relative clauses define their head; time nouns introduce nothing.
		expect(
			hasDanglingDefinite(
				'What is the name of the person who sold you the car?',
				'i bought a car from someone',
				[],
				''
			)
		).toBe(false);
		expect(hasDanglingDefinite('On what date did this happen?', issue, [], law)).toBe(false);
		// No determiners at all: nothing to check.
		expect(hasDanglingDefinite('Were you given a hearing?', issue, [], law)).toBe(false);
	});

	it('drops dangling drafts in the batch instead of asking them', async () => {
		// "the other party in this matter": nothing resolves — not in the
		// issue, not in the law. Skipped, never asked.
		const out = await planQuestionBatch(
			'my neighbor started an encroachment dispute',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				lawHints: '- Land boundaries: Verify title deeds and beacons.',
				lawContext: 'Land boundaries Verify title deeds and beacons',
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'Who is the other party in this matter?',
							type: 'text',
							anchors: ['neighbor']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});

	it('drops the screenshot question at the generic gate (exact user grounding)', async () => {
		// "neighbor is encroaching on my property" states no noun the draft
		// reuses verbatim ("encroachment" != "encroaching"), so the generic
		// gate — exact matching on the user's side — kills it before any
		// role judgment is needed.
		expect(
			isGenericQuestion(
				'Who is the other party involved in the encroachment?',
				'neighbor is encroaching on my property',
				[],
				''
			)
		).toBe(true);
		const out = await planQuestionBatch(
			'neighbor is encroaching on my property',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['party'] },
				lawHints: '- Land boundaries: Verify title deeds and beacons.',
				lawContext: 'Land boundaries Verify title deeds and beacons',
				draft: async () => ({
					questions: [
						{
							dimension: 'party',
							text: 'Who is the other party involved in the encroachment?',
							type: 'text',
							anchors: ['neighbor']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});
});

describe('law-hook rule (template scaffolding)', () => {
	it('matches law vocabulary with morphological tolerance', () => {
		const law = 'Boundary disputes: verify title deeds and beacons with a licensed surveyor';
		expect(isGroundedInLaw('Did you report the wall to the land registrar?', law)).toBe(false);
		expect(
			isGroundedInLaw(
				'When did the licensed surveyor confirm the beacons on your wall?',
				'Land boundaries verify title deeds beacons official search licensed surveyor'
			)
		).toBe(true);
		// heard/hearing, dismissed/dismissal share a 4+ letter prefix
		expect(
			isGroundedInLaw(
				'Were you given a chance to be heard before the dismissal?',
				'Termination requires a fair hearing procedure and notice'
			)
		).toBe(true);
		expect(isGroundedInLaw('Anything at all?', law)).toBe(false);
		expect(isGroundedInLaw('What did you do?', '')).toBe(false);
	});

	it('drops non-party drafts with no law hook instead of asking them', async () => {
		// "What steps have you taken to address the encroachment?" borrows the
		// user noun but names nothing from the boundary law — dropped, no
		// generic question asked in its place.
		const out = await planQuestionBatch(
			'neighbor is encroaching on my property',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['steps_outcome'] },
				lawHints: '- Land boundaries: Verify title deeds and beacons through an official search.',
				lawContext: 'Land boundaries Verify title deeds and beacons through an official search',
				draft: async () => ({
					questions: [
						{
							dimension: 'steps_outcome',
							text: 'What steps have you taken to address the encroachment?',
							type: 'text',
							anchors: ['encroachment']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});

	it('grounds user-worded party drafts; inflection gaps stay generic', () => {
		// Exact user-side matching is deliberate: "encroachment" must not
		// ground via "encroaching" — that gap is where scaffolding hides.
		// (The law side is prefix-tolerant; the user side is strict.)
		expect(
			isGroundedInIssue(
				'Who is the other party involved in the encroachment?',
				'neighbor is encroaching on my property',
				[],
				''
			)
		).toBe(false);
		expect(
			isGroundedInIssue(
				'What is the name of your neighbor?',
				'neighbor is encroaching on my property',
				[],
				''
			)
		).toBe(true);
	});
});

describe('user-anchor rule (anti-parrot)', () => {
	it('drops drafts anchored only in law, keeps user-anchored ones', async () => {
		const lawArgs: {
			state: CaseState;
			lawHints: string;
			lawContext: string;
		} = {
			state: { known: [], missing: ['docs_deadline'] },
			lawHints: '- Employment Act: An employer must give written notice before termination.',
			lawContext: 'Employment Act An employer must give written notice before termination'
		};
		const lawOnly = await planQuestionBatch(
			'employer dismissed me with no notice',
			[],
			'en',
			{},
			{
				...lawArgs,
				draft: async () => ({
					questions: [
						{
							dimension: 'docs_deadline',
							text: 'Who is the other party and what exactly happened?',
							type: 'text',
							anchors: ['termination']
						}
					]
				})
			}
		);
		expect(lawOnly).toEqual([]);
		const userAnchored = await planQuestionBatch(
			'employer dismissed me with no notice',
			[],
			'en',
			{},
			{
				...lawArgs,
				draft: async () => ({
					questions: [
						{
							dimension: 'docs_deadline',
							text: 'What did your written termination notice say?',
							type: 'text',
							anchors: ['notice', 'termination']
						}
					]
				})
			}
		);
		expect(userAnchored.map((q) => q.text)).toEqual([
			'What did your written termination notice say?'
		]);
	});
});

describe('presupposition your-frames', () => {
	it('flags your-X documents the user never mentioned', () => {
		const law = 'Employment Act written warning notice procedure';
		expect(
			presupposesUnknownDocument(
				'What did your written warning say?',
				'employer dismissed me',
				[],
				law
			)
		).toBe(true);
		expect(
			presupposesUnknownDocument(
				'What did your written warning say?',
				'employer dismissed me',
				[{ q: 'proof?', a: 'I have the written warning' }],
				law
			)
		).toBe(false);
	});
});

describe('user-anchor text fallback', () => {
	it('keeps existential law-noun questions grounded by user nouns in text', async () => {
		const out = await planQuestionBatch(
			'i bought a car from someone and they havent transferred ownership to me yet',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['when_where_proof'] },
				lawHints: '- Logbook: Hire Purchase Agreement proves ownership.',
				lawContext: 'Logbook Hire Purchase Agreement proves ownership transfer',
				draft: async () => ({
					questions: [
						{
							dimension: 'when_where_proof',
							text: 'Were you given a Hire Purchase Agreement when you bought the car?',
							type: 'boolean',
							anchors: ['Hire Purchase Agreement']
						}
					]
				})
			}
		);
		expect(out.map((q) => q.text)).toEqual([
			'Were you given a Hire Purchase Agreement when you bought the car?'
		]);
	});
});

describe('deterministic citation assignment', () => {
	const employment = [
		{
			title: 'Employment Act',
			citation: 'Employment Act, 2007',
			content:
				'An employer must give written notice before dismissal, and the notice period depends on the contract terms agreed each month.'
		},
		{
			title: 'TIMS',
			citation: 'NTSA TIMS',
			content:
				'Motor vehicle ownership passes when the seller initiates transfer on TIMS and the buyer accepts.'
		}
	];
	const plan = (body: string) =>
		`## Situation Summary\n${body}\n\n## Note\nThis is not legal advice; confirm with a qualified lawyer.`;

	it('marks supported sentences with the right passage number', () => {
		const out = assignCitations(
			plan('An employer must give written notice before dismissal.'),
			'en',
			employment
		);
		expect(out).toContain('[1]');
		const out2 = assignCitations(
			plan('Motor vehicle ownership passes when the seller initiates transfer on TIMS.'),
			'en',
			employment
		);
		expect(out2).toContain('[2]');
		expect(out2).not.toContain('[1]');
	});

	it('leaves unsupported sentences, disclaimers, and existing markers alone', () => {
		const out = assignCitations(
			plan('The moon landing was faked last Tuesday morning.'),
			'en',
			employment
		);
		expect(out).not.toContain('[1]');
		expect(out).not.toContain('[2]');
		const kept = assignCitations(plan('Notice is required [1].'), 'en', employment);
		expect(kept).toContain('[1]');
		const noPassages = assignCitations(plan('An employer must give written notice.'), 'en', []);
		expect(noPassages).not.toContain('[1]');
	});
});

describe('simple-prompt fallback (yield recovery)', () => {
	it('uses the minimal prompt after the full prompt yields nothing', async () => {
		const calls: string[] = [];
		const out = await planQuestionBatch(
			'mkopo sijalipa deni, mdai ananitishia',
			[],
			'sw',
			{},
			{
				state: { known: [], missing: ['party'] },
				draft: async (prompt: string) => {
					calls.push(prompt);
					if (!prompt.includes('Still needed:')) return 'garbage, no JSON here';
					return {
						questions: [
							{
								dimension: 'party',
								text: 'Who is the mdai threatening you?',
								type: 'text',
								anchors: ['mdai']
							}
						]
					};
				},
				translate: async (items) => ({
					items: items.map((i) => ({ ...i, text: 'Ni nani mdai wako?' }))
				})
			}
		);
		expect(calls.length).toBe(3);
		expect(out.map((q) => q.text)).toEqual(['Ni nani mdai wako?']);
	});
});

describe('anchor-in-text rule (prompt-echo parrot)', () => {
	it('drops drafts whose user anchors never appear in the question text', async () => {
		// Grounded via law ("liability"), anchored by user nouns ("slip")
		// that the text never mentions: stapled provenance. Anchors are
		// advisory so the structural gates let it through — the semantic
		// invention judge ("office" appears nowhere in issue/history/law)
		// is what kills it live. The stub below plays that judge role.
		const out = await planQuestionBatch(
			'I slipped in a supermarket and hurt my back',
			[],
			'en',
			{},
			{
				state: { known: [], missing: ['docs_deadline'] },
				lawHints: '- Occupiers liability: keep medical reports and receipts.',
				lawContext: 'Occupiers liability keep medical reports and receipts',
				judgeGrounded: async () => false,
				draft: async () => ({
					questions: [
						{
							dimension: 'docs_deadline',
							text: 'Did the office confirm the liability?',
							type: 'text',
							anchors: ['slip']
						}
					]
				})
			}
		);
		expect(out).toEqual([]);
	});
});

describe('user-echo judge bypass (live false-negatives)', () => {
	it('detects pure user echo structurally', () => {
		expect(isUserEcho('Who is the landlord?', 'landlord wants to evict me next week', [])).toBe(
			true
		);
		expect(
			isUserEcho('Was there a caretaker or agent near the wall?', 'neighbor built a wall', [])
		).toBe(false);
		expect(isUserEcho('When did the slip happen?', 'I slipped in a supermarket', [])).toBe(false);
	});

	it('bypasses the model judge for echoes', async () => {
		// No model in unit env: echo returns true without any model call.
		// (Fail-closed on outage is unchanged code, covered by live runs.)
		await expect(
			judgeEntitiesGrounded('Who is the landlord?', 'landlord wants to evict me next week', [])
		).resolves.toBe(true);
	});
});

describe('interview native tool focus (draftQuestions)', () => {
	it('intersects missing with focus and clamps maxQuestions', async () => {
		const draft = async () => ({
			questions: [
				{
					dimension: 'party',
					text: 'What is the name of the employer?',
					type: 'text',
					anchors: ['employer']
				},
				{
					dimension: 'when_where_proof',
					text: 'Were you given written notice before dismissal?',
					type: 'text',
					anchors: ['dismissal']
				}
			]
		});
		const base = {
			state: {
				known: [],
				missing: ['party', 'when_where_proof', 'steps_outcome'] as Array<
					'party' | 'when_where_proof' | 'steps_outcome' | 'docs_deadline'
				>
			},
			lawHints: 'Employment Act notice hearing dismissal',
			lawContext: 'Employment Act notice hearing dismissal employer',
			judgeGrounded: async () => true,
			judgeAnswered: async () => false,
			draft
		};
		const focused = await planQuestionBatch(
			'employer dismissed me',
			[],
			'en',
			{ focusDimensions: ['party'], maxQuestions: 4 },
			base
		);
		expect(focused.length).toBeLessThanOrEqual(1);
		const capped = await planQuestionBatch(
			'employer dismissed me',
			[],
			'en',
			{ maxQuestions: 1 },
			base
		);
		expect(capped.length).toBeLessThanOrEqual(1);
		const empty = await planQuestionBatch(
			'employer dismissed me',
			[],
			'en',
			{ focusDimensions: ['docs_deadline'] },
			{
				...base,
				state: { known: [], missing: ['party'] }
			}
		);
		expect(empty).toEqual([]);
	});
});
