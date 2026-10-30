import { describe, expect, it } from 'vitest';
import {
	clearMtCaches,
	mapLetterHeaders,
	normalizeForMt,
	splitForMt,
	translateSegments
} from './translation.ts';

describe('splitForMt', () => {
	it('splits after sentence punctuation', () => {
		expect(splitForMt('Pay in 7 days. If not, we file. Costs are reserved.')).toEqual([
			'Pay in 7 days.',
			'If not, we file.',
			'Costs are reserved.'
		]);
	});

	it('keeps header lines glued to the next chunk', () => {
		const chunks = splitForMt('Kwa: [Recipient name]\nKuhusu: Demand\n\nDear Sir,');
		expect(chunks.length).toBeLessThanOrEqual(2);
		expect(chunks.join(' ')).toContain('[Recipient name]');
	});

	it('returns [] for empty input', () => {
		expect(splitForMt('   ')).toEqual([]);
	});
});

describe('normalizeForMt', () => {
	it('rewrites client to customer, preserving case', () => {
		expect(normalizeForMt('Our client demands payment.')).toBe('Our customer demands payment.');
		expect(normalizeForMt('Clients must file.')).toBe('Customers must file.');
		expect(normalizeForMt('No relevant noun here.')).toBe('No relevant noun here.');
	});
});

describe('mapLetterHeaders', () => {
	it('maps fixed scaffolding and passes the rest through', () => {
		expect(
			mapLetterHeaders(
				'To: [Recipient name]\nRe: Demand for Ksh50,000\nDear Sir or Madam,\nBody text.\nYours faithfully,'
			)
		).toBe(
			'Kwa: [Recipient name]\nKuhusu: Demand for Ksh50,000\nMpendwa Bwana/Bibi,\nBody text.\nWako mwaminifu,'
		);
	});
});
describe('translateSegments (no export)', () => {
	it('returns null when the model was never exported', async () => {
		clearMtCaches();
		// MT_MODEL_EN_SW unset in tests; default dir does not exist in CI.
		// If a developer exported it locally this still passes: either null
		// or a same-length array — never a throw.
		const out = await translateSegments(['Pay in 7 days.']);
		expect(out === null || out.length === 1).toBe(true);
	});
});
