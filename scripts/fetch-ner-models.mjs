/**
 * Pre-fetch transformer NER models into `.qvac/models/hf` so the app works
 * fully offline afterwards. Run once on an online machine:
 *
 *   pnpm ner:fetch
 *
 * - English: Xenova/bert-base-multilingual-cased-ner-hrl (q8 ONNX).
 * - Kiswahili: only a LOCAL dir is used at runtime (Optimum export via
 *   `pnpm ner:convert`); this script just reports whether it exists.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const EN_MODEL = process.env.NER_MODEL_EN ?? 'Xenova/bert-base-multilingual-cased-ner-hrl';
const SW_DIR =
	process.env.NER_MODEL_SW ?? join(process.cwd(), '.qvac', 'models', 'swahili-ner-onnx');

async function main() {
	process.env.INTERVIEW_NER_FETCH = '1';
	const { env, pipeline } = await import('@huggingface/transformers');
	env.cacheDir = process.env.HF_CACHE ?? join(process.cwd(), '.qvac', 'models', 'hf');
	env.allowRemoteModels = true;
	mkdirSync(env.cacheDir, { recursive: true });
	console.log(`Fetching ${EN_MODEL} (q8) into ${env.cacheDir} ...`);
	const pipe = await pipeline('token-classification', EN_MODEL, { dtype: 'q8', device: 'cpu' });
	const out = await pipe('My employer Safaricom dismissed me in Kisumu.', {
		aggregation_strategy: 'simple'
	});
	console.log('English NER smoke test:', JSON.stringify(out));
	if (existsSync(SW_DIR)) {
		console.log(`Swahili NER dir present at ${SW_DIR}; verifying ...`);
		const sw = await pipeline('token-classification', SW_DIR, { dtype: 'q8', device: 'cpu' });
		console.log(
			'Swahili NER smoke test:',
			JSON.stringify(
				await sw('Tarehe 12 Mei 2024 Juma alinifukuza kazi Kisumu.', {
					aggregation_strategy: 'simple'
				})
			)
		);
	} else {
		console.log(
			`Swahili NER dir missing at ${SW_DIR} — run \`pnpm ner:convert\` on an online machine, then re-run this script. English NER works without it (Swahili falls back to lite extractors + LLM judges).`
		);
	}
	console.log('NER models ready (interview NER will work offline from here on).');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
