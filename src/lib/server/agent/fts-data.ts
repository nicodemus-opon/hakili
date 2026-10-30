/**
 * Query-expansion data for hybrid retrieval. DO NOT HAND-EDIT the vocabulary.
 *
 * - `expansions.generated.json` is machine-generated (see
 *   `scripts/build-expansions.ts`, `pnpm expansions:build`):
 *   pairs are model-mined Swahili/Sheng -> English equivalents,
 *   stopwords are tokens with high document frequency across the corpus.
 * - This module only loads and types the asset. To change behaviour, change
 *   the corpus or re-run the script — never append pairs here.
 */
import asset from './expansions.generated.json' with { type: 'json' };

const raw = asset as { pairs?: unknown; stopwords?: unknown };

function isPair(v: unknown): v is [string, string] {
	return Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'string';
}

/** Model-mined Swahili/Sheng -> English equivalents (generated, not curated). */
export const FTS_SYNONYMS: Array<[string, string]> = Array.isArray(raw.pairs)
	? raw.pairs.filter(isPair)
	: [];

/** Corpus-derived stopwords: high-DF boilerplate + function words. */
export const FTS_STOPWORDS: Set<string> = new Set(
	Array.isArray(raw.stopwords)
		? raw.stopwords.filter((s): s is string => typeof s === 'string')
		: []
);
