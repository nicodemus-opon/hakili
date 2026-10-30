/** Model lifecycle + structured completion primitives for the agent harness. */
import {
	EMBEDDINGGEMMA_300M_Q8_0,
	QWEN3_1_7B_INST_Q4,
	QWEN3_4B_INST_Q4_K_M,
	completion,
	embed,
	loadModel,
	unloadModel
} from '@qvac/sdk';
import { ensureSchema } from '../db.ts';
import type { Trace } from './observability.ts';
import { event } from './observability.ts';

// Dual-model setup: Qwen3-4B (~2.5GB) for heavy generation, Qwen3-1.7B
// (~1GB) for light classification/extraction. Strategy selection:
// QVAC_MODEL_STRATEGY=auto (default, both, routed per task) |
// large-only | small-only. Legacy QVAC_LLM_MODEL=1.7B still maps to
// small-only. QVAC_MODEL_KEEP=swap keeps one LLM resident (low-RAM:
// unload the other before loading); default both keeps both resident.
export const SMALL_LLM_MODEL = QWEN3_1_7B_INST_Q4;
export const LARGE_LLM_MODEL = QWEN3_4B_INST_Q4_K_M;
export const EMBED_MODEL = EMBEDDINGGEMMA_300M_Q8_0;

export type ModelTier = 'small' | 'large';

export type TaskKind =
	| 'classify'
	| 'title'
	| 'conversational'
	| 'expansion'
	| 'advice'
	| 'extract'
	| 'judge'
	| 'theory'
	| 'draft-questions'
	| 'planner'
	| 'tools'
	| 'plan'
	| 'repair'
	| 'followup'
	| 'translate-questions'
	| 'translate'
	| 'default';

/** Light triage/extraction runs on the 1.7B model; heavy generation and
 * agentic tool-calling stay on 4B where small models drift. */
const TASK_TO_TIER: Record<TaskKind, ModelTier> = {
	classify: 'small',
	title: 'small',
	conversational: 'small',
	expansion: 'small',
	advice: 'small',
	extract: 'small',
	judge: 'small',
	theory: 'small',
	'translate-questions': 'small',
	'draft-questions': 'large',
	planner: 'large',
	tools: 'large',
	plan: 'large',
	repair: 'large',
	followup: 'large',
	translate: 'large',
	default: 'large'
};

export type ModelStrategy = 'auto' | 'large-only' | 'small-only';

export function resolveModelStrategy(env: NodeJS.ProcessEnv = process.env): ModelStrategy {
	const raw = (env.QVAC_MODEL_STRATEGY ?? '').trim().toLowerCase();
	if (raw === 'auto' || raw === 'large-only' || raw === 'small-only') return raw;
	if (raw === '1.7b' || raw === 'small') return 'small-only';
	if (raw === '4b' || raw === 'large') return 'large-only';
	if ((env.QVAC_LLM_MODEL ?? '').trim() === '1.7B') return 'small-only';
	return 'auto';
}

/** Pure routing: task default tier, overridden by the strategy. No I/O,
 * so unit tests cover the matrix without loading models. */
export function pickTier(
	task: ModelTier | TaskKind | undefined,
	strategy: ModelStrategy = resolveModelStrategy()
): ModelTier {
	const base: ModelTier =
		task === 'small' || task === 'large' ? task : (TASK_TO_TIER[task ?? 'default'] ?? 'large');
	if (strategy === 'small-only') return 'small';
	if (strategy === 'large-only') return 'large';
	return base;
}

export function keepMode(env: NodeJS.ProcessEnv = process.env): 'both' | 'swap' {
	return (env.QVAC_MODEL_KEEP ?? '').trim().toLowerCase() === 'swap' ? 'swap' : 'both';
}

// Legacy descriptor export: large unless pinned to small-only.
export const LLM_MODEL =
	resolveModelStrategy() === 'small-only' ? SMALL_LLM_MODEL : LARGE_LLM_MODEL;

let smallId: string | null = null;
let largeId: string | null = null;
let embedId: string | null = null;
let ready = false;
let degradedDual = false;
let initPromise: Promise<void> | null = null;
const tierPromises = new Map<ModelTier, Promise<string> | null>();

async function loadSmall(): Promise<string> {
	return loadModel({
		modelSrc: QWEN3_1_7B_INST_Q4,
		modelConfig: { ctx_size: 4096, tools: true }
	});
}

