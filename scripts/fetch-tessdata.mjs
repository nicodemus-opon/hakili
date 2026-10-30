import { existsSync } from 'node:fs';
import { tessdataDir } from '../src/lib/server/ocr.ts';

const URL = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata';

async function main() {
	const { mkdirSync, writeFileSync } = await import('node:fs');
	const { join } = await import('node:path');
	const dir = tessdataDir();
	mkdirSync(dir, { recursive: true });
	const target = join(dir, 'eng.traineddata');
	if (existsSync(target)) {
		console.log(`tessdata already present at ${target}; skipping.`);
		return;
	}
	console.log(`Downloading eng.traineddata to ${target} ...`);
	const res = await fetch(URL);
	if (!res.ok) throw new Error(`HTTP ${res.status} fetching tessdata`);
	writeFileSync(target, Buffer.from(await res.arrayBuffer()));
	console.log('tessdata ready (OCR will work offline from here on).');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
