/**
 * Dedicated EN→SW translation engine (Helsinki-NLP/opus-mt-en-sw, MarianMT,
 * Apache-2.0, ~75M params).
 *
 * Why two runtimes: `@huggingface/transformers` tokenizes perfectly (its
 * Unigram ids match the Python reference bit-for-bit) but its Marian
 * generation path only accepts the merged-decoder ONNX layout, which the
 * Optimum export does not produce. So tokenization goes through
 * transformers.js (encode only) while the encoder/decoder sessions run
 * directly on onnxruntime-node with a small greedy loop — no black box.
 *
 * Same offline-first pattern as the Swahili NER model: the export lives in
 * `.qvac/models/mt-en-sw-onnx` (via `pnpm mt:convert`), runtime loads it
 * with no network and returns null when it was never exported — callers
 * fall back to the LLM translation path.
 *
 * Strictly fail-open: every function returns null on missing model or any
 * error. Never throws.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const MT_DIR =
	process.env.MT_MODEL_EN_SW ?? path.join(process.cwd(), '.qvac', 'models', 'mt-en-sw-onnx');

const EOS_ID = 0;
const DECODER_START_ID = 58949;

interface MtSessions {
	encodeIds: (text: string) => Promise<number[]>;
	translateIds: (ids: number[], mask: number[]) => Promise<string | null>;
	decodePieces: (ids: number[]) => string;
}

const sessions = new Map<string, Promise<MtSessions | null>>();

function cacheDir(): string {
	return process.env.HF_CACHE ?? path.join(process.cwd(), '.qvac', 'models', 'hf');
}

async function loadMtSessions(): Promise<MtSessions | null> {
	const hit = sessions.get('en-sw');
	if (hit) return hit;
	const job = (async (): Promise<MtSessions | null> => {
		try {
			if (!existsSync(path.join(MT_DIR, 'encoder_model.onnx'))) return null;
			if (!existsSync(path.join(MT_DIR, 'decoder_model.onnx'))) return null;
			const tf = await import('@huggingface/transformers');
			tf.env.cacheDir = cacheDir();
			// Offline-first: never fetch; the export must already exist.
			tf.env.allowRemoteModels = false;
			tf.env.allowLocalModels = true;
			const tok = await tf.AutoTokenizer.from_pretrained(MT_DIR);
			const ort = await import('onnxruntime-node');
			const so = { executionProviders: ['cpu'] } as never;
			// Prefer q8 weights when the export was quantized, else fp32.
			const encPath = path.join(
				MT_DIR,
				existsSync(path.join(MT_DIR, 'encoder_model_quantized.onnx'))
					? 'encoder_model_quantized.onnx'
					: 'encoder_model.onnx'
			);
			const decPath = path.join(
				MT_DIR,
				existsSync(path.join(MT_DIR, 'decoder_model_quantized.onnx'))
					? 'decoder_model_quantized.onnx'
					: 'decoder_model.onnx'
			);
			const encoder = await ort.InferenceSession.create(encPath, so);
			const decoder = await ort.InferenceSession.create(decPath, so);
			// id → piece table for decoding (Unigram pieces from vocab.json).
			const vocab = JSON.parse(readFileSync(path.join(MT_DIR, 'vocab.json'), 'utf8')) as Record<
				string,
				number
			>;
			const pieces: string[] = [];
			for (const [piece, id] of Object.entries(vocab)) pieces[id] = piece;

			const encodeIds = async (text: string): Promise<number[]> => {
				const enc = (await tok(text, {
					padding: false,
					truncation: true,
					max_length: 512
				})) as unknown as { input_ids: { data: bigint[] } | bigint[] };
				const raw = enc.input_ids;
				const big = Array.isArray(raw) ? raw : Array.from(raw.data ?? []);
				return big.map(Number);
			};
			const decodePieces = (ids: number[]): string =>
				ids
					.map((id) => pieces[id] ?? '')
					.join('')
					.replace(/▁/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();

			const translateIds = async (ids: number[], mask: number[]): Promise<string | null> => {
				const n = ids.length;
				const encIds = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [
					1,
					n
				]) as never;
				const encMask = new ort.Tensor('int64', BigInt64Array.from(mask.map(BigInt)), [
					1,
					n
				]) as never;
				const encOut = await encoder.run({ input_ids: encIds, attention_mask: encMask });
				const hidden = encOut['last_hidden_state'] as unknown as {
					data: Float32Array;
					dims: number[];
				};
				if (!hidden) return null;
				const hiddenData = hidden.data as Float32Array;
				const hiddenDim = hidden.dims[2] ?? 512;
				// Batched beam search: the model's greedy stub ('M' for
				// 'Mteja') derails single-path decoding, so keep several
				// hypotheses alive in one batched decoder call per step.
				const BEAMS = 4;
				// Cap output length relative to input: the base model
				// occasionally appends memorized boilerplate past the
				// natural end (religious closings).
				const MAX_STEPS = Math.min(96, Math.max(40, n * 3));
				type Hypo = { ids: number[]; score: number; done: boolean };
				let hypos: Hypo[] = [{ ids: [DECODER_START_ID], score: 0, done: false }];
				const finished: Hypo[] = [];
				const vocabOf = (logits: { data: Float32Array; dims: number[] }, row: number) => {
					const vs = logits.dims[2] ?? 58950;
					return { data: logits.data as Float32Array, row: row * vs, vs };
				};
				const bannedTrigram = (seq: number[], cand: number): boolean => {
					if (seq.length < 2) return false;
					const a = seq[seq.length - 2] ?? -1;
					const b = seq[seq.length - 1] ?? -2;
					for (let i = 0; i + 2 < seq.length; i++) {
						if (seq[i] === a && seq[i + 1] === b && seq[i + 2] === cand) return true;
					}
					return false;
				};
				outer: for (let step = 0; step < MAX_STEPS; step++) {
					const alive = hypos.filter((h) => !h.done);
					if (alive.length === 0) break;
					const m = Math.max(...alive.map((h) => h.ids.length));
					// Pad alive hypos to equal length for the batch.
					const batchIds: number[] = [];
					for (const h of alive) {
						const pad = new Array(m - h.ids.length).fill(EOS_ID);
						batchIds.push(...pad, ...h.ids);
					}
					const flatHidden = new Float32Array(alive.length * n * hiddenDim);
					for (let b = 0; b < alive.length; b++) flatHidden.set(hiddenData, b * n * hiddenDim);
					const decIds = new ort.Tensor('int64', BigInt64Array.from(batchIds.map(BigInt)), [
						alive.length,
						m
					]) as never;
					const repHidden = new ort.Tensor('float32', flatHidden, [
						alive.length,
						n,
						hiddenDim
					]) as never;
					const repMask = new ort.Tensor(
						'int64',
						BigInt64Array.from(new Array(alive.length * n).fill(BigInt(1))),
						[alive.length, n]
					) as never;
					const decOut = await decoder.run({
						input_ids: decIds,
						encoder_attention_mask: repMask,
						encoder_hidden_states: repHidden
					});
					const logits = decOut['logits'] as unknown as {
						data: Float32Array;
						dims: number[];
					};
					if (!logits) return null;
					type Cand = { h: number; tok: number; score: number };
					const cands: Cand[] = [];
					for (let b = 0; b < alive.length; b++) {
						const { data, row, vs } = vocabOf(logits, b * m + (m - 1));
						// Top-BEAMS tokens per hypo (log-space).
						const top: Array<{ tok: number; s: number }> = [];
						const lse = (() => {
							let mx = -Infinity;
							for (let v = 0; v < vs; v++) {
								if (v === 1) continue;
								const s = data[row + v] ?? -Infinity;
								if (s > mx) mx = s;
							}
							let sum = 0;
							for (let v = 0; v < vs; v++) {
								if (v === 1) continue;
								const s = data[row + v] ?? -Infinity;
								if (s > -Infinity) sum += Math.exp(s - mx);
							}
							return mx + Math.log(sum || 1);
						})();
						for (let v = 0; v < vs; v++) {
							if (v === 1) continue;
							const s = data[row + v] ?? -Infinity;
							if (s === -Infinity) continue;
							const seq = alive[b]?.ids ?? [];
							if (v !== EOS_ID && bannedTrigram(seq, v)) continue;
							top.push({ tok: v, s: s - lse });
							if (top.length > BEAMS * 2) {
								top.sort((x, y) => y.s - x.s);
								top.length = BEAMS * 2;
							}
						}
						top.sort((x, y) => y.s - x.s);
						for (const t of top.slice(0, BEAMS)) cands.push({ h: b, tok: t.tok, score: t.s });
					}
					const next: Hypo[] = [];
					cands.sort(
						(a, b2) => b2.score + (alive[b2.h]?.score ?? 0) - (a.score + (alive[a.h]?.score ?? 0))
					);
					for (const c of cands) {
						if (next.length >= BEAMS) break;
						const base = alive[c.h];
						if (!base) continue;
						const ids2 = [...base.ids, c.tok];
						if (c.tok === EOS_ID)
							finished.push({ ids: ids2, score: base.score + c.score, done: true });
						else next.push({ ids: ids2, score: base.score + c.score, done: false });
					}
					// Keep already-finished hypos out; carry done hypos forward.
					hypos = [...hypos.filter((h) => h.done), ...next];
					if (hypos.filter((h) => !h.done).length === 0) break outer;
				}
				const pool = [...finished, ...hypos.filter((h) => h.ids.length > 1)];
				if (pool.length === 0) return null;
				// Average logprob per token: total-score ranking rewards
				// rambling continuations past the natural end.
				pool.sort((a, b) => b.score / b.ids.length - a.score / a.ids.length);
				const best = pool[0]?.ids.slice(1).filter((t) => t !== EOS_ID) ?? [];
				if (best.length === 0) return null;
				return decodePieces(best);
			};
			return { encodeIds, translateIds, decodePieces };
		} catch {
			return null;
		}
	})();
	sessions.set('en-sw', job);
	return job;
}

/**
 * Split text into MT-sized chunks (one sentence-ish each; header lines
 * without terminal punctuation stay glued to the following chunk). Callers
 * rejoin with their own separators, so only the chunks are returned.
 *
 * Fragments translate worse than whole sentences, so only overlong
 * sentences split at clause boundaries.
 */
