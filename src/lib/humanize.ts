/** Humanize programmatic identifiers for UI titles (client + server safe). */

export function humanizeLabel(value: string): string {
	const raw = String(value ?? '').trim();
	if (!raw) return raw;
	const spaced = raw
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (!spaced) return raw;
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
