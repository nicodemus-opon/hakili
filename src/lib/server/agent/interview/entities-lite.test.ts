import { describe, expect, it } from 'vitest';
import {
	extractLiteEntities,
	hasLiteDateOrMoney,
	hasLitePersonOrOrg,
	learnDomainEntities,
	parseSwahiliDates,
	recognizeDomainEntities
} from './entities-lite.ts';

describe('entities-lite (offline, no model downloads)', () => {
	it('extracts English person, place, money, and date signals', () => {
		const e = extractLiteEntities('I lent John Kamau KES 50000 on 12 May 2024 in Kisumu.', 'en');
		expect(e.persons.join(' ')).toMatch(/John Kamau/);
		expect(e.places.join(' ')).toMatch(/Kisumu/);
		expect(e.money.join(' ')).toMatch(/KES 50000/);
		expect(e.dates.length).toBeGreaterThan(0);
	});

	it('gates English lexicon NER off for Kiswahili but keeps Swahili dates', () => {
		expect(parseSwahiliDates('Tarehe 12 Mei 2024 Juma alinifukuza kazi')).toContain('12 Mei 2024');
		const e = extractLiteEntities('Tarehe 12 Mei 2024 Juma alinifukuza kazi', 'sw');
		expect(e.persons).toEqual([]);
		expect(e.dates.join(' ')).toMatch(/12 Mei 2024/);
	});

	it('matches relative Kiswahili day words', () => {
		expect(parseSwahiliDates('jana alinikuja')).toContain('jana');
		expect(parseSwahiliDates('kesho nitakwenda')).toContain('kesho');
	});

	it('recognizes Kenyan domain entities without any model', () => {
		const found = recognizeDomainEntities('Report to the land registrar with your title deed');
		const types = new Map(found.map((d) => [d.value.toLowerCase(), d.type]));
		expect(types.get('land registrar')).toBe('office');
		expect(types.get('title deed')).toBe('document');
	});

	it('learns runtime domain terms and stays fail-open', () => {
		learnDomainEntities([{ text: 'children office', entityType: 'office' }]);
		expect(recognizeDomainEntities('Go to the children office').length).toBeGreaterThan(0);
		expect(extractLiteEntities('', 'en')).toEqual({
			persons: [],
			orgs: [],
			places: [],
			dates: [],
			money: [],
			domain: []
		});
	});

	it('advisory helpers agree with extraction', () => {
		expect(hasLitePersonOrOrg('My neighbor John broke the fence', 'en')).toBe(true);
		expect(hasLitePersonOrOrg('nimefukuzwa kazi', 'sw')).toBe(false);
		expect(hasLiteDateOrMoney('pay by Friday', 'en')).toBe(true);
		expect(hasLiteDateOrMoney('hakuna kitu', 'sw')).toBe(false);
	});

	it('never files month names as persons, orgs, or places', () => {
		const e = extractLiteEntities('I was dismissed in May without notice', 'en');
		expect(e.persons).not.toContain('May');
		expect(e.orgs).not.toContain('May');
		expect(e.places).not.toContain('May');
		expect(e.dates.length).toBeGreaterThan(0);
	});
});
