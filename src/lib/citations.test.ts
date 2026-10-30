import { describe, expect, it } from 'vitest';
import { shortSourceLabel, stripGenericTitleSuffix } from '#lib/citations.ts';

describe('stripGenericTitleSuffix', () => {
	it('strips the general-guidance qualifier', () => {
		expect(stripGenericTitleSuffix('Bail and bond — general guidance')).toBe('Bail and bond');
	});

	it('strips the overview qualifier', () => {
		expect(stripGenericTitleSuffix('Landlord and tenant — overview')).toBe('Landlord and tenant');
	});

	it('keeps meaningful qualifiers', () => {
		expect(stripGenericTitleSuffix('Fair hearing — Article 50')).toBe('Fair hearing — Article 50');
		expect(stripGenericTitleSuffix('Employment Act, 2007')).toBe('Employment Act, 2007');
	});
});

describe('shortSourceLabel', () => {
	it('falls back when only a generic qualifier remains', () => {
		expect(shortSourceLabel('— general guidance', 3, 'kenyalaw.org')).toBe('kenyalaw.org');
		expect(shortSourceLabel('  ', 3, '')).toBe('[3]');
	});
});
