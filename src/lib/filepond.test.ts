import { describe, expect, it } from 'vitest';
import {
	ACCEPT_EXTS,
	cacheSummary,
	dedupeFiles,
	extOf,
	formatBytes,
	isAcceptedFile,
	peekSummary,
	resolveStoredId,
	takeSummary,
	MAX_DOCS,
	MAX_FILE_BYTES
} from './filepond.ts';

describe('upload validation helpers', () => {
	it('accepts the documented types', () => {
		expect(ACCEPT_EXTS.has('pdf')).toBe(true);
		expect(ACCEPT_EXTS.has('docx')).toBe(true);
		expect(ACCEPT_EXTS.has('png')).toBe(true);
		expect(isAcceptedFile('brief.pdf', 'application/pdf')).toBe(true);
		expect(isAcceptedFile('notes.md', 'text/markdown')).toBe(true);
		expect(isAcceptedFile('scan.jpg', 'image/jpeg')).toBe(true);
		expect(isAcceptedFile('setup.exe', 'application/octet-stream')).toBe(false);
		expect(isAcceptedFile('noext', '')).toBe(false);
	});

	it('extracts extensions case-insensitively', () => {
		expect(extOf('Scan.JPG')).toBe('jpg');
		expect(extOf('archive.tar.gz')).toBe('gz');
		expect(extOf('noext')).toBe('');
	});

	it('dedupes identical files', () => {
		const a = new File(['x'], 'a.pdf', { type: 'application/pdf', lastModified: 1 });
		const b = new File(['x'], 'a.pdf', { type: 'application/pdf', lastModified: 1 });
		const c = new File(['y'], 'b.pdf', { type: 'application/pdf', lastModified: 2 });
		expect(dedupeFiles([a, b, c])).toHaveLength(2);
	});

	it('caches and takes ingest summaries', () => {
		cacheSummary({ id: 'd1', filename: 'a.pdf', chars: 10, chunks: 1 });
		expect(peekSummary('d1')?.filename).toBe('a.pdf');
		expect(takeSummary('d1')?.chunks).toBe(1);
		expect(takeSummary('d1')).toBeUndefined();
	});

	it('keeps the 5-file / 10MB contract', () => {
		expect(MAX_DOCS).toBe(5);
		expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
	});

	it('resolves the stored id from the JSON upload response', () => {
		const body = JSON.stringify({
			document: { id: 'abc-123', filename: 'brief.pdf', chars: 100, chunks: 2 }
		});
		expect(resolveStoredId({ response: { response: body } })).toBe('abc-123');
		expect(peekSummary('abc-123')).toMatchObject({ filename: 'brief.pdf', chunks: 2 });
		takeSummary('abc-123');
	});

	it('accepts a plain-text id (FormPostStore default)', () => {
		expect(resolveStoredId({ response: { response: '  abc-123  ' } })).toBe('abc-123');
	});

	it('rejects empty or garbage store responses', () => {
		expect(() => resolveStoredId({ response: { response: '' } })).toThrow(/empty/);
		expect(() => resolveStoredId({ response: { response: '{"nope":true}' } })).toThrow(
			/missing document id/
		);
		expect(() => resolveStoredId({})).toThrow(/empty/);
	});
});
