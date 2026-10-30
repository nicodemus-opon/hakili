import mammoth from 'mammoth';
import { pool } from './db.ts';
import { embedText, embedTexts } from './agent/llm.ts';
import { ocrImage } from './ocr.ts';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CHUNKS_PER_DOC = 60;
export const CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 150;

export interface IngestedDocSummary {
	id: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	chars: number;
	chunks: number;
	preview: string;
}

export interface UserPassage {
	id: string;
	documentId: string;
	filename: string;
	content: string;
	score: number;
}

interface PdfDoc {
	numPages: number;
	getPage(i: number): Promise<{
		getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
		cleanup(): void;
	}>;
}

const ALLOWED_EXTS = new Set(['pdf', 'docx', 'txt', 'md']);
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp']);
for (const ext of IMAGE_EXTS) ALLOWED_EXTS.add(ext);

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
	const clean = text
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	if (!clean) return [];
	const chunks: string[] = [];
	let start = 0;
	while (start < clean.length) {
		let end = Math.min(start + size, clean.length);
		if (end < clean.length) {
			const lastSpace = clean.lastIndexOf(' ', end);
			if (lastSpace > start + size * 0.5) end = lastSpace;
		}
		const piece = clean.slice(start, end).trim();
		if (piece) chunks.push(piece);
		if (end >= clean.length) break;
		start = Math.max(end - overlap, start + 1);
	}
	return chunks;
}

function extOf(filename: string): string {
	const parts = filename.toLowerCase().split('.');
	return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
	const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
		getDocument: (opts: unknown) => { promise: Promise<PdfDoc> };
	};
	const loadingTask = pdfjs.getDocument({
		data: bytes,
		isEvalSupported: false,
		useSystemFonts: true
	});
	const doc = await loadingTask.promise;
	// Note: pdfjs-dist v6 has no PDFDocumentProxy.destroy(); per-page cleanup
	// below is sufficient and a destroy() call here would throw at runtime.
	const pages: string[] = [];
	const n = Math.min(doc.numPages, 100);
	for (let i = 1; i <= n; i++) {
		const page = await doc.getPage(i);
		const content = await page.getTextContent();
		const line = content.items
			.map((it) => it.str ?? '')
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (line) pages.push(line);
		page.cleanup();
	}
	return pages.join('\n\n');
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
	const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
	return value ?? '';
}

function extractTxt(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('utf-8');
}

export async function extractUserDocument(
	filename: string,
	mimeType: string,
	bytes: Uint8Array
): Promise<{ text: string; kind: string }> {
	const ext = extOf(filename);
	if (!ALLOWED_EXTS.has(ext)) {
		throw new Error(
			`Unsupported file type ".${ext || '?'}". Attach a PDF, DOCX, TXT, Markdown or photo (PNG, JPG, WebP) so it can be processed offline.`
		);
	}
	if (bytes.length === 0) throw new Error('That file is empty.');
	if (bytes.length > MAX_FILE_BYTES) {
		throw new Error(
			`File is too large (${Math.round(bytes.length / 1024 / 1024)} MB). Keep files under 10 MB.`
		);
	}
	let text: string;
	if (ext === 'pdf') {
		try {
			text = await extractPdf(bytes);
		} catch {
			throw new Error('That PDF could not be read. Attach a text PDF, DOCX or TXT instead.');
		}
		if (!text.trim()) {
			throw new Error(
				'No readable text was found in that PDF. If it is a scanned paper document, take clear photos of each page (PNG or JPG) and attach those instead — they are read with on-device OCR.'
			);
		}
	} else if (ext === 'docx') {
		text = await extractDocx(bytes);
	} else if (IMAGE_EXTS.has(ext)) {
		// Photos/scans: read with on-device OCR (works offline after first use).
		text = await ocrImage(bytes);
	} else {
		text = extractTxt(bytes);
	}
	text = text.replace(/\0/g, '').trim();
	if (!text) {
		throw new Error(
			ext === 'pdf'
				? 'No readable text was found in that PDF. If it is a scanned paper document, take clear photos of each page (PNG or JPG) and attach those instead — they are read with on-device OCR.'
				: 'No readable text was found in that file.'
		);
	}
	return { text, kind: ext };
}

