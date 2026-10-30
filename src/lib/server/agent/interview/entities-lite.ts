/**
 * Phase 1 offline entity extraction — no model downloads, fully sync.
 *
 * Combines three tiny local extractors behind one cached, fail-open call:
 * - compromise (+dates/+numbers plugins) for English PERSON/ORG/PLACE/DATE/MONEY
 * - chrono for English date mentions (relative dates like "tomorrow" included)
 * - wink-ner gazetteer for language-agnostic Kenyan domain entities
 *   (offices, reference numbers, title documents) seeded from training data
 *
 * Plus a small Kiswahili date table: chrono has no Swahili locale, so
 * `12 Mei 2024` / `jana` / `kesho` are matched structurally here instead of
 * growing another regex list at each call site.
 *
 * Everything degrades to empty on any failure — callers must keep their
 * existing heuristic as the fallback, never rely on these results alone.
 */
import nlp from 'compromise';
import datesPlugin, { type DatesMethods } from 'compromise-dates';
import numbersPlugin from 'compromise-numbers';
import * as chrono from 'chrono-node';
import winkNerFactory from 'wink-ner';
import winkTokenizerFactory from 'wink-tokenizer';
import { boundedSet } from '../context.ts';
import type { ResponseLang } from '../types.ts';

nlp.plugin(datesPlugin);
nlp.plugin(numbersPlugin);

export interface DomainEntity {
	value: string;
	type: string;
}

export interface LiteEntities {
	persons: string[];
	orgs: string[];
	places: string[];
	/** Date-like spans (compromise + chrono + Kiswahili table). */
	dates: string[];
	/** Money-like spans (compromise values + KES-style currency codes). */
	money: string[];
	domain: DomainEntity[];
}

/** Kenyan legal-preparation domain entities: offices, refs, title documents. */
const DOMAIN_SEED: Array<{ text: string; entityType: string }> = [
	{ text: 'land registrar', entityType: 'office' },
	{ text: 'lands office', entityType: 'office' },
	{ text: 'labour office', entityType: 'office' },
	{ text: 'chief', entityType: 'office' },
	{ text: 'assistant chief', entityType: 'office' },
	{ text: 'police station', entityType: 'office' },
	{ text: 'huduma centre', entityType: 'office' },
	{ text: 'court', entityType: 'office' },
	{ text: 'tribunal', entityType: 'office' },
	{ text: 'title deed', entityType: 'document' },
	{ text: 'sale agreement', entityType: 'document' },
	{ text: 'employment contract', entityType: 'document' },
	{ text: 'payslip', entityType: 'document' },
	{ text: 'pay slip', entityType: 'document' },
	{ text: 'dismissal letter', entityType: 'document' },
	{ text: 'termination notice', entityType: 'document' },
	{ text: 'demand letter', entityType: 'document' },
	{ text: 'ob number', entityType: 'reference' },
	{ text: 'national id', entityType: 'reference' },
	{ text: 'kra pin', entityType: 'reference' }
];

let nerInstance: ReturnType<typeof winkNerFactory> | null = null;
let tokenizerInstance: ReturnType<typeof winkTokenizerFactory> | null = null;

function wink(): {
	ner: ReturnType<typeof winkNerFactory>;
	tokenize: ReturnType<typeof winkTokenizerFactory>;
} | null {
	try {
		if (!nerInstance) {
			nerInstance = winkNerFactory();
			nerInstance.learn(DOMAIN_SEED);
		}
		if (!tokenizerInstance) tokenizerInstance = winkTokenizerFactory();
		return { ner: nerInstance, tokenize: tokenizerInstance };
	} catch {
		return null;
	}
}

/** Extra domain terms learned at runtime (e.g. from the legal corpus titles). */
export function learnDomainEntities(items: Array<{ text: string; entityType: string }>): void {
	try {
		const w = wink();
		w?.ner.learn(items.filter((i) => i.text.trim().length >= 3).slice(0, 500));
	} catch {
		/* fail open: seed set still applies */
	}
}

export function recognizeDomainEntities(text: string): DomainEntity[] {
	try {
		const w = wink();
		if (!w || !text.trim()) return [];
		const out = w.ner.recognize(w.tokenize.tokenize(text.slice(0, 2000)));
		const seen = new Set<string>();
		const entities: DomainEntity[] = [];
		for (const t of out) {
			if (!t.entityType) continue;
			const key = `${t.entityType}:${(t.value ?? '').toLowerCase()}`;
			if (seen.has(key)) continue;
			seen.add(key);
			entities.push({ value: String(t.originalSeq?.join(' ') ?? t.value), type: t.entityType });
		}
		return entities.slice(0, 12);
	} catch {
		return [];
	}
}

/** KES 50,000 / Ksh 50000 / USD 100 — compromise money misses Kenyan codes. */
const CURRENCY_RE = /\b(KES|Ksh|KSh|USD|GBP|EUR|TZS|UGX|RWF)\s?[\d][\d,]*(?:\.\d+)?\b/gi;

/** Kiswahili month names; chrono ships no Swahili locale. */
const SW_MONTHS = [
	'januari',
	'februari',
	'machi',
	'aprili',
	'mei',
	'juni',
	'julai',
	'agosti',
	'septemba',
	'septembar',
	'oktoba',
	'novemba',
	'desemba'
];