async function loadLarge(): Promise<string> {
	return loadModel({
		modelSrc: QWEN3_4B_INST_Q4_K_M,
		modelConfig: { ctx_size: 4096, tools: true }
	});
}

async function ensureTier(tier: ModelTier): Promise<string> {
	if (tier === 'small' && smallId) return smallId;
	if (tier === 'large' && largeId) return largeId;
	const pending = tierPromises.get(tier);
	if (pending) return pending;
	const p = (async (): Promise<string> => {
		if (keepMode() === 'swap') {
			const other = tier === 'small' ? largeId : smallId;
			if (other) {
				try {
					await unloadModel({ modelId: other });
				} catch {
					/* eviction is best-effort; the load below decides */
				}
				if (tier === 'small') largeId = null;
				else smallId = null;
			}
		}
		const id = tier === 'small' ? await loadSmall() : await loadLarge();
		if (tier === 'small') smallId = id;
		else largeId = id;
		tierPromises.set(tier, null);
		return id;
	})().catch((e) => {
		tierPromises.set(tier, null);
		throw e;
	});
	tierPromises.set(tier, p);
	return p;
}

// Swap-mode serialiser: one LLM resident means concurrent requests for
// different tiers would thrash load/unload. Both-mode needs no lock.
let swapQueue: Promise<void> = Promise.resolve();

async function runSerialized<T>(fn: () => Promise<T>): Promise<T> {
	const prev = swapQueue;
	let done!: () => void;
	swapQueue = new Promise<void>((r) => {
		done = r;
	});
	await prev;
	try {
		return await fn();
	} finally {
		done();
	}
}

async function useTier<T>(
	task: ModelTier | TaskKind | undefined,
	fn: (id: string, tier: ModelTier) => Promise<T>
): Promise<T> {
	const tier = pickTier(task, resolveModelStrategy());
	if (keepMode() === 'swap') {
		return runSerialized(async () => {
			await initAgent();
			return fn(await ensureTier(tier), tier);
		});
	}
	await initAgent();
	return fn(await ensureTier(tier), tier);
}

async function seedCorpusIfEmpty(): Promise<void> {
	const { pool } = await import('../db.ts');
	const r = await pool.query('SELECT count(*)::int AS c FROM legal_documents');
	if ((r.rows[0]?.c ?? 0) > 0) {
		// Lightweight metadata sync (no re-embed): corpus URL fixes (e.g.
		// homepage -> specific AKN act pages) must reach existing installs
		// without forcing a full --force re-ingest. Only title/citation/url
		// metadata is touched; embeddings stay intact.
		try {
			const { default: corpus } = await import('../../data/kenyan-legal-corpus.json');
			const items = corpus as Array<{
				id: string;
				title: string;
				citation: string;
				url: string;
				topic?: string;
				source_type?: string;
			}>;
			for (const it of items) {
				await pool.query(
					`UPDATE legal_documents SET title=$2, citation=$3, url=$4 WHERE id=$1 AND (title IS DISTINCT FROM $2 OR citation IS DISTINCT FROM $3 OR url IS DISTINCT FROM $4)`,
					[it.id, it.title, it.citation, it.url]
				);
			}
		} catch {
			/* best-effort; retrieval still works with stale URLs */
		}
		return;
	}
	const { default: corpus } = await import('../../data/kenyan-legal-corpus.json');
	const items = corpus as Array<{
		id: string;
		title: string;
		citation: string;
		url: string;
		content: string;
		topic?: string;
		source_type?: string;
	}>;
	const { ingestCorpus } = await import('./retrieval.ts');
	await ingestCorpus(items);
}

async function doInit(): Promise<void> {
	await ensureSchema();
	const strategy = resolveModelStrategy();
	if (keepMode() === 'swap') {
		if (!embedId) embedId = await loadModel({ modelSrc: EMBED_MODEL });
		if (strategy === 'small-only') {
			if (!smallId) smallId = await loadSmall();
		} else if (!largeId) {
			largeId = await loadLarge();
		}
	} else if (strategy === 'auto') {
		if (!embedId) embedId = await loadModel({ modelSrc: EMBED_MODEL });
		// Large first (the default quality path must exist); small is
		// best-effort — a low-RAM box degrades to large-only, never to down.
		if (!largeId) largeId = await loadLarge();
		if (!smallId) {
			try {
				smallId = await loadSmall();
			} catch (e) {
				degradedDual = true;
				console.warn(
					`[llm] small model unavailable, continuing large-only: ${e instanceof Error ? e.message : String(e)}`
				);
			}
		}
	} else {
		if (!embedId) embedId = await loadModel({ modelSrc: EMBED_MODEL });
		if (strategy === 'small-only' && !smallId) smallId = await loadSmall();
		if (strategy === 'large-only' && !largeId) largeId = await loadLarge();
	}
	ready = true;
	await seedCorpusIfEmpty();
}

