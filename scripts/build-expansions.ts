/**
 * Regenerate `src/lib/server/agent/expansions.generated.json`.
 *
 *   pnpm expansions:build          refresh pairs with the local model + recompute stopwords
 *   pnpm expansions:build --fresh  drop checked-in pairs and rebuild from the model only
 *
 * How it works (no hand-maintained word lists):
 * - stopwords: tokens whose document frequency across the checked-in corpus
 *   exceeds STOPWORD_DF (corpus boilerplate + function words). Recomputed
 *   deterministically on every run, so they track the corpus automatically.
 * - pairs: Swahili/Sheng -> English equivalents proposed by the local model
 *   from the corpus passages themselves, merged over the checked-in asset.
 *   Never hand-edit the asset; change the corpus or re-run this script.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const corpusPath = join(root, 'src', 'lib', 'data', 'kenyan-legal-corpus.json');
const outPath = join(root, 'src', 'lib', 'server', 'agent', 'expansions.generated.json');

const STOPWORD_DF = 0.4;
const PASSAGES_PER_BATCH = 12;

interface CorpusItem {
	id: string;
	title: string;
	content: string;
	topic?: string;
	sw_keywords?: string[];
}

function tokens(text: string): string[] {
	return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 2);
}

function computeStopwords(items: CorpusItem[]): string[] {
	const df = new Map<string, number>();
	for (const it of items) {
		for (const t of new Set(tokens(`${it.title} ${it.content}`))) {
			df.set(t, (df.get(t) ?? 0) + 1);
		}
	}
	return [...df.entries()]
		.filter(([, c]) => c / items.length >= STOPWORD_DF)
		.map(([t]) => t)
		.sort();
}

function parsePairs(text: string): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const line of text.split('\n')) {
		const m = line.match(/^\s*([a-z][a-z\- ]{1,30}?)\s*=>\s*([a-z][a-z ,]{1,80}?)\s*$/i);
		if (!m) continue;
		const sw = m[1].trim().toLowerCase();
		const en = m[2]
			.trim()
			.toLowerCase()
			.split(/[^a-z]+/)
			.filter(Boolean)
			.join(' ');
		if (sw && en && sw.length >= 2) out.push([sw, en]);
	}
	return out;
}

/**
 * Deterministic pairs from curated `sw_keywords`: each keyword maps to the
 * English content words of its own passage. Runs offline with no model, so
 * FTS recall improves as soon as keywords land in the corpus.
 */
function seedPairsFromKeywords(items: CorpusItem[]): Array<[string, string]> {
	const found = new Map<string, string>();
	for (const it of items) {
		const kws = Array.isArray(it.sw_keywords) ? it.sw_keywords : [];
		if (kws.length === 0) continue;
		const en = [...new Set(tokens(`${it.title} ${it.content}`))]
			.filter((w) => w.length > 3)
			.slice(0, 8)
			.join(' ');
		if (!en) continue;
		for (const k of kws) {
			const key = k.trim().toLowerCase();
			if (key.length >= 2 && !found.has(key)) found.set(key, en);
		}
	}
	return [...found.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function minePairs(items: CorpusItem[]): Promise<Array<[string, string]>> {
	const seeded = seedPairsFromKeywords(items);
	const { initAgent, completeText } = await import('../src/lib/server/agent/llm.ts');
	await initAgent();
	const found = new Map<string, string>();
	for (let i = 0; i < items.length; i += PASSAGES_PER_BATCH) {
		const batch = items.slice(i, i + PASSAGES_PER_BATCH);
		const blob = batch.map((b) => `- ${b.title}: ${b.content.slice(0, 220)}`).join('\n');
		const prompt =
			`You mine Swahili/Sheng search vocabulary for a Kenyan legal aid index written in English.\n` +
			`From the passages below, list distinct Swahili or Sheng words/phrases a Kenyan might use for these legal concepts, with English equivalents.\n` +
			`Output one per line as: swahili phrase => english words (single words, space separated).\n` +
			`Only Swahili/Sheng/proper-noun keys (no plain English keys). No commentary, only the lines.\n\n${blob}`;
		try {
			const raw = await completeText(prompt, { predict: 512, temp: 0.2 });
			for (const [sw, en] of parsePairs(raw)) {
				if (!found.has(sw)) found.set(sw, en);
			}
		} catch (e) {
			console.warn(`batch ${i / PASSAGES_PER_BATCH} failed, continuing:`, (e as Error).message);
		}
		console.log(`  mined batch ${i / PASSAGES_PER_BATCH + 1}: ${found.size} pairs so far`);
	}
	for (const [sw, en] of seeded) {
		if (!found.has(sw)) found.set(sw, en);
	}
	return [...found.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function main(): Promise<void> {
	const fresh = process.argv.includes('--fresh');
	const items = JSON.parse(readFileSync(corpusPath, 'utf8')) as CorpusItem[];
	const stopwords = computeStopwords(items);
	console.log(`Stopwords (DF>=${STOPWORD_DF}, N=${items.length}): ${stopwords.join(', ')}`);

	let pairs: Array<[string, string]> = [];
	if (!fresh) {
		try {
			const prev = JSON.parse(readFileSync(outPath, 'utf8')) as {
				pairs: Array<[string, string]>;
			};
			pairs = prev.pairs;
			console.log(`Carried ${pairs.length} checked-in pairs.`);
		} catch {
			console.log('No checked-in asset; mining from scratch.');
		}
	}
	const mined = await minePairs(items);
	const merged = new Map<string, string>(pairs);
	for (const [sw, en] of mined) {
		if (!merged.has(sw)) merged.set(sw, en);
	}
	pairs = [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0]));

	const asset = {
		$schema: 'hakili-expansions-v1',
		generated: {
			by: 'model',
			at: new Date().toISOString(),
			corpusPassages: items.length,
			stopwordDfThreshold: STOPWORD_DF,
			regenerate: 'pnpm expansions:build'
		},
		pairs,
		stopwords
	};
	writeFileSync(outPath, JSON.stringify(asset, null, '\t') + '\n');
	console.log(`Wrote ${outPath}: ${pairs.length} pairs, ${stopwords.length} stopwords.`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