const SW_DATE_RES = [
	// 12 Mei 2024 / 12-mei-2024 / Mei 12, 2024
	new RegExp(
		`\\b\\d{1,2}(?:st|nd|rd|th)?[\\s\\-.]+(?:${SW_MONTHS.join('|')})[\\s,\\-.]+\\d{4}\\b`,
		'gi'
	),
	new RegExp(
		`\\b(?:${SW_MONTHS.join('|')})[\\s,\\-.]+\\d{1,2}(?:st|nd|rd|th)?[\\s,\\-.]+\\d{4}\\b`,
		'gi'
	),
	// jana / kesho / leo / wiki ijayo as standalone date words
	/\b(jana|juzi|leo|kesho|wiki\s+ijayo|mwezi\s+ujao)\b/gi
];

/** Structural Kiswahili date mentions chrono cannot parse. */
export function parseSwahiliDates(text: string): string[] {
	const found: string[] = [];
	try {
		for (const re of SW_DATE_RES) {
			re.lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(text.slice(0, 2000))) !== null) {
				const span = m[0].trim();
				if (span && !found.some((f) => f.toLowerCase() === span.toLowerCase())) found.push(span);
				if (found.length >= 8) return found;
			}
		}
	} catch {
		/* fail open */
	}
	return found;
}

const EMPTY: LiteEntities = { persons: [], orgs: [], places: [], dates: [], money: [], domain: [] };

/**
 * Month/weekday names are dates, never parties: compromise often tags
 * "May"/"April"/"Friday" as a person or place. Strip exact matches from
 * the name slots (the `dates` slot already captures them via
 * compromise-dates + chrono).
 */
const DATE_WORD_ENTITIES = new Set([
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday'
]);

function stripDateWords(values: string[]): string[] {
	return values.filter((v) => !DATE_WORD_ENTITIES.has(v.trim().toLowerCase()));
}

const liteCache = new Map<string, LiteEntities>();

function uniq(values: string[], max = 12): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const v of values) {
		const t = v.replace(/[.,;:!?]+$/g, '').trim();
		if (t.length < 2) continue;
		const k = t.toLowerCase();
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(t);
		if (out.length >= max) break;
	}
	return out;
}

/**
 * Extract lightweight entities. `lang` gates the English-only compromise NER:
 * for Kiswahili/Sheng only the language-agnostic signals (gazetteer,
 * Kiswahili dates, currency codes, digits) apply, so English lexicon nouns
 * never pollute Swahili grounding.
 */
export function extractLiteEntities(text: string, lang: ResponseLang = 'en'): LiteEntities {
	const key = `${lang}:${text.slice(0, 500)}`;
	const hit = liteCache.get(key);
	if (hit) return hit;
	let out: LiteEntities = EMPTY;
	try {
		const slice = text.slice(0, 2000);
		if (!slice.trim()) {
			boundedSet(liteCache, key, out, 200);
			return out;
		}
		const domain = recognizeDomainEntities(slice);
		if (lang === 'sw') {
			const dates = parseSwahiliDates(slice);
			CURRENCY_RE.lastIndex = 0;
			const money = uniq(
				[...slice.matchAll(CURRENCY_RE)].map((m) => m[0]),
				8
			);
			out = { persons: [], orgs: [], places: [], dates, money, domain };
		} else {
			// `dates()` comes from the compromise-dates plugin: present at
			// runtime via nlp.plugin() above, typed via the cast below.
			const doc = nlp(slice) as ReturnType<typeof nlp> & DatesMethods;
			const chronoDates = (() => {
				try {
					return chrono.parse(slice).map((r) => r.text);
				} catch {
					return [];
				}
			})();
			CURRENCY_RE.lastIndex = 0;
			const currency = [...slice.matchAll(CURRENCY_RE)].map((m) => m[0]);
			out = {
				persons: uniq(stripDateWords(doc.people().out('array'))),
				orgs: uniq(stripDateWords(doc.organizations().out('array'))),
				places: uniq(stripDateWords(doc.places().out('array'))),
				dates: uniq([...doc.dates().out('array'), ...chronoDates, ...parseSwahiliDates(slice)]),
				money: uniq([...doc.money().out('array'), ...currency]),
				domain
			};
		}
	} catch {
		out = EMPTY;
	}
	boundedSet(liteCache, key, out, 200);
	return out;
}

/** Advisory: does the text name a person/org per lightweight extraction? */
export function hasLitePersonOrOrg(text: string, lang: ResponseLang = 'en'): boolean {
	try {
		const e = extractLiteEntities(text, lang);
		return (
			e.persons.length > 0 ||
			e.orgs.length > 0 ||
			e.domain.some((d) => d.type === 'office' || d.type === 'reference')
		);
	} catch {
		return false;
	}
}

/** Advisory: does the text carry a date/money mention per light extraction? */
export function hasLiteDateOrMoney(text: string, lang: ResponseLang = 'en'): boolean {
	try {
		const e = extractLiteEntities(text, lang);
		return e.dates.length > 0 || e.money.length > 0 || /\d/.test(text);
	} catch {
		return /\d/.test(text);
	}
}

/**
 * Advisory: does English text describe something that already happened?
 * A past-tense verb ("dismissed", "built", "died") marks a lived event —
 * never a hypothetical advice question ("can ... dismiss", "wants to
 * evict" stay present/infinitive). Grammar tags only, no vocabulary.
 * English-only: the compromise lexicon must never read Kiswahili.
 */
export function hasPastTenseVerb(text: string): boolean {
	try {
		const slice = text.slice(0, 2000);
		if (!slice.trim()) return false;
		const doc = nlp(slice);
		return doc
			.verbs()
			.json()
			.some((v: { terms?: Array<{ tags?: unknown }> }) =>
				(v.terms ?? []).some((t) => ((t.tags ?? []) as string[]).includes('PastTense'))
			);
	} catch {
		return false;
	}
}