export async function initAgent(): Promise<void> {
	if (ready) return;
	if (!initPromise)
		initPromise = doInit().catch((e) => {
			initPromise = null;
			throw e;
		});
	await initPromise;
}

export function agentReady(): boolean {
	return ready;
}

/** Tiers currently resident (for /api/status). */
export function loadedTiers(): ModelTier[] {
	const out: ModelTier[] = [];
	if (smallId) out.push('small');
	if (largeId) out.push('large');
	return out;
}

export function dualDegraded(): boolean {
	return degradedDual;
}

export interface Sampling {
	temp?: number;
	repeat_penalty?: number;
	frequency_penalty?: number;
}

export interface CompleteOptions extends Sampling {
	predict: number;
	signal?: AbortSignal;
	/** Task or tier hint for dual-model routing. Defaults to 'default' (large). */
	model?: ModelTier | TaskKind;
}

async function streamToText(
	modelId: string,
	prompt: string,
	opts: CompleteOptions,
	trace?: Trace,
	tier?: ModelTier
): Promise<string> {
	const result = completion({
		modelId,
		history: [{ role: 'user', content: prompt }],
		stream: true,
		generationParams: {
			predict: opts.predict,
			reasoning_budget: 0,
			temp: opts.temp ?? 0.5,
			repeat_penalty: opts.repeat_penalty ?? 1.15,
			frequency_penalty: opts.frequency_penalty ?? 0.1
		}
	});
	let out = '';
	for await (const token of result.tokenStream) {
		if (opts.signal?.aborted) throw new Error('LLM completion aborted');
		out += token;
	}
	const cleaned = out.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
	if (trace)
		event(
			trace,
			'llm:complete',
			`chars=${cleaned.length} predict=${opts.predict}${tier ? ` model=${tier}` : ''}`
		);
	return cleaned;
}

export async function completeText(
	prompt: string,
	opts: CompleteOptions,
	trace?: Trace
): Promise<string> {
	return useTier(opts.model ?? 'default', (id, tier) =>
		streamToText(id, prompt, opts, trace, tier)
	);
}

/**
 * Token-streaming completion. Yields raw deltas as they arrive (preview
 * only); returns the cleaned full text on completion so callers can run
 * the deterministic citation/verification gates before shipping.
 */
export async function* streamText(
	prompt: string,
	opts: CompleteOptions,
	trace?: Trace
): AsyncGenerator<string, string> {
	const chunks: string[] = [];
	const gen = useTier(opts.model ?? 'default', async (id, tier) => {
		const run = completion({
			modelId: id,
			history: [{ role: 'user', content: prompt }],
			stream: true,
			generationParams: {
				predict: opts.predict,
				reasoning_budget: 0,
				temp: opts.temp ?? 0.5,
				repeat_penalty: opts.repeat_penalty ?? 1.15,
				frequency_penalty: opts.frequency_penalty ?? 0.1
			}
		});
		let out = '';
		for await (const token of run.tokenStream) {
			if (opts.signal?.aborted) throw new Error('LLM completion aborted');
			out += token;
			chunks.push(token);
		}
		const cleaned = out.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
		if (trace)
			event(trace, 'llm:complete', `chars=${cleaned.length} predict=${opts.predict} model=${tier}`);
		return cleaned;
	});
	// Yield deltas while the tier-locked run progresses. The promise
	// resolves to the cleaned text; deltas are raw preview tokens.
	let done = false;
	let full = '';
	const runner = (async () => {
		full = await gen;
		done = true;
		return full;
	})();
	let i = 0;
	while (!done) {
		if (i < chunks.length) {
			yield chunks[i++] as string;
		} else {
			await new Promise((r) => setTimeout(r, 15));
		}
	}
	full = await runner;
	// Drain any trailing deltas that arrived with the final batch.
	while (i < chunks.length) yield chunks[i++] as string;
	return full;
}

