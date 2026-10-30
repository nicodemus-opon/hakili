import { describe, expect, it } from 'vitest';
import { clearNerCaches, nerEnabled, questionEntitiesKnown, type NerResult } from './ner.ts';

interface StubEnt {
	text: string;
	label: string;
}

const stub =
	(map: Record<string, StubEnt[]>) =>
	async (text: string): Promise<NerResult | null> => {
		const key = Object.keys(map).find((k) => text.includes(k)) ?? null;
		if (!key) return { entities: [], model: 'stub' };
		return {
			entities: (map[key] ?? []).map((e) => ({ ...e, score: 0.99 })),
			model: 'stub'
		};
	};

describe('ner transformer wrapper (offline-safe, injected extractor)', () => {
	it('kill-switch is honored without touching any model', async () => {
		expect(nerEnabled()).toBe(true);
		clearNerCaches();
		// No stub can save a disabled run: INTERVIEW_NER is read live below.
		const prev = process.env.INTERVIEW_NER;
		process.env.INTERVIEW_NER = '0';
		try {
			const { extractEntities } = await import('./ner.ts');
			expect(await extractEntities('Safaricom dismissed me')).toBeNull();
		} finally {
			if (prev === undefined) delete process.env.INTERVIEW_NER;
			else process.env.INTERVIEW_NER = prev;
		}
	});

	it('bypasses only when every question entity is already known', async () => {
		const extract = stub({
			'QQQ Safaricom': [{ text: 'Safaricom', label: 'ORG' }],
			'KKK Safaricom': [{ text: 'Safaricom', label: 'ORG' }]
		});
		expect(
			await questionEntitiesKnown('QQQ Safaricom?', ['KKK Safaricom story'], 'en', extract)
		).toBe(true);
		expect(await questionEntitiesKnown('QQQ Safaricom?', ['unrelated story'], 'en', extract)).toBe(
			false
		);
	});

	it('never bypasses when the question carries no entities', async () => {
		const extract = stub({ 'KKK Kisumu': [{ text: 'Kisumu', label: 'LOC' }] });
		expect(await questionEntitiesKnown('When did it happen?', ['KKK Kisumu'], 'en', extract)).toBe(
			false
		);
	});

	it('never bypasses when NER is unavailable (null results)', async () => {
		const extract = async (): Promise<NerResult | null> => null;
		expect(
			await questionEntitiesKnown('Who is Safaricom?', ['Safaricom story'], 'en', extract)
		).toBe(false);
	});
});
