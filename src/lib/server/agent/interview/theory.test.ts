import { describe, expect, it } from 'vitest';
import { parseTheory, renderTheory } from './theory.ts';

describe('parseTheory', () => {
	it('accepts a well-formed theory', () => {
		const t = parseTheory(
			{
				claim: 'unfair dismissal without notice and hearing',
				decisive: [
					{ fact: 'whether written notice was given', dimension: 'docs_deadline', known: false },
					{ fact: 'whether a hearing happened', dimension: 'steps_outcome', known: false },
					{ fact: 'the employer name', dimension: 'party', known: true }
				]
			},
			['party', 'when_where_proof', 'steps_outcome', 'docs_deadline']
		);
		expect(t?.claim).toBe('unfair dismissal without notice and hearing');
		expect(t?.decisive).toHaveLength(3);
	});

	it('drops items for unknown dims and keeps the rest', () => {
		const t = parseTheory(
			{
				claim: 'boundary dispute',
				decisive: [
					{ fact: 'x', dimension: 'loan_amount', known: false },
					{ fact: '', dimension: 'party', known: false },
					{ fact: 'the neighbor name', dimension: 'party', known: false }
				]
			},
			['party', 'when_where_proof']
		);
		expect(t?.decisive).toEqual([{ dimension: 'party', fact: 'the neighbor name', known: false }]);
	});

	it('returns null on garbage or empty payloads', () => {
		expect(parseTheory(null, ['party'])).toBeNull();
		expect(parseTheory('nope', ['party'])).toBeNull();
		expect(parseTheory([], ['party'])).toBeNull();
		expect(parseTheory({ claim: '', decisive: [] }, ['party'])).toBeNull();
		expect(parseTheory({ claim: 'x' }, ['party'])?.decisive).toEqual([]);
	});
});

describe('renderTheory', () => {
	it('renders null as empty (draft prompt falls back)', () => {
		expect(renderTheory(null)).toBe('');
	});

	it('leads with unknown decisive facts, notes known ones', () => {
		const out = renderTheory({
			claim: 'unfair dismissal',
			decisive: [
				{ dimension: 'docs_deadline', fact: 'whether notice was given', known: false },
				{ dimension: 'party', fact: 'employer name', known: true }
			]
		});
		expect(out).toContain('unfair dismissal');
		expect(out).toContain('[docs_deadline] whether notice was given');
		expect(out).toContain('employer name');
	});
});