function extractJsonObject(text: string): string | null {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) return null;
	return text.slice(start, end + 1);
}

/**
 * Structured completion: parses the model output as JSON and runs `validate`.
 * Returns `{ ok: true, value }` on success, `{ ok: false, raw }` otherwise so
 * callers can fall back deterministically instead of throwing.
 */
export async function completeJson<T>(
	prompt: string,
	opts: CompleteOptions,
	validate: (parsed: unknown) => T | null,
	trace?: Trace
): Promise<{ ok: true; value: T } | { ok: false; raw: string }> {
	const raw = await completeText(prompt, opts, trace);
	if (/^\s*null\s*$/i.test(raw)) return { ok: false, raw };
	const candidates: string[] = [raw];
	const extracted = extractJsonObject(raw.replace(/```/g, ''));
	if (extracted && extracted !== raw) candidates.push(extracted);
	for (const candidate of candidates) {
		try {
			const parsed: unknown = JSON.parse(candidate);
			const value = validate(parsed);
			if (value !== null) return { ok: true, value };
		} catch {
			/* try next candidate */
		}
	}
	return { ok: false, raw };
}

/**
 * Tool-call output dialect override. Undefined = SDK auto-detection from the
 * model name (works for the bundled Qwen3 weights). Set QVAC_TOOL_DIALECT to
 * one of hermes|pythonic|json|harmony|qwen35|gemma4|dsml when a custom
 * model file name defeats auto-detection.
 */
export type ToolDialect = 'hermes' | 'pythonic' | 'json' | 'harmony' | 'qwen35' | 'gemma4' | 'dsml';

function resolveToolDialect(): ToolDialect | undefined {
	const raw = (process.env.QVAC_TOOL_DIALECT ?? '').trim().toLowerCase();
	if (
		raw === 'hermes' ||
		raw === 'pythonic' ||
		raw === 'json' ||
		raw === 'harmony' ||
		raw === 'qwen35' ||
		raw === 'gemma4' ||
		raw === 'dsml'
	)
		return raw;
	return undefined;
}

export interface StructuredOptions extends CompleteOptions {
	/** Schema name for the GBNF request (OpenAI-compat boundary only). */
	name?: string;
	/** Single retry in free-form mode when the constrained pass fails. */
	freeformRetry?: boolean;
}

/**
 * Structured completion via GBNF grammar-constrained decoding
 * (`responseFormat: json_schema`). The grammar masks invalid tokens during
 * sampling, so malformed JSON is unreachable rather than retried — the fix
 * for small-quantized-model format drift. Falls back to one free-form
 * attempt (manual extraction, same as `completeJson`) when the constrained
 * pass fails or the model backend lacks support.
 */
export async function completeStructured<T>(
	prompt: string,
	schema: Record<string, unknown>,
	opts: StructuredOptions,
	validate: (parsed: unknown) => T | null,
	trace?: Trace
): Promise<{ ok: true; value: T; constrained: boolean } | { ok: false; raw: string }> {
	// One tier for both passes: the free-form retry reuses the same model
	// id so swap-mode never evicts mid-call (no nested lock).
	return useTier(opts.model ?? 'default', async (id, tier) => {
		const name = opts.name ?? 'hakili_structured';
		// Constrained pass: schema must be explicit (strict does NOT auto-tighten,
		// so additionalProperties/required are encoded by each caller schema).
		try {
			const run = completion({
				modelId: id,
				history: [{ role: 'user', content: prompt }],
				stream: true,
				responseFormat: { type: 'json_schema', json_schema: { name, schema } },
				generationParams: {
					predict: opts.predict,
					reasoning_budget: 0,
					temp: opts.temp ?? 0.2,
					repeat_penalty: opts.repeat_penalty ?? 1.15,
					frequency_penalty: opts.frequency_penalty ?? 0.1
				}
			});
			let out = '';
			for await (const ev of run.events) {
				if (opts.signal?.aborted) throw new Error('LLM completion aborted');
				if (ev.type === 'contentDelta') out += ev.text;
			}
			const final = await run.final;
			const text = (final.contentText ?? out).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
			if (trace) event(trace, 'llm:structured', `chars=${text.length} constrained=1 model=${tier}`);
			if (text) {
				try {
					const value = validate(JSON.parse(text));
					if (value !== null) return { ok: true, value, constrained: true };
				} catch {
					/* fall through to free-form retry */
				}
			}
			if (trace) event(trace, 'llm:structured-validate-failed', `raw=${text.slice(0, 80)}`);
		} catch (e) {
			if (trace)
				event(trace, 'llm:structured-fallback', e instanceof Error ? e.message : String(e));
		}
		if (opts.freeformRetry === false) return { ok: false, raw: '' };
		// Free-form retry on the same model id (no re-route, no nested lock).
		const raw = await streamToText(id, prompt, opts, trace, tier);
		if (/^\s*null\s*$/i.test(raw)) return { ok: false, raw };
		const candidates: string[] = [raw];
		const extracted = extractJsonObject(raw.replace(/```/g, ''));
		if (extracted && extracted !== raw) candidates.push(extracted);
		for (const candidate of candidates) {
			try {
				const value = validate(JSON.parse(candidate));
				if (value !== null) return { ok: true, value, constrained: false };
			} catch {
				/* try next candidate */
			}
		}
		return { ok: false, raw };
	});
}