const MAX_CHUNK = 280;

export function splitForMt(text: string): string[] {
	const out: string[] = [];
	const sentences = text
		.split(/(?<=[.!?])\s+/)
		.map((c) => c.trim())
		.filter((c) => c.length > 0);
	for (const s of sentences) {
		if (s.length <= MAX_CHUNK) {
			out.push(s);
			continue;
		}
		const parts = s.split(/([,;:])\s+/);
		let cur = '';
		for (let i = 0; i < parts.length; i += 2) {
			const frag = (parts[i] ?? '').trim();
			const sep = parts[i + 1] ?? '';
			if (!frag) continue;
			const piece = sep ? `${frag}${sep}` : frag;
			if (cur && `${cur} ${piece}`.length > MAX_CHUNK) {
				out.push(cur.trim());
				cur = piece;
			} else {
				cur = cur ? `${cur} ${piece}` : piece;
			}
		}
		if (cur.trim()) out.push(cur.trim());
	}
	return out;
}

/**
 * Source normalization for the MT engine: the model's training data maps
 * "customer" → mteja reliably but reads "client" as mlinzi (guard) half the
 * time. Counsel's English still says "client" everywhere; only the copy sent
 * to MT is normalized. One app-wide rule, not a term list.
 */
export function normalizeForMt(text: string): string {
	return text.replace(/\bclients?\b/gi, (m) => {
		const base = /^C/.test(m) ? 'Customer' : 'customer';
		return /s$/i.test(m) ? `${base}s` : base;
	});
}