export async function ingestUserDocument(input: {
	filename: string;
	mimeType: string;
	bytes: Uint8Array;
}): Promise<IngestedDocSummary> {
	// Snapshot: pdfjs detaches the input buffer during PDF parsing, so read
	// the size before extraction.
	const sizeBytes = input.bytes.length;
	const { text, kind } = await extractUserDocument(input.filename, input.mimeType, input.bytes);
	const chunks = chunkText(text).slice(0, MAX_CHUNKS_PER_DOC);
	if (chunks.length === 0) throw new Error('No readable text was found in that file.');
	const id = crypto.randomUUID();
	await pool.query(
		`INSERT INTO user_documents (id, filename, mime_type, size_bytes, kind, extracted_chars)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		[
			id,
			input.filename.slice(0, 255),
			input.mimeType || 'application/octet-stream',
			sizeBytes,
			kind,
			text.length
		]
	);
	let stored = 0;
	const vectors = await embedTexts(chunks);
	for (const [i, content] of chunks.entries()) {
		const v = vectors[i];
		await pool.query(
			`INSERT INTO user_document_chunks (id, document_id, chunk_index, content, embedding)
			 VALUES ($1,$2,$3,$4,$5::vector)`,
			[crypto.randomUUID(), id, i, content, JSON.stringify(v)]
		);
		stored++;
	}
	return {
		id,
		filename: input.filename.slice(0, 255),
		mimeType: input.mimeType || 'application/octet-stream',
		sizeBytes,
		chars: text.length,
		chunks: stored,
		preview: text.slice(0, 500)
	};
}

export async function searchUserDocuments(
	query: string,
	documentIds: string[],
	topK = 4
): Promise<UserPassage[]> {
	if (documentIds.length === 0 || !query.trim()) return [];
	const qv = await embedText(query);
	const res = await pool.query(
		`SELECT c.id, c.document_id, d.filename, c.content,
		        1 - (c.embedding <=> $1::vector) AS score
		 FROM user_document_chunks c
		 JOIN user_documents d ON d.id = c.document_id
		 WHERE c.document_id = ANY($2::text[])
		 ORDER BY c.embedding <=> $1::vector
		 LIMIT $3`,
		[JSON.stringify(qv), documentIds, topK * 2]
	);
	const seen = new Set<string>();
	const out: UserPassage[] = [];
	for (const r of res.rows as Array<{
		id: string;
		document_id: string;
		filename: string;
		content: string;
		score: number;
	}>) {
		const key = `${r.document_id}:${r.content.slice(0, 80)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({
			id: r.id,
			documentId: r.document_id,
			filename: r.filename,
			content: r.content,
			score: Number(r.score) || 0
		});
		if (out.length >= topK) break;
	}
	return out;
}

export async function deleteUserDocument(id: string): Promise<void> {
	await pool.query(`DELETE FROM user_document_chunks WHERE document_id = $1`, [id]);
	await pool.query(`DELETE FROM user_documents WHERE id = $1`, [id]);
}

/**
 * Query-independent excerpts: first chunks in document order. Used when the
 * intake text is vague ("review this") and vector similarity over that query
 * would return arbitrary chunks. Never throws — returns [] on failure.
 */
export async function fetchUserDocExcerpts(
	documentIds: string[],
	maxChunks = 6
): Promise<UserPassage[]> {
	if (documentIds.length === 0) return [];
	try {
		const res = await pool.query(
			`SELECT c.id, c.document_id, d.filename, c.content, c.chunk_index
			 FROM user_document_chunks c
			 JOIN user_documents d ON d.id = c.document_id
			 WHERE c.document_id = ANY($1::text[])
			 ORDER BY c.document_id, c.chunk_index ASC
			 LIMIT $2`,
			[documentIds, Math.max(1, Math.min(maxChunks, 20))]
		);
		return (
			res.rows as Array<{
				id: string;
				document_id: string;
				filename: string;
				content: string;
			}>
		).map((r) => ({
			id: r.id,
			documentId: r.document_id,
			filename: r.filename,
			content: r.content,
			score: 0
		}));
	} catch {
		return [];
	}
}
