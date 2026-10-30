import { describe, expect, it } from 'vitest';
import { humanizeLabel } from './humanize.ts';

describe('humanizeLabel', () => {
	it('splits PascalCase titles', () => {
		expect(humanizeLabel('CanEvictWithoutNotice')).toBe('Can Evict Without Notice');
	});

	it('splits camelCase tool names', () => {
		expect(humanizeLabel('searchLegal')).toBe('Search Legal');
		expect(humanizeLabel('searchUserDocs')).toBe('Search User Docs');
	});

	it('replaces snake and kebab separators', () => {
		expect(humanizeLabel('when_where_proof')).toBe('When where proof');
		expect(humanizeLabel('clause-splitter')).toBe('Clause splitter');
	});

	it('leaves normal sentences alone', () => {
		expect(humanizeLabel('Search Kenyan law')).toBe('Search Kenyan law');
		expect(humanizeLabel('Plan: check document interview')).toBe('Plan: check document interview');
	});
});
