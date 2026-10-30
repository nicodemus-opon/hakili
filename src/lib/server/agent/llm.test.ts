import { describe, expect, it } from 'vitest';
import { keepMode, pickTier, resolveModelStrategy } from './llm.ts';

describe('dual-model routing', () => {
	it('routes light tasks to small and heavy tasks to large', () => {
		for (const task of [
			'classify',
			'title',
			'conversational',
			'expansion',
			'advice',
			'extract',
			'judge',
			'theory',
			'translate-questions'
		] as const) {
			expect(pickTier(task, 'auto')).toBe('small');
		}
		for (const task of [
			'draft-questions',
			'planner',
			'tools',
			'plan',
			'repair',
			'followup',
			'translate',
			'default'
		] as const) {
			expect(pickTier(task, 'auto')).toBe('large');
		}
	});

	it('honours explicit tier hints', () => {
		expect(pickTier('small', 'auto')).toBe('small');
		expect(pickTier('large', 'auto')).toBe('large');
	});

	it('strategy overrides task routing', () => {
		expect(pickTier('plan', 'small-only')).toBe('small');
		expect(pickTier('classify', 'large-only')).toBe('large');
		expect(pickTier(undefined, 'small-only')).toBe('small');
		expect(pickTier(undefined, 'large-only')).toBe('large');
	});

	it('resolves strategy from env with legacy compat', () => {
		expect(resolveModelStrategy({ QVAC_MODEL_STRATEGY: 'auto' } as NodeJS.ProcessEnv)).toBe('auto');
		expect(resolveModelStrategy({ QVAC_MODEL_STRATEGY: 'small-only' } as NodeJS.ProcessEnv)).toBe(
			'small-only'
		);
		expect(resolveModelStrategy({ QVAC_MODEL_STRATEGY: 'large-only' } as NodeJS.ProcessEnv)).toBe(
			'large-only'
		);
		expect(resolveModelStrategy({ QVAC_LLM_MODEL: '1.7B' } as NodeJS.ProcessEnv)).toBe(
			'small-only'
		);
		expect(resolveModelStrategy({} as NodeJS.ProcessEnv)).toBe('auto');
	});

	it('defaults keep mode to both, swap on opt-in', () => {
		expect(keepMode({} as NodeJS.ProcessEnv)).toBe('both');
		expect(keepMode({ QVAC_MODEL_KEEP: 'swap' } as NodeJS.ProcessEnv)).toBe('swap');
	});
});
