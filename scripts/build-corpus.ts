/**
 * Build checked-in `src/lib/data/kenyan-legal-corpus.json` from per-topic
 * sources in `src/lib/data/corpus/<topic>.json`.
 *
 *   pnpm corpus:build
 *
 * Per-topic files are the source of truth (chosen: split per-topic + build).
 * The built file stays checked in so `ingest`, `corpus:check`, and `eval`
 * work unchanged offline. Sorts by id for deterministic diffs.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dir = join(root, 'src', 'lib', 'data', 'corpus');
const outPath = join(root, 'src', 'lib', 'data', 'kenyan-legal-corpus.json');

const files = readdirSync(dir)
	.filter((f) => f.endsWith('.json'))
	.sort();
const all: unknown[] = [];
for (const f of files) {
	const arr = JSON.parse(readFileSync(join(dir, f), 'utf8')) as unknown[];
	if (!Array.isArray(arr)) {
		console.error(`FAIL ${f}: not an array`);
		process.exit(1);
	}
	all.push(...arr);
}
all.sort((a, b) =>
	String((a as { id?: string }).id ?? '').localeCompare(String((b as { id?: string }).id ?? ''))
);
writeFileSync(outPath, JSON.stringify(all, null, '\t') + '\n');
console.log(`Built ${outPath}: ${all.length} passages from ${files.length} topic files.`);
