/**
 * Phase 2 transformer NER — proper PER/ORG/LOC extraction via
 * `@huggingface/transformers` (ONNX, local, offline after first fetch).
 *
 * - English: `Xenova/bert-base-multilingual-cased-ner-hrl` (ready ONNX, q8).
 *   Verified 10 HRL languages (ar/de/en/es/fr/it/lv/nl/pt/zh) — no Swahili.
 * - Kiswahili: local ONNX dir (default `.qvac/models/swahili-ner-onnx`),
 *   produced once via `scripts/convert-swahili-ner.py` (Optimum export of
 *   `eolang/Swahili-NER-BertBase-Cased`), then cached offline like `.qvac`.
 *
 * Offline-first: remote downloads happen ONLY when `INTERVIEW_NER_FETCH=1`
 * (i.e. `pnpm ner:fetch` on an online machine). At runtime — and in every
 * unit test — `allowRemoteModels` is false, so `pipeline()` resolves purely
 * from the `.qvac/models/hf` cache and returns null when a model was never
 * fetched. The Kiswahili model is always local-only (Optimum export).
 *
 * Strictly advisory and fail-open: `extractEntities` returns null when
 * disabled (`INTERVIEW_NER=0`), when a model is missing, or on any
 * load/inference error. The only hard integration is the
 * `questionEntitiesKnown` bypass in `interview/loop.ts`, which mirrors the
 * `isUserEcho` bypass — it can only grant grounded=true (every question
 * entity appears in the known texts), never reject; rejection stays with
 * the LLM judge.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { boundedSet } from '../context.ts';
import type { ResponseLang } from '../types.ts';

export interface NerEntity {
	text: string;
	label: string;
	score: number;
}

export interface NerResult {
	entities: NerEntity[];
	/** Model id or local dir that produced the entities. */
	model: string;
}

const EN_MODEL = process.env.NER_MODEL_EN ?? 'Xenova/bert-base-multilingual-cased-ner-hrl';
const SW_MODEL_DIR =
	process.env.NER_MODEL_SW ?? path.join(process.cwd(), '.qvac', 'models', 'swahili-ner-onnx');

export function nerEnabled(): boolean {
	return process.env.INTERVIEW_NER !== '0';
}

type NerPipe = (
	text: string,
	opts?: Record<string, unknown>
) => Promise<Array<{ entity_group?: string; entity?: string; word: string; score: number }>>;

const pipes = new Map<string, Promise<NerPipe | null>>();

function cacheDir(): string {
	return process.env.HF_CACHE ?? path.join(process.cwd(), '.qvac', 'models', 'hf');
}

function loadPipe(key: string, model: string, localOnly: boolean): Promise<NerPipe | null> {
	const hit = pipes.get(key);
	if (hit) return hit;
	const job = (async (): Promise<NerPipe | null> => {
		try {
			if (localOnly && !existsSync(model)) return null;
			const tf = await import('@huggingface/transformers');
			tf.env.cacheDir = cacheDir();
			// Offline-first: no network unless explicitly fetching.
			tf.env.allowRemoteModels = !localOnly && process.env.INTERVIEW_NER_FETCH === '1';
			tf.env.allowLocalModels = true;
			const pipe = await tf.pipeline('token-classification', model, {
				dtype: 'q8',
				device: 'cpu'
			});
			return (async (text: string, opts?: Record<string, unknown>) => {
				const raw = (await (pipe as (t: string, o?: unknown) => Promise<unknown>)(
					text,
					opts ?? { aggregation_strategy: 'simple' }
				)) as Array<{ entity_group?: string; entity?: string; word: string; score: number }>;
				return Array.isArray(raw) ? raw : [];
			}) as NerPipe;
		} catch {
			return null;
		}
	})();
	pipes.set(key, job);
	return job;
}

const entityCache = new Map<string, NerResult | null>();

/** Raw transformer extraction, or null when unavailable. Never throws. */
export async function extractEntities(
	text: string,
	lang: ResponseLang = 'en',
	opts: { signal?: AbortSignal } = {}
): Promise<NerResult | null> {
	if (!nerEnabled() || opts.signal?.aborted) return null;
	const slice = text.slice(0, 1000).trim();
	if (!slice) return null;
	const cacheKey = `${lang}:${slice}`;
	const hit = entityCache.get(cacheKey);
	if (hit !== undefined) return hit;
	try {
		const sw = lang === 'sw';
		const model = sw ? SW_MODEL_DIR : EN_MODEL;
		const pipe = await loadPipe(sw ? `sw:${model}` : `en:${model}`, model, sw);
		if (!pipe || opts.signal?.aborted) {
			boundedSet(entityCache, cacheKey, null, 200);
			return null;
		}
		const raw = await pipe(slice, { aggregation_strategy: 'simple' });
		const entities = raw
			.filter((e) => (e.score ?? 0) >= 0.5 && e.word.trim().length >= 2)
			.map((e) => ({
				text: e.word.replace(/^##/, '').trim(),
				label: String(e.entity_group ?? e.entity ?? 'ENT').toUpperCase(),
				score: e.score
			}))
			.filter((e) => e.text.length >= 2)
			.slice(0, 20);
		const out: NerResult = { entities, model };
		boundedSet(entityCache, cacheKey, out, 200);
		return out;
	} catch {
		boundedSet(entityCache, cacheKey, null, 200);
		return null;
	}
}

function normEntity(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9À-ÿ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Bypass check (mirrors `isUserEcho`): true only when the question carries
 * at least one NER entity AND every one of its entities is already present
 * in the known texts (exact or shared 4+ char token stem, same tolerance as
 * `quoteGrounds`). False/null means "no bypass" — the caller must still run
 * the LLM judge. `extract` is injectable so unit tests stay offline.
 */
export async function questionEntitiesKnown(
	question: string,
	knownTexts: string[],
	lang: ResponseLang = 'en',
	extract: (text: string, l: ResponseLang) => Promise<NerResult | null> = (t, l) =>
		extractEntities(t, l)
): Promise<boolean> {
	try {
		const [qRes, ...kRes] = await Promise.all([
			extract(question, lang),
			...knownTexts.map((t) => extract(t, lang))
		]);
		const qEnts = (qRes?.entities ?? []).map((e) => normEntity(e.text)).filter(Boolean);
		if (qEnts.length === 0) return false;
		const known = new Set(
			kRes.flatMap((r) => (r?.entities ?? []).map((e) => normEntity(e.text))).filter(Boolean)
		);
		if (known.size === 0) return false;
		return qEnts.every((q) =>
			[...known].some((k) => {
				if (!k || !q) return false;
				if (k.includes(q) || q.includes(k)) return true;
				const qt = q.split(' ').filter(Boolean);
				const kt = new Set(k.split(' ').filter(Boolean));
				return (
					qt.length > 0 &&
					qt.every((t) =>
						[...kt].some((s) => {
							const n = Math.min(t.length, s.length);
							let shared = 0;
							while (shared < n && t[shared] === s[shared]) shared++;
							return shared >= 4;
						})
					)
				);
			})
		);
	} catch {
		return false;
	}
}

/** Test hook: clear cached pipes/entities between tests. */
export function clearNerCaches(): void {
	pipes.clear();
	entityCache.clear();
}
