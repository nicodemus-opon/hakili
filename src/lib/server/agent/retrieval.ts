/** Hybrid retrieval: parallel vector + FTS legs fused with weighted RRF. */
import { pool } from '../db.ts';
import { embedText, embedTexts, completeText, initAgent } from './llm.ts';
import { expandQueryTerms, ftsOrQuery, orQueryAddsTerms, plainOrQuery } from './language.ts';
import { isGroundedInLaw } from './interview/policy.ts';
import { ALLOWED_TOPICS, type Passage, type RetrievalOptions } from './types.ts';
import type { Trace } from './observability.ts';
import { event, mark } from './observability.ts';

const RRF_K = 60;
const FTS_WEIGHT_EXPANDED = 3;
const FTS_WEIGHT_PLAIN = 1;

export async function hasCorpus(): Promise<boolean> {
	const r = await pool.query('SELECT count(*)::int AS c FROM legal_documents');
	return (r.rows[0]?.c ?? 0) > 0;
}

export async function ingestCorpus(
	items: Array<{
		id: string;
		title: string;
		citation: string;
		url: string;
		content: string;
		topic?: string;
		source_type?: string;
		effective_date?: string;
	}>,
	trace?: Trace
): Promise<number> {
	await initAgent();
	// Batch embeddings first (concurrency-capped) so a 100+ passage corpus
	// does not pay a full sequential round-trip per row.
	const vectors = await embedTexts(items.map((i) => i.content));
	let count = 0;
	for (const [idx, item] of items.entries()) {
		await pool.query(
			`INSERT INTO legal_documents (id, title, citation, url, content, topic, source_type, effective_date, embedding)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)
			 ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, citation=EXCLUDED.citation, url=EXCLUDED.url, content=EXCLUDED.content, topic=EXCLUDED.topic, source_type=EXCLUDED.source_type, effective_date=EXCLUDED.effective_date, embedding=EXCLUDED.embedding`,
			[
				item.id,
				item.title,
				item.citation,
				item.url,
				item.content,
				item.topic ?? 'general',
				item.source_type ?? 'legislation',
				item.effective_date ?? null,
				JSON.stringify(vectors[idx])
			]
		);
		count++;
	}
	if (trace) event(trace, 'retrieval:ingest', `count=${count}`);
	return count;
}

interface Row {
	id: string;
	title: string;
	citation: string;
	url: string;
	content: string;
	topic: string;
}

async function vectorLeg(
	qv: number[],
	topK: number,
	topic: string | undefined,
	signal?: AbortSignal
): Promise<Row[]> {
	const topicFilter = topic && topic !== 'general' ? 'AND topic = $3' : '';
	const params: unknown[] =
		topic && topic !== 'general'
			? [JSON.stringify(qv), topK * 2, topic]
			: [JSON.stringify(qv), topK * 2];
	const res = await pool.query(
		`SELECT id, title, citation, url, content, topic,
		        1 - (embedding <=> $1::vector) AS score
		 FROM legal_documents
		 WHERE TRUE ${topicFilter}
		 ORDER BY embedding <=> $1::vector
		 LIMIT $2`,
		params
	);
	if (signal?.aborted) throw new Error('Retrieval aborted');
	return res.rows as Row[];
}

async function ftsLeg(
	tsQuery: string,
	topK: number,
	topic: string | undefined,
	signal?: AbortSignal
): Promise<Row[]> {
	const matchFn = `to_tsquery('simple', $1)`;
	const params: unknown[] =
		topic && topic !== 'general' ? [tsQuery, topK * 2, topic] : [tsQuery, topK * 2];
	const sql =
		topic && topic !== 'general'
			? `SELECT id, title, citation, url, content, topic, ts_rank(search_vector, ${matchFn}) AS score FROM legal_documents WHERE search_vector @@ ${matchFn} AND topic = $3 ORDER BY score DESC LIMIT $2`
			: `SELECT id, title, citation, url, content, topic, ts_rank(search_vector, ${matchFn}) AS score FROM legal_documents WHERE search_vector @@ ${matchFn} ORDER BY score DESC LIMIT $2`;
	const res = await pool.query(sql, params);
	if (signal?.aborted) throw new Error('Retrieval aborted');
	return res.rows as Row[];
}

export function fuseRankings(vec: Row[], fts: Row[], ftsWeight: number, topK: number): Passage[] {
	const scores = new Map<string, number>();
	const byId = new Map<string, Row>();
	for (const [i, r] of vec.entries()) {
		scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + i + 1));
		byId.set(r.id, r);
	}
	for (const [i, r] of fts.entries()) {
		scores.set(r.id, (scores.get(r.id) ?? 0) + ftsWeight / (RRF_K + i + 1));
		if (!byId.has(r.id)) byId.set(r.id, r);
	}
	return [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([id, s]) => {
			const r = byId.get(id)!;
			return {
				id: r.id,
				title: r.title,
				citation: r.citation,
				url: r.url,
				content: r.content,
				topic: r.topic,
				score: s
			};
		})
		.filter((p, i, arr) => arr.findIndex((q) => q.id === p.id) === i)
		.slice(0, topK);
}

/**
 * Diversity cap over fused passages: preserves ranking but drops exact
 * near-duplicates (same 80-char content prefix) and prefers topic variety.
 * Two passes: first keeps up to `maxPerTopic` per topic, then fills any
 * remaining slots (up to `maxTotal`) with skipped same-topic items in rank
 * order — so diversity never starves a query whose answer is all one topic.
 * Pure and additive — callers pass the already-fused list.
 */