export interface NativeToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

export interface ToolsCompleteOptions extends Sampling {
	predict: number;
	signal?: AbortSignal;
	system?: string;
	/** Task or tier hint for dual-model routing. Defaults to 'default' (large). */
	model?: ModelTier | TaskKind;
}

/**
 * Native tool-calling completion. The tool parameter schemas constrain
 * decoding (GBNF), so the model can only emit calls matching the declared
 * shapes. `parallel_tool_calls: false` enforces single-tool-per-turn, which
 * is where 1.7B/4B-class models stay reliable.
 */
export async function completeWithTools(
	history: Array<{
		role: string;
		content: string;
		toolCalls?: Array<{ id?: string; name: string; arguments: Record<string, unknown> }>;
		toolCallId?: string;
		toolName?: string;
	}>,
	tools: import('@qvac/sdk').Tool[],
	opts: ToolsCompleteOptions,
	trace?: Trace
): Promise<{ content: string; toolCalls: NativeToolCall[] }> {
	return useTier(opts.model ?? 'default', async (id, tier) => {
		const run = completion({
			modelId: id,
			history,
			stream: true,
			tools,
			toolDialect: resolveToolDialect(),
			generationParams: {
				predict: opts.predict,
				reasoning_budget: 0,
				temp: opts.temp ?? 0.2,
				repeat_penalty: opts.repeat_penalty ?? 1.15,
				frequency_penalty: opts.frequency_penalty ?? 0.1,
				parallel_tool_calls: false
			}
		});
		for await (const ev of run.events) {
			if (opts.signal?.aborted) throw new Error('LLM completion aborted');
			if (trace && ev.type === 'toolCall')
				event(
					trace,
					'llm:tool-call',
					`${ev.call.name} args=${JSON.stringify(ev.call.arguments).slice(0, 120)}`
				);
			if (trace && ev.type === 'toolError')
				event(
					trace,
					'llm:tool-call-error',
					String(ev.error?.message ?? ev.error ?? '').slice(0, 120)
				);
		}
		const final = await run.final;
		const content = (final.contentText ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
		const toolCalls = (final.toolCalls ?? []).map((c, i) => ({
			id: c.id ?? `call-${i}`,
			name: c.name,
			arguments: (c.arguments ?? {}) as Record<string, unknown>
		}));
		if (trace)
			event(
				trace,
				'llm:tools-done',
				`content=${content.length} calls=${toolCalls.length} model=${tier}`
			);
		return { content, toolCalls };
	});
}

export async function embedText(text: string): Promise<number[]> {
	await initAgent();
	const { embedding } = await embed({ modelId: embedId as string, text });
	return embedding as number[];
}

/**
 * Batch embed, strictly sequential. The embed backend serves one job at a
 * time (concurrent calls fail with "a job is already set"), so workers or
 * Promise.all batching race and abort the whole batch. Slower, but reliable.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
	await initAgent();
	const out: number[][] = new Array(texts.length);
	for (let i = 0; i < texts.length; i++) {
		const { embedding } = await embed({ modelId: embedId as string, text: texts[i] as string });
		out[i] = embedding as number[];
	}
	return out;
}
