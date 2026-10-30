import { describe, expect, it } from 'vitest';
import {
	countMissingHeadings,
	countPlaceholderSections,
	ftsOrQuery,
	isThinPlan,
	outputMatchesLang,
	plainOrQuery
} from './qvac.ts';

describe('ftsOrQuery', () => {
	it('returns null for plain English queries', () => {
		expect(ftsOrQuery('employer dismissed me without notice')).toBeNull();
		expect(ftsOrQuery('road accident police abstract')).toBeNull();
	});

	it('expands Swahili legal terms with prefix matching', () => {
		const q = ftsOrQuery('baba amefariki bila wosia kugawa shamba');
		expect(q).toContain('will:*');
		expect(q).toContain('land:*');
		expect(q?.split(' | ').length).toBeGreaterThan(3);
	});

	it('handles inflected verb forms via root match', () => {
		// amenifungia (locked me out), tapeliwa (conned), kugawa (to distribute)
		expect(ftsOrQuery('mwenye nyumba amenifungia nje')).toContain('lockout:*');
		expect(ftsOrQuery('nimetapeliwa mpesa')).toContain('fraud:*');
		expect(ftsOrQuery('kugawa shamba')).toContain('distribute:*');
	});

	it('covers the stolen-beat regression terms', () => {
		const q = ftsOrQuery('ameiba beat yangu');
		// beat/youtube already match the English corpus; wimbo maps songs.
		expect(ftsOrQuery('wimbo wangu umeibwa') ?? '').toContain('song:*');
		expect(q === null || q.includes('beat')).toBe(true);
	});

	it('expands bare theft verb forms even without wimbo', () => {
		// "Beat yangu imeibiwa" has no wimbo token; iba-forms must still map.
		expect(ftsOrQuery('beat yangu imeibiwa') ?? '').toMatch(/theft:\*|steal:\*/);
		expect(ftsOrQuery('nimeibiwa pesa') ?? '').toMatch(/theft:\*|steal:\*/);
	});

	it('never emits empty or malformed tsquery terms', () => {
		for (const q of ['wosia', 'mteja hataki kulipa mkataba', 'ajali barabarani bima']) {
			const or = ftsOrQuery(q);
			expect(or).not.toBeNull();
			for (const term of (or as string).split(' | ')) {
				expect(term).toMatch(/^[a-z]+:\*$/);
			}
		}
	});
});

describe('plainOrQuery', () => {
	it('builds prefix OR queries from English content words', () => {
		expect(plainOrQuery('employer dismissed me without notice')).toContain('dismiss:*');
		expect(plainOrQuery('My neighbor encroached my plot boundary')).toContain('neighbor:*');
		// queries with no content words yield null so the FTS leg is skipped
		expect(plainOrQuery('me and my')).toBeNull();
		expect(plainOrQuery('')).toBeNull();
	});

	it('emits valid tsquery OR terms', () => {
		const q = plainOrQuery('landlord increased rent repairs') as string;
		for (const term of q.split(' | ')) {
			expect(term).toMatch(/^[a-z]+:\*$/);
		}
	});
});

describe('outputMatchesLang', () => {
	it('never rejects short questions (franc is noisy on short text)', () => {
		expect(outputMatchesLang('When did this start?', 'sw')).toBe(true);
		expect(outputMatchesLang('Ulianza lini?', 'en')).toBe(true);
	});

	it('rejects confident opposite-language plans', () => {
		const english =
			'You should keep all receipts and contact the National Legal Aid Service on 0800 720 640 for advice on your employment dispute and next steps forward promptly.';
		expect(outputMatchesLang(english, 'sw')).toBe(false);
	});
});

describe('isThinPlan (Swahili plan regression)', () => {
	const thinSw = `## Ukweli
Mteja anaeleza kuwa mwajiri hakulipa mshahara tangu 2026-10-14 na anaagiza hatua za kisheria kuchukuliwa.

## Sheria
Hayajulikani.

## Uchambuzi
Hayajulikani.

## Hatari
Hayajulikani.

## Hatua
Hayajulikani.

## Tarehe
Hayajulikani.

## Mamlaka
Hayajulikani.

## Dharura
Hayajulikani.

## Ujumbe
Hayajulikani.`;

	it('flags the reported unpaid-salary Swahili failure as thin', () => {
		expect(countPlaceholderSections(thinSw, 'sw')).toBeGreaterThanOrEqual(3);
		expect(isThinPlan(thinSw, 'sw')).toBe(true);
	});

	it('flags outputs missing most headings as thin', () => {
		expect(
			isThinPlan(
				'## Ukweli\nMteja anaeleza kutolipiwa mshahara kwa wakati uliokubaliwa na anaagiza hatua zichukuliwe.',
				'sw'
			)
		).toBe(true);
		expect(countMissingHeadings('## Ukweli\nmaandishi', 'sw')).toBe(7); // required-only: limitation + risks may be absent
	});

	it('accepts a full plan with real content in every section', () => {
		const full = [
			'## Ukweli',
			'Mteja anaeleza kuwa mwajiri hakulipa mshahara wa Oktoba na anaagiza shauri lichukuliwe [1].',
			'## Masuala',
			'Suala ni kama kutolipa kunavunja mkataba wa ajira na ni dawa gani inayopatikana [1].',
			'## Sheria',
			'Sheria ya Ajira inalinda malipo ya wakati kwa kazi iliyofanywa na inaweka taratibu za malalamiko [1].',
			'## Uchambuzi',
			'Kwa mujibu wa maelekezo, kutolipa kunasaidia dai la uvunjaji huku pingamizi likihusu utetezi wa mwajiri [1].',
			'## Hatari',
			'Hatari ni kupoteza muda wa ukomo huku utetezi ukihusu malipo sehemu au makosa ya kihesabu [1].',
			'## Hatua',
			'Andaa jalada la mkataba, risiti za malipo, na malalamiko kwa utaratibu wa kufungua na kuwasilisha [1].',
			'## Tarehe',
			'Thibitisha tarehe ya mwisho ya kuwasilisha kwa mujibu wa mamlaka husika kabla ya muda kuisha [1].',
			'## Mamlaka',
			'Thibitisha kwamba mamlaka bado ni za sasa, viwango vya ada, na kesi zinazohusiana kabla ya kufungua [1].',
			'## Dharura',
			'Ucheleweshaji unaweza kudhoofisha dai na ushahidi wa malipo unapaswa kuhifadhiwa [1].',
			'## Ujumbe',
			'Thibitisha kwamba mamlaka bado ni za sasa kabla ya kufungua, kuwasilisha, au kushauri mteja.'
		].join('\n');
		expect(countPlaceholderSections(full, 'sw')).toBe(0);
		expect(countMissingHeadings(full, 'sw')).toBe(0);
		expect(isThinPlan(full, 'sw')).toBe(false);
	});
});
