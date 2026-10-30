export const UPLOAD_URL = '/api/documents/upload';

export const MAX_DOCS = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ACCEPT_ATTR =
	'.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/png,image/jpeg,image/webp,image/bmp';

export const ACCEPT_EXTS = new Set([
	'pdf',
	'docx',
	'txt',
	'md',
	'png',
	'jpg',
	'jpeg',
	'webp',
	'bmp'
]);

export interface UploadedDoc {
	id: string;
	filename: string;
	chars: number;
	chunks: number;
}

export interface IngestSummary {
	id: string;
	filename: string;
	chars: number;
	chunks: number;
}

const summaryCache = new Map<string, IngestSummary>();

export interface StoredDetail {
	id: string;
	summary: IngestSummary | undefined;
	name: string;
}

export function notifyStored(id: string, name: string): void {
	if (typeof window === 'undefined') return;
	try {
		window.dispatchEvent(
			new CustomEvent<StoredDetail>('filepond:stored', {
				detail: { id, summary: peekSummary(id), name }
			})
		);
	} catch {
		/* ignore */
	}
}

/** FilePond FormPostStore `resolveResponse.store` hook. Receives the XHR
 * context `{ response: { response: string | Blob } }` and must return the
 * server id synchronously. Our endpoint returns JSON
 * `{ document: { id, filename, chars, chunks } }`; the id is cached with its
 * summary so the UI can promote the entry to the confirmed docs list. */
export function resolveStoredId(ctx: {
	response?: { response?: string | Blob | unknown } | unknown;
	entry?: { name?: unknown } | unknown;
}): string {
	const raw =
		ctx && typeof ctx === 'object' && 'response' in ctx
			? (ctx as { response?: { response?: unknown } }).response?.response
			: undefined;
	if (typeof raw !== 'string' || !raw.trim()) {
		throw new Error('Upload failed: empty server response.');
	}
	const text = raw.trim();
	if (text.startsWith('{')) {
		let data: {
			document?: { id?: unknown; filename?: unknown; chars?: unknown; chunks?: unknown };
			error?: unknown;
		};
		try {
			data = JSON.parse(text) as typeof data;
		} catch {
			throw new Error('Upload failed: invalid server response.');
		}
		if (typeof data?.error === 'string' && data.error) throw new Error(data.error);
		const doc = data?.document;
		const id = typeof doc?.id === 'string' ? doc.id : '';
		if (!id) throw new Error('Upload failed: missing document id.');
		cacheSummary({
			id,
			filename: typeof doc?.filename === 'string' ? doc.filename : 'document',
			chars: typeof doc?.chars === 'number' ? doc.chars : 0,
			chunks: typeof doc?.chunks === 'number' ? doc.chunks : 0
		});
		const entryName =
			ctx && typeof ctx === 'object' && 'entry' in ctx
				? (ctx as { entry?: { name?: unknown } }).entry
				: undefined;
		notifyStored(id, typeof entryName?.name === 'string' ? entryName.name : '');
		return id;
	}
	// FormPostStore default server format: plain-text id.
	if (text.length > 500 || /\s/.test(text)) {
		throw new Error('Upload failed: unexpected server response.');
	}
	return text;
}

export function cacheSummary(summary: IngestSummary): void {
	summaryCache.set(summary.id, summary);
}

export function takeSummary(id: string): IngestSummary | undefined {
	const s = summaryCache.get(id);
	if (s) summaryCache.delete(id);
	return s;
}

export function peekSummary(id: string): IngestSummary | undefined {
	return summaryCache.get(id);
}

export function extOf(filename: string): string {
	const parts = filename.toLowerCase().split('.');
	return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
}

export function isAcceptedFile(name: string, type = ''): boolean {
	const ext = extOf(name);
	if (ACCEPT_EXTS.has(ext)) return true;
	if (!type) return false;
	const t = type.toLowerCase();
	return (
		t === 'application/pdf' ||
		t === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		t.startsWith('text/') ||
		t.startsWith('image/')
	);
}

export function dedupeFiles(files: File[]): File[] {
	const seen = new Set<string>();
	const out: File[] = [];
	for (const f of files) {
		const key = `${f.name}::${f.size}::${f.lastModified}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(f);
	}
	return out;
}

export function formatBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return '0 B';
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
