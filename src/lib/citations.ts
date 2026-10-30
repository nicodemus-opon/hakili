/** Short display labels for cited legal sources. */

/** Trailing qualifiers that repeat across the corpus and add no signal on a chip. */
const GENERIC_SUFFIX_RE = /\s*[—–-]\s*(general guidance|overview)\s*$/i;

/** Drop a trailing generic qualifier (`— general guidance`, `— overview`). */
export function stripGenericTitleSuffix(title: string): string {
	return title.trim().replace(GENERIC_SUFFIX_RE, '').trim();
}

/**
 * Chip label for a cited passage: the title minus generic suffixes,
 * falling back to a hostname or `[N]` when nothing distinctive remains.
 */
export function shortSourceLabel(title: string, index: number, fallback: string): string {
	return stripGenericTitleSuffix(title) || fallback || `[${index}]`;
}
