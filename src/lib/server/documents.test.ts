import { describe, expect, it } from 'vitest';
import { chunkText, extractUserDocument, MAX_FILE_BYTES } from './documents.ts';

describe('chunkText', () => {
	it('returns no chunks for empty input', () => {
		expect(chunkText('')).toEqual([]);
		expect(chunkText('   \n  ')).toEqual([]);
	});

	it('keeps short text in a single chunk', () => {
		expect(chunkText('Hello world.')).toEqual(['Hello world.']);
	});

	it('splits long text into bounded overlapping chunks', () => {
		const chunks = chunkText('Hello world. '.repeat(200));
		expect(chunks.length).toBeGreaterThan(1);
		for (const c of chunks) expect(c.length).toBeLessThanOrEqual(800);
		expect(chunks.join(' ')).toContain('Hello world.');
	});
});

describe('extractUserDocument validation', () => {
	it('rejects unsupported file types', async () => {
		await expect(
			extractUserDocument('archive.zip', 'application/zip', new Uint8Array([1, 2, 3]))
		).rejects.toThrow(/unsupported file type/i);
	});

	it('rejects empty files', async () => {
		await expect(
			extractUserDocument('empty.txt', 'text/plain', new Uint8Array([]))
		).rejects.toThrow(/empty/i);
	});

	it('rejects oversized files', async () => {
		const big = new Uint8Array(MAX_FILE_BYTES + 1);
		await expect(extractUserDocument('big.txt', 'text/plain', big)).rejects.toThrow(/too large/i);
	});

	it('extracts plain text files', async () => {
		const text = 'My employer dismissed me without notice on 1 March.';
		const r = await extractUserDocument('note.txt', 'text/plain', new TextEncoder().encode(text));
		expect(r.kind).toBe('txt');
		expect(r.text).toBe(text);
	});
});
