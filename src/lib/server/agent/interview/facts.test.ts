import { describe, expect, it } from 'vitest';
import {
	DIMENSIONS,
	detectAdviceQuestion,
	deterministicKnown,
	evidenceSource,
	extractCaseState,
	hasCaseEntities,
	isProceduralHowTo,
	parseCaseState,
	quoteGrounds,
	type CaseState
} from './facts.ts';

const RICH_ISSUE =
	'On 12 May 2025 my landlord John Kamau locked me out of my house in Kisumu and kept my deposit';

describe('quoteGrounds', () => {
	it('accepts verbatim slices, normalised', () => {
		expect(quoteGrounds('12 May 2025', RICH_ISSUE)).toBe(true);
		expect(quoteGrounds('locked me out', RICH_ISSUE)).toBe(true);
		expect(quoteGrounds('john kamau', RICH_ISSUE)).toBe(true);
	});

	it('rejects invented or too-short slices', () => {
		expect(quoteGrounds('Mombasa', RICH_ISSUE)).toBe(false);
		expect(quoteGrounds('kept my deposit of KES 45,000', RICH_ISSUE)).toBe(false);
		expect(quoteGrounds('ab', RICH_ISSUE)).toBe(false);
		expect(quoteGrounds('', RICH_ISSUE)).toBe(false);
	});
});

describe('parseCaseState', () => {
	it('covers dimensions with quote-grounded evidence only', () => {
		const state = parseCaseState(
			{
				known: [
					{ dimension: 'party', evidence: 'my landlord John Kamau' },
					{ dimension: 'when_where_proof', evidence: '12 May 2025' },
					{ dimension: 'docs_deadline', evidence: 'the sale agreement' } // invented
				]
			},
			RICH_ISSUE
		);
		expect(state).not.toBeNull();
		expect(state?.known.map((k) => k.dimension)).toEqual(['party', 'when_where_proof']);
		expect(state?.missing).toEqual(['steps_outcome', 'docs_deadline']);
	});

	it('never accepts question text or evasions as evidence', () => {
		const history = [{ q: 'When and where did this happen?', a: 'none' }];
		const source = evidenceSource('dismissed without notice', history);
		const state = parseCaseState(
			{
				known: [
					{ dimension: 'when_where_proof', evidence: 'When and where did this happen' },
					{ dimension: 'steps_outcome', evidence: 'none' }
				]
			},
			source
		);
		expect(state?.known).toEqual([]);
		expect(state?.missing).toEqual([...DIMENSIONS]);
	});

	it('ignores unknown dimensions and dedupes repeated ones', () => {
		const state = parseCaseState(
			{
				known: [
					{ dimension: 'loan_amount', evidence: 'John Kamau' },
					{ dimension: 'party', evidence: 'John Kamau' },
					{ dimension: 'party', evidence: '12 May 2025' }
				]
			},
			RICH_ISSUE
		);
		expect(state?.known).toHaveLength(1);
		expect(state?.known[0]?.dimension).toBe('party');
	});

	it('returns null on unusable payloads, empty known covers nothing', () => {
		expect(parseCaseState(null, RICH_ISSUE)).toBeNull();
		expect(parseCaseState([1, 2], RICH_ISSUE)).toBeNull();
		expect(parseCaseState({ known: 'party' }, RICH_ISSUE)).toBeNull();
		const empty = parseCaseState({ known: [] }, RICH_ISSUE);
		expect(empty?.missing).toEqual([...DIMENSIONS]);
	});
});

describe('extractCaseState (injected model)', () => {
	const run = async () => ({
		known: [
			{ dimension: 'party', evidence: 'my landlord John Kamau' },
			{ dimension: 'when_where_proof', evidence: 'On 12 May 2025' },
			{ dimension: 'steps_outcome', evidence: 'locked me out' },
			{ dimension: 'docs_deadline', evidence: 'kept my deposit' }
		]
	});

	it('a complete initial story leaves nothing missing', async () => {
		const state = await extractCaseState(RICH_ISSUE, [], 'en', {}, run);
		expect(state.missing).toEqual([]);
		expect(state.known).toHaveLength(4);
	});

	it('fails open to all-missing on garbage or model errors', async () => {
		// No NER-visible names/dates: nothing deterministic to hold onto.
		const poor = 'my employer dismissed me without notice';
		// Distinct issues: the extractor caches per issue+history key.
		const garbage = await extractCaseState(`${poor} (g)`, [], 'en', {}, async () => 'x');
		expect(garbage.missing).toEqual([...DIMENSIONS]);
		const down = await extractCaseState(`${poor} (d)`, [], 'en', {}, async () => {
			throw new Error('model down');
		});
		expect(down.missing).toEqual([...DIMENSIONS]);
	});

	it('backstop holds stated names/dates even when the model fails', async () => {
		const down = await extractCaseState(`${RICH_ISSUE} (d)`, [], 'en', {}, async () => {
			throw new Error('model down');
		});
		expect(down.known.map((k) => k.dimension).sort()).toEqual(['party', 'when_where_proof']);
		expect(down.missing).toEqual(['steps_outcome', 'docs_deadline']);
	});

	it('vague answers keep their dimension missing', async () => {
		const history = [
			{ q: 'What have you done about this so far?', a: 'none' },
			{ q: 'Which documents can you attach?', a: 'idk' }
		];
		const state: CaseState = await extractCaseState(RICH_ISSUE, history, 'en', {}, async () => ({
			known: [
				{ dimension: 'party', evidence: 'my landlord John Kamau' },
				{ dimension: 'when_where_proof', evidence: 'On 12 May 2025' },
				{ dimension: 'steps_outcome', evidence: 'none' }, // evasion -> rejected
				{ dimension: 'docs_deadline', evidence: 'idk' } // evasion -> rejected
			]
		}));
		expect(state.missing).toEqual(['steps_outcome', 'docs_deadline']);
	});
});