/**
 * Peel fixed letter scaffolding off a line: returns the final Swahili head
 * plus the untranslated rest, or null when the line is ordinary prose.
 * Closed-form conventions with exact Kiswahili equivalents — the old model
 * mangles them ("Dear Sir or Madam" → "Noti au Kivutio"), so they must
 * never enter MT.
 */
export function peelHeaderLine(line: string): { swHead: string; rest: string } | null {
	const m = line.match(
		/^(\s*)(to\s*:|re\s*:|dear\s+sir(?:\s+or\s+madam|\/madam)?\s*,?|yours\s+(?:faithfully|sincerely)\s*,?)(.*)$/i
	);
	if (!m) return null;
	const head = m[2] ?? '';
	const rest = m[3] ?? '';
	let swHead: string;
	if (/^to/i.test(head)) swHead = 'Kwa:';
	else if (/^re/i.test(head)) swHead = 'Kuhusu:';
	else if (/^dear/i.test(head)) swHead = 'Mpendwa Bwana/Bibi,';
	else swHead = 'Wako mwaminifu,';
	return { swHead, rest };
}

/**
 * Map fixed letter scaffolding line-by-line (same rules as peelHeaderLine,
 * for single-shot callers); the translation flow uses peelHeaderLine so the
 * Swahili head never re-enters the model.
 */
export function mapLetterHeaders(text: string): string {
	return text
		.split('\n')
		.map((line) => {
			const peeled = peelHeaderLine(line);
			if (!peeled) return line;
			return peeled.rest.trim() ? `${peeled.swHead} ${peeled.rest.trim()}` : peeled.swHead;
		})
		.join('\n');
}

/** Translate chunks in order; returns null on any failure. Never throws. */
export async function translateSegments(
	chunks: string[],
	opts: { signal?: AbortSignal } = {}
): Promise<string[] | null> {
	if (chunks.length === 0) return [];
	if (opts.signal?.aborted) return null;
	try {
		const rt = await loadMtSessions();
		if (!rt || opts.signal?.aborted) return null;
		const out: string[] = [];
		for (const c of chunks) {
			if (opts.signal?.aborted) return null;
			const ids = await rt.encodeIds(c);
			if (ids.length === 0) return null;
			const t = await rt.translateIds(
				ids,
				ids.map(() => 1)
			);
			if (!t) return null;
			out.push(t);
		}
		return out;
	} catch {
		return null;
	}
}

/** Test hook: clear the cached sessions between tests. */
export function clearMtCaches(): void {
	sessions.clear();
}
