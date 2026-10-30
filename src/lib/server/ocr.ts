import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const TESSDATA_URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata';

function appRoot(): string {
	return process.cwd();
}

export function tessdataDir(): string {
	return process.env.TESSDATA_DIR ?? join(appRoot(), '.qvac', 'tessdata');
}

export function tessCacheDir(): string {
	return join(appRoot(), '.qvac', 'tesseract-cache');
}

/** Download eng.traineddata on first use; afterwards OCR works offline.
 *  Kiswahili data (swa.traineddata) is fetched best-effort so Swahili photos
 *  read better; English-only still works when it is unavailable. */
export async function ensureTessData(): Promise<string> {
	const dir = tessdataDir();
	mkdirSync(dir, { recursive: true });
	const targets = ['eng.traineddata', 'swa.traineddata'];
	for (const file of targets) {
		const target = join(dir, file);
		if (existsSync(target)) continue;
		// Kiswahili data is optional: never fail first-run setup over it.
		const optional = file !== 'eng.traineddata';
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 60000);
		try {
			const res = await fetch(TESSDATA_URL.replace('eng.traineddata', file), {
				signal: controller.signal
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			writeFileSync(target, Buffer.from(await res.arrayBuffer()));
		} catch (e) {
			if (!optional) {
				throw new Error(
					`OCR language data is missing and could not be downloaded (${e instanceof Error ? e.message : String(e)}). Connect once to fetch it, or attach a text PDF, DOCX or TXT instead.`,
					{ cause: e }
				);
			}
			console.warn(`optional OCR data ${file} unavailable`, e);
		} finally {
			clearTimeout(timer);
		}
	}
	return dir;
}

function resolvePackageDir(spec: string): string | null {
	try {
		return dirname(createRequire(import.meta.url).resolve(spec));
	} catch {
		return null;
	}
}

interface OcrWorker {
	recognize(image: unknown): Promise<{ data: { text: string } }>;
	terminate(): Promise<void>;
}

let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker(): Promise<OcrWorker> {
	if (!workerPromise) {
		workerPromise = (async () => {
			const langPath = await ensureTessData();
			const mod = (await import('tesseract.js')) as unknown as {
				createWorker: (
					langs: string,
					oem?: unknown,
					options?: Record<string, unknown>
				) => Promise<OcrWorker>;
			};
			const coreDir = resolvePackageDir('tesseract.js-core/package.json');
			const options: Record<string, unknown> = {
				langPath,
				gzip: false,
				cachePath: tessCacheDir(),
				errorHandler: (e: unknown) => console.error('ocr worker error', e)
			};
			// Prefer the fully local engine build so OCR works offline from
			// install. Fall back to CDN defaults when the package layout
			// cannot be resolved. Note: workerPath is intentionally left
			// unset — overriding it with the browser bundle crashes the
			// Node worker thread; the default Node worker script is used.
			if (coreDir && existsSync(join(coreDir, 'tesseract-core.wasm.js'))) {
				options.corePath = coreDir;
			}
			mkdirSync(tessCacheDir(), { recursive: true });
			// Prefer eng+swa so Swahili photos read well; fall back to eng when
			// the optional swa data could not be fetched (offline first run).
			const langs = existsSync(join(langPath, 'swa.traineddata')) ? 'eng+swa' : 'eng';
			return mod.createWorker(langs, undefined, options);
		})().catch((e) => {
			workerPromise = null;
			throw e;
		});
	}
	return workerPromise;
}

// Tesseract workers handle one job at a time; serialize OCR requests.
let tail: Promise<unknown> = Promise.resolve();

export function ocrImage(bytes: Uint8Array): Promise<string> {
	const run = tail.then(async () => {
		const worker = await getWorker();
		const { data } = await worker.recognize(Buffer.from(bytes));
		const text = (data?.text ?? '').trim();
		if (!text) {
			throw new Error(
				'No readable text was found in that image. Try a sharper, well-lit photo, or attach a text PDF, DOCX or TXT instead.'
			);
		}
		return text;
	});
	tail = run.catch(() => {});
	return run;
}