export function diversifyPassages(
	passages: Passage[],
	maxPerTopic = 3,
	maxTotal = passages.length
): Passage[] {
	const seenContent = new Set<string>();
	const perTopic = new Map<string, number>();
	const kept: Passage[] = [];
	const skipped: Passage[] = [];
	for (const p of passages) {
		const key = p.content.slice(0, 80).toLowerCase().replace(/\s+/g, ' ').trim();
		if (key && seenContent.has(key)) continue;
		if (key) seenContent.add(key);
		const topic = p.topic || 'general';
		const count = perTopic.get(topic) ?? 0;
		if (count >= maxPerTopic) {
			skipped.push(p);
			continue;
		}
		perTopic.set(topic, count + 1);
		kept.push(p);
	}
	// Fill pass: skipped items were already deduped above, just observe total.
	const out = kept.slice();
	for (const p of skipped) {
		if (out.length >= maxTotal) break;
		out.push(p);
	}
	return out.slice(0, Math.max(maxTotal, 0));
}

/**
 * Applicability gate: keep only passages sharing at least one content
 * token (prefix-tolerant) with the query. Similarity ranks; applicability
 * filters — a hire-purchase line is similar to "fully paid" but may not
 * apply to an outright sale, while an accident line shares nothing at all
 * with a transfer delay. One gate for every consumer (interview drafting,
 * plan, follow-up, fallback): inapplicable lines never reach a prompt, so
 * no layer needs its own per-matter exclusion list. Fails OPEN: an empty
 * result keeps every passage, so short queries and outages never starve
 * drafting.
 */
export function filterApplicablePassages(queryText: string, passages: Passage[]): Passage[] {
	if (!queryText.trim() || passages.length === 0) return passages;
	const kept = passages.filter((p) => isGroundedInLaw(p.content, queryText));
	return kept.length > 0 ? kept : passages;
}

export async function searchLegal(
	query: string,
	topK = 6,
	topic?: string,
	opts: RetrievalOptions = {},
	trace?: Trace
): Promise<Passage[]> {
	await initAgent();
	const started = Date.now();
	const qv = await embedText(query);
	// Expansion strategy, cheapest and most precise first: the generated
	// index for known vocabulary, then the model for unseen words (cached),
	// then plain content-word OR. The FTS leg gets a higher fusion weight
	// only when expansion actually contributed novel terms beyond the raw
	// query — decided from data, not a hand flag.
	let orQuery = ftsOrQuery(query);
	if (orQuery === null) {
		try {
			const modelExpansion = await expandQueryTerms(query, trace);
			if (modelExpansion) orQuery = modelExpansion;
		} catch {
			/* no expansion; the vector leg decides */
		}
	}
	const plainOr = orQuery !== null ? null : plainOrQuery(query);
	const tsQuery = orQuery ?? plainOr;
	const boostFts = orQueryAddsTerms(query, orQuery);

	const legs: Array<Promise<Row[]>> = [
		vectorLeg(qv, topK, topic, opts.signal),
		tsQuery === null
			? Promise.resolve([])
			: ftsLeg(tsQuery, topK, topic, opts.signal).catch(() => [])
	];
	const [vecRows, ftsRows] = await Promise.all(legs);
	let vec = vecRows;
	if (vec.length === 0) {
		const fallback = await pool.query(
			`SELECT id, title, citation, url, content, topic, 1 - (embedding <=> $1::vector) AS score FROM legal_documents ORDER BY embedding <=> $1::vector LIMIT $2`,
			[JSON.stringify(qv), topK * 2]
		);
		vec = fallback.rows as Row[];
	}
	// Fuse with oversampled depth so the diversity pass has minority
	// candidates to promote; the fill pass + final slice guarantee topK
	// items whenever that many exist (no starvation). The per-topic cap
	// floor is 3: with 3 or fewer slots callers want ranked precision, and
	// diversity promotion only kicks in for larger prompts (plan default 6).
	const rawFused = fuseRankings(
		vec,
		ftsRows,
		boostFts ? FTS_WEIGHT_EXPANDED : FTS_WEIGHT_PLAIN,
		topK * 2
	);
	const fused = diversifyPassages(rawFused, Math.max(3, topK - 1), topK);
	const applicable = filterApplicablePassages(query, fused);
	if (trace) {
		mark(trace, 'retrievalMs');
		event(
			trace,
			'retrieval:search',
			`vec=${vec.length} fts=${ftsRows.length} fused=${fused.length} applicable=${applicable.length} ms=${Date.now() - started}`
		);
	}
	return applicable;
}

export async function classifyIssue(issue: string, trace?: Trace): Promise<string> {
	await initAgent();
	const prompt = `Classify the following legal issue into ONE topic from this list: constitutional, criminal, employment, family, succession, land, housing, consumer, debt, traffic, business, ip, privacy, procedure, general. The issue may be in English, Kiswahili, or Sheng — classify by meaning, not language. Return only the topic word.\n\nIssue: ${issue}`;
	const out = (
		await completeText(prompt, { predict: 16, temp: 0.1, model: 'classify' }, trace)
	).toLowerCase();
	const found = ALLOWED_TOPICS.find((t) => new RegExp(`\\b${t}\\b`).test(out));
	return found ?? 'general';
}

/** Topic badge grounded in what retrieval actually found, not in a guess. */
export function deriveTopic(passages: Array<{ topic: string }>): string {
	const votes = new Map<string, number>();
	for (const p of passages.slice(0, 3)) {
		if (!p.topic || p.topic === 'general') continue;
		votes.set(p.topic, (votes.get(p.topic) ?? 0) + 1);
	}
	let best: string | null = null;
	let bestCount = 0;
	for (const [t, c] of votes) {
		if (c > bestCount && (ALLOWED_TOPICS as readonly string[]).includes(t)) {
			best = t;
			bestCount = c;
		}
	}
	return best ?? 'general';
}
