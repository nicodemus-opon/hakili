import { describe, expect, it } from 'vitest';
import { agentConfig } from '../agents.ts';
import {
	MAX_NATIVE_STEPS,
	estimateToolDefsSize,
	isNativeToolEnabled,
	nativeToolsFor,
	validateNativeArgs
} from './native-tools.ts';

describe('native tool allowlists', () => {
	it('keeps ask narrow (retrieval + interview only)', () => {
		const names = nativeToolsFor('ask').map((t) => t.name);
		expect(names).toContain('searchLegal');
		expect(names).toContain('searchUserDocs');
		expect(names).toContain('draftQuestions');
		expect(names).not.toContain('splitClauses');
		expect(names).not.toContain('requestDocs');
		expect(names.length).toBeLessThanOrEqual(5);
	});

	it('gives check the doc-first tools', () => {
		const names = nativeToolsFor('check').map((t) => t.name);
		expect(names).toContain('splitClauses');
		expect(names).toContain('requestDocs');
		expect(names).toContain('draftQuestions');
		expect(names.length).toBeLessThanOrEqual(5);
	});

	it('never exposes tools outside the agent allowlist', () => {
		for (const agent of ['ask', 'check', 'draft'] as const) {
			const allowed = new Set(agentConfig(agent).allowedTools);
			for (const t of nativeToolsFor(agent)) expect(allowed.has(t.name)).toBe(true);
		}
		expect(nativeToolsFor('draft').length).toBeGreaterThan(0);
	});
});

describe('native arg validation', () => {
	it('accepts a real query and truncates oversize input', () => {
		expect(validateNativeArgs('searchLegal', { query: 'unfair dismissal notice' })).toEqual({
			query: 'unfair dismissal notice'
		});
		const long = validateNativeArgs('searchLegal', { query: 'x'.repeat(5000) });
		expect(typeof long?.query === 'string' && long.query.length).toBeLessThanOrEqual(1000);
	});

	it('rejects empty, missing, and unknown tools', () => {
		expect(validateNativeArgs('searchLegal', { query: '   ' })).toBeNull();
		expect(validateNativeArgs('searchLegal', {})).toBeNull();
		expect(validateNativeArgs('searchLegal', { query: 42 })).toBeNull();
		expect(validateNativeArgs('inventTool', { query: 'x' })).toBeNull();
	});

	it('accepts no-arg deterministic tools', () => {
		expect(validateNativeArgs('splitClauses', {})).toEqual({});
		expect(validateNativeArgs('requestDocs', { extra: 'ignored' })).toEqual({});
	});

	it('validates draftQuestions leniently (never rejects)', () => {
		expect(validateNativeArgs('draftQuestions', {})).toEqual({});
		expect(validateNativeArgs('draftQuestions', { extra: 'ignored' })).toEqual({});
		expect(
			validateNativeArgs('draftQuestions', { focus: ['party', 'bogus'], maxQuestions: 2 })
		).toEqual({ focus: ['party'], maxQuestions: 2 });
		expect(validateNativeArgs('draftQuestions', { focus: ['bogus'] })).toEqual({});
		expect(validateNativeArgs('draftQuestions', { maxQuestions: 99 })).toEqual({
			maxQuestions: 4
		});
		expect(validateNativeArgs('draftQuestions', { maxQuestions: 0 })).toEqual({
			maxQuestions: 1
		});
	});

	it('narrows contextually for small-model reliability', () => {
		// No docs: splitClauses hidden (needs files), searchUserDocs stays.
		const noDocs = nativeToolsFor('check', { documentIds: [], goal: 'interview' }).map(
			(t) => t.name
		);
		expect(noDocs).not.toContain('splitClauses');
		expect(noDocs).toContain('searchUserDocs');
		expect(noDocs).toContain('requestDocs');
		expect(noDocs).toContain('draftQuestions');
		// With docs: requestDocs hidden (files exist).
		const withDocs = nativeToolsFor('check', { documentIds: ['d1'], goal: 'interview' }).map(
			(t) => t.name
		);
		expect(withDocs).toContain('splitClauses');
		expect(withDocs).not.toContain('requestDocs');
		// Non-interview goals: draftQuestions hidden.
		const plan = nativeToolsFor('ask', { documentIds: [], goal: 'plan' }).map((t) => t.name);
		expect(plan).not.toContain('draftQuestions');
		expect(plan).toContain('searchLegal');
	});
});

describe('native tool budgets', () => {
	it('stays small enough for the 4096 ctx window', () => {
		const size = estimateToolDefsSize(nativeToolsFor('check'));
		expect(size).toBeGreaterThan(0);
		expect(size).toBeLessThan(2000);
	});

	it('is enabled by default and honors the kill switch', () => {
		const prev = process.env.QVAC_NATIVE_TOOLS;
		expect(isNativeToolEnabled()).toBe(true);
		process.env.QVAC_NATIVE_TOOLS = '0';
		expect(isNativeToolEnabled()).toBe(false);
		if (prev === undefined) delete process.env.QVAC_NATIVE_TOOLS;
		else process.env.QVAC_NATIVE_TOOLS = prev;
	});

	it('caps the reactive loop', () => {
		expect(MAX_NATIVE_STEPS).toBeLessThanOrEqual(6);
	});
});
