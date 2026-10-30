/**
 * Verify the EN→SW translation model export so the app works fully offline
 * afterwards. Run once on an online machine (after `pnpm mt:convert`):
 *
 *   pnpm mt:fetch
 *
 * The model is a LOCAL dir only (Optimum export of
 * `Helsinki-NLP/opus-mt-en-sw`); this script just smoke-tests it. Until the
 * export exists, translation falls back to the LLM path.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const MT_DIR =
	process.env.MT_MODEL_EN_SW ?? join(process.cwd(), '.qvac', 'models', 'mt-en-sw-onnx');

async function main() {
	if (!existsSync(MT_DIR)) {
		console.log(
			`MT model dir missing at ${MT_DIR} — run \`pnpm mt:convert\` on an online machine first. Translation uses the LLM fallback until then.`
		);
		return;
	}
	const { env, pipeline } = await import('@huggingface/transformers');
	env.cacheDir = process.env.HF_CACHE ?? join(process.cwd(), '.qvac', 'models', 'hf');
	env.allowRemoteModels = false;
	env.allowLocalModels = true;
	console.log(`Verifying MT model at ${MT_DIR} ...`);
	const pipe = await pipeline('translation', MT_DIR, { dtype: 'q8', device: 'cpu' });
	const out = await pipe('Our client demands payment of Ksh50,000 within 7 days.');
	console.log('MT smoke test:', JSON.stringify(out));
	console.log('MT model ready (Swahili translation will work offline from here on).');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
