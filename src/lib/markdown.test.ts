import { describe, expect, it } from 'vitest';
import { parseBlocks, renderMarkdown, splitInlineCitations } from '#lib/markdown.ts';

describe('splitInlineCitations', () => {
	it('splits text and citation markers', () => {
		expect(splitInlineCitations('Notice is required [1].')).toEqual([
			{ type: 'text', value: 'Notice is required ' },
			{ type: 'cite', n: 1 },
			{ type: 'text', value: '.' }
		]);
	});

	it('handles adjacent and multi-digit markers', () => {
		expect(splitInlineCitations('[1][12]')).toEqual([
			{ type: 'cite', n: 1 },
			{ type: 'cite', n: 12 }
		]);
	});

	it('leaves markers in code spans and links alone', () => {
		expect(splitInlineCitations('Run `[1]` first.')).toEqual([
			{ type: 'text', value: 'Run ' },
			{ type: 'text', value: '`[1]`' },
			{ type: 'text', value: ' first.' }
		]);
		expect(splitInlineCitations('See [1](https://example.test).')).toEqual([
			{ type: 'text', value: 'See ' },
			{ type: 'text', value: '[1](https://example.test)' },
			{ type: 'text', value: '.' }
		]);
	});
});

describe('parseBlocks lists', () => {
	it('keeps wrapped lines and repeated 1. markers in one ordered list', () => {
		const src = [
			'1. **Reserve a name**',
			'   Business Registration Service (BRS)',
			'   paying fees.',
			'',
			'1. **Register the business**',
			'   details and payment',
			'',
			'1. **Get a permit**',
			'   county office visit'
		].join('\n');
		const blocks = parseBlocks(src);
		expect(blocks).toEqual([
			{
				type: 'ol',
				items: [
					'**Reserve a name** Business Registration Service (BRS) paying fees.',
					'**Register the business** details and payment',
					'**Get a permit** county office visit'
				]
			}
		]);
		const html = renderMarkdown(src);
		expect(html.match(/<ol/g)).toHaveLength(1);
		expect(html.match(/<li/g)).toHaveLength(3);
	});

	it('keeps wrapped bullet lines in one unordered list', () => {
		expect(parseBlocks('- item one\n  continuation line\n- item two')).toEqual([
			{ type: 'ul', items: ['item one continuation line', 'item two'] }
		]);
	});
});
describe('renderMarkdown citations unchanged', () => {
	it('keeps [N] markers as literal text for CitedMarkdown to replace', () => {
		expect(renderMarkdown('Notice is required [1].')).toContain('[1]');
	});

	it('parses the same blocks as before the refactor', () => {
		expect(parseBlocks('## Law\nClaim [1].')).toEqual([
			{ type: 'heading', level: 2, lines: ['Law'] },
			{ type: 'para', lines: ['Claim [1].'] }
		]);
	});
});