describe('deterministicKnown (coverage backstop)', () => {
	it('claims party for a named person, when_where for date plus place', () => {
		const known = deterministicKnown(RICH_ISSUE, [], 'en');
		expect(known.map((k) => k.dimension).sort()).toEqual(['party', 'when_where_proof']);
	});

	it('needs both halves of when_where_proof: date alone is not coverage', () => {
		expect(deterministicKnown('dismissed on 12 May 2025', [], 'en')).toEqual([]);
		expect(deterministicKnown('my employer dismissed me without notice', [], 'en')).toEqual([]);
	});
});

describe('detectAdviceQuestion (intent routing)', () => {
	const noModel = async () => {
		throw new Error('model must not be called');
	};

	it('stated specifics are a case without touching the model', async () => {
		expect(hasCaseEntities('John Kamau dismissed me without notice', [], 'en')).toBe(true);
		expect(await detectAdviceQuestion('John Kamau dismissed me', [], 'en', {}, noModel)).toBe(
			false
		);
		expect(await detectAdviceQuestion('locked out on 12 May 2025', [], 'en', {}, noModel)).toBe(
			false
		);
	});

	it('past-tense-only text goes to the small-LLM judge', async () => {
		expect(hasCaseEntities('My employer dismissed me without notice', [], 'en')).toBe(false);
		expect(
			await detectAdviceQuestion(
				'My employer dismissed me without notice',
				[],
				'en',
				{},
				async () => 'no'
			)
		).toBe(false);
		expect(
			await detectAdviceQuestion(
				'my neighbor built a wall on my land',
				[],
				'en',
				{},
				async () => 'no'
			)
		).toBe(false);
		expect(
			await detectAdviceQuestion(
				'can my employer dismiss me without a notice',
				[],
				'en',
				{},
				async () => 'yes'
			)
		).toBe(true);
	});

	it('modal passives are general questions (live repro: eviction)', async () => {
		expect(hasCaseEntities('can i be evicted without a notice', [], 'en')).toBe(false);
		expect(
			await detectAdviceQuestion(
				'can i be evicted without a notice',
				[],
				'en',
				{},
				async () => 'yes'
			)
		).toBe(true);
		expect(
			await detectAdviceQuestion(
				'can my landlord evict me without notice',
				[],
				'en',
				{},
				async () => 'yes'
			)
		).toBe(true);
	});

	it('signal-free issues go to the model judge', async () => {
		expect(hasCaseEntities('can my employer dismiss me without a notice', [], 'en')).toBe(false);
		expect(
			await detectAdviceQuestion(
				'can my employer dismiss me without a notice',
				[],
				'en',
				{},
				async () => 'yes'
			)
		).toBe(true);
		expect(
			await detectAdviceQuestion(
				'my employer dismissed me without notice',
				[],
				'en',
				{},
				async () => 'no'
			)
		).toBe(false);
	});

	it('fails open to case on judge trouble', async () => {
		expect(
			await detectAdviceQuestion('can my employer dismiss me', [], 'en', {}, async () => 'maybe')
		).toBe(false);
		expect(
			await detectAdviceQuestion('can my employer dismiss me', [], 'en', {}, async () => {
				throw new Error('model down');
			})
		).toBe(false);
	});
});

describe('procedural how-to routing (live repro: business formation)', () => {
	const noModel = async () => {
		throw new Error('model must not be called');
	};

	it('bare jurisdiction is not a case signal', () => {
		expect(hasCaseEntities('How do I start a business in Kenya?', [], 'en')).toBe(false);
		expect(
			hasCaseEntities('What are the requirements to start a business in Nairobi?', [], 'en')
		).toBe(false);
	});

	it('how-to shapes resolve deterministically without the model', () => {
		expect(isProceduralHowTo('How do I start a business in Kenya?')).toBe(true);
		expect(isProceduralHowTo('What are the steps to register a company?')).toBe(true);
		expect(isProceduralHowTo('My employer dismissed me without notice')).toBe(false);
		expect(isProceduralHowTo('my neighbor built a wall on my land')).toBe(false);
	});

	it('how-to skips the interview without touching the model', async () => {
		expect(
			await detectAdviceQuestion('How do I start a business in Kenya?', [], 'en', {}, noModel)
		).toBe(true);
	});

	it('stated specifics still win over a how-to tail', async () => {
		expect(hasCaseEntities('John Kamau took my deposit, how do I recover it?', [], 'en')).toBe(
			true
		);
		expect(
			await detectAdviceQuestion(
				'John Kamau took my deposit, how do I recover it?',
				[],
				'en',
				{},
				noModel
			)
		).toBe(false);
	});
});

describe('quoteGrounds prefix tolerance (live repros)', () => {
	it('bridges inflections without admitting inventions', () => {
		expect(quoteGrounds('eviction', 'landlord wants to evict me next week')).toBe(true);
		expect(quoteGrounds('eviction notice', 'landlord wants to evict me next week')).toBe(false);
		expect(quoteGrounds('slip', 'I slipped in a supermarket')).toBe(true);
		expect(quoteGrounds('dismissal', 'employer dismissed me without notice')).toBe(true);
		expect(quoteGrounds('Mombasa', 'locked out in Kisumu')).toBe(false);
		expect(quoteGrounds('notice', 'I did not sign anything')).toBe(false);
		expect(quoteGrounds('car', 'train driver')).toBe(false);
	});
});
