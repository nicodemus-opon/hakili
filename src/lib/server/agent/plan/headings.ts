/** Advocate memo headings per language. The app serves advocates only:
 * no lay summaries, no paralegal referrals, no legal-aid footer. */
import type { ResponseLang } from '../types.ts';

/**
 * Section contract: every memo states facts as instructed, issues, governing
 * law, application, exposure, strategy, open authorities, and a professional
 * note. Limitation/deadlines and urgent risks are conditional — included only
 * with case-specific support — and pruned when thin.
 */

export const PLAN_OPTIONAL: Record<ResponseLang, string[]> = {
	en: ['## Deadlines', '## Urgent'],
	sw: ['## Tarehe', '## Dharura']
};

export const PLAN_REQUIRED: Record<ResponseLang, string[]> = {
	en: [
		'## Facts',
		'## Issues',
		'## Law',
		'## Analysis',
		'## Risks',
		'## Next Steps',
		'## Authorities',
		'## Note'
	],
	sw: [
		'## Ukweli',
		'## Masuala',
		'## Sheria',
		'## Uchambuzi',
		'## Hatari',
		'## Hatua',
		'## Mamlaka',
		'## Ujumbe'
	]
};

export const PLAN_HEADINGS: Record<ResponseLang, string[]> = {
	en: [
		'## Facts',
		'## Issues',
		'## Law',
		'## Analysis',
		'## Risks',
		'## Next Steps',
		'## Deadlines',
		'## Authorities',
		'## Urgent',
		'## Note'
	],
	sw: [
		'## Ukweli',
		'## Masuala',
		'## Sheria',
		'## Uchambuzi',
		'## Hatari',
		'## Hatua',
		'## Tarehe',
		'## Mamlaka',
		'## Dharura',
		'## Ujumbe'
	]
};

/**
 * Sources must render via the `SourceLinks` Trace collapsible, never as
 * hand-rolled markdown. Models (and the legacy fallback) sometimes append a
 * `## Sources` section anyway, which duplicates `SourceLinks` and renders
 * poorly (`[1] Title — citation` lines are not real markdown lists).
 * Strip that section so only the collapsible shows sources.
 */
export function stripSourcesSection(text: string): string {
	const idx = text.search(/^#{1,4}\s*(sources?|references?|vyanzo|marejeo|chanzo)(\s|:|$)/gim);
	if (idx === -1) return text;
	return text.slice(0, idx).replace(/\s+$/, '');
}
