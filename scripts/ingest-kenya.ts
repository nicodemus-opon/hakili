import corpus from '../src/lib/data/kenyan-legal-corpus.json' with { type: 'json' };
import { hasCorpus, ingestCorpus } from '../src/lib/server/agent/retrieval.ts';
import { initAgent } from '../src/lib/server/agent/llm.ts';

const args = new Set(process.argv.slice(2));
const force = args.has('--force') || args.has('-f');
const dryRun = args.has('--dry-run');

const ALLOWED = new Set([
	'constitutional',
	'criminal',
	'employment',
	'family',
	'succession',
	'land',
	'housing',
	'consumer',
	'debt',
	'traffic',
	'business',
	'ip',
	'privacy',
	'procedure',
	'general'
]);

const ALLOWED_SOURCE_TYPES = new Set(['legislation', 'guidance', 'ngo']);

function validate(
	items: Array<{
		id?: string;
		title?: string;
		citation?: string;
		url?: string;
		content?: string;
		topic?: string;
		source_type?: string;
		effective_date?: string | null;
		sw_keywords?: unknown;
	}>
): string[] {
	const errors: string[] = [];
	const seen = new Set<string>();
	for (const [i, it] of items.entries()) {
		const tag = it.id ?? `#${i}`;
		if (!it.id || seen.has(it.id)) errors.push(`duplicate/missing id: ${tag}`);
		seen.add(String(it.id));
		for (const f of ['title', 'citation', 'url', 'content'] as const) {
			if (!String(it[f] ?? '').trim()) errors.push(`${tag}: missing ${f}`);
		}
		if (!ALLOWED.has(String(it.topic ?? 'general'))) errors.push(`${tag}: bad topic ${it.topic}`);
		if (it.source_type && !ALLOWED_SOURCE_TYPES.has(String(it.source_type)))
			errors.push(`${tag}: bad source_type ${it.source_type}`);
		if (
			it.sw_keywords !== undefined &&
			!(
				Array.isArray(it.sw_keywords) &&
				it.sw_keywords.every((k) => typeof k === 'string' && k.trim().length > 0)
			)
		)
			errors.push(`${tag}: bad sw_keywords (want string[])`);
	}
	const counts = new Map<string, number>();
	for (const it of items) {
		const t = String(it.topic ?? 'general');
		counts.set(t, (counts.get(t) ?? 0) + 1);
	}
	for (const t of ALLOWED) {
		if (t !== 'general' && (counts.get(t) ?? 0) < 20)
			errors.push(`topic ${t} has only ${counts.get(t) ?? 0} passages (min 20)`);
	}
	return errors;
}

/**
 * Soft quality warnings (never fail the ingest): short content, non-HTTPS
 * URLs, near-duplicate 80-char prefixes, thin citations, missing
 * effective_date. Surfaced so corpus rot is visible before it degrades
 * retrieval faithfulness (Stanford: ~half of legal-RAG hallucinations are
 * retrieval failures).
 */
export function warnQuality(
	items: Array<{
		id?: string;
		title?: string;
		citation?: string;
		url?: string;
		content?: string;
		effective_date?: string;
	}>
): string[] {
	const warnings: string[] = [];
	const seen = new Map<string, string>();
	for (const [i, it] of items.entries()) {
		const tag = it.id ?? `#${i}`;
		if (String(it.content ?? '').trim().length < 40)
			warnings.push(`${tag}: content under 40 chars`);
		if (it.url && !String(it.url).startsWith('https://'))
			warnings.push(`${tag}: url is not https (${it.url})`);
		if (!String(it.citation ?? '').trim()) warnings.push(`${tag}: missing citation`);
		if (!String(it.effective_date ?? '').trim()) warnings.push(`${tag}: missing effective_date`);
		const key = String(it.content ?? '')
			.slice(0, 80)
			.toLowerCase()
			.replace(/\s+/g, ' ')
			.trim();
		if (key) {
			if (seen.has(key))
				warnings.push(`${tag}: near-duplicate of ${seen.get(key)} (80-char prefix)`);
			else seen.set(key, tag);
		}
	}
	return warnings;
}

async function main() {
	const items = corpus as Array<{
		id: string;
		title: string;
		citation: string;
		url: string;
		content: string;
		topic?: string;
		source_type?: string;
	}>;
	const errors = validate(items);
	if (errors.length > 0) {
		console.error(`Corpus validation failed (${errors.length}):`);
		for (const e of errors.slice(0, 30)) console.error(` - ${e}`);
		process.exit(1);
	}
	console.log(`Corpus OK: ${items.length} passages.`);
	const warnings = warnQuality(items);
	if (warnings.length > 0) {
		const byKind = new Map<string, number>();
		for (const w of warnings) {
			const kind = w.replace(/^[^:]+: /, '').replace(/ \(.*\)$/, '');
			byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
		}
		console.warn(`Corpus quality warnings (${warnings.length}):`);
		for (const [kind, n] of byKind) console.warn(` - ${n}x ${kind}`);
		for (const w of warnings.filter((x) => !x.includes('effective_date')).slice(0, 20))
			console.warn(` - ${w}`);
	}
	if (dryRun) return;
	await initAgent();
	if ((await hasCorpus()) && !force) {
		console.log(
			'Corpus already ingested; skipping. Use --force to re-ingest (e.g. after corpus updates).'
		);
		process.exit(0);
	}
	const n = await ingestCorpus(items);
	console.log(`Ingested ${n} legal passages.`);
	process.exit(0);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
