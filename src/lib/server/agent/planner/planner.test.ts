import { describe, expect, it } from 'vitest';
import { fallbackPlanFor, planAdherence, validatePlan } from './planner.ts';
import { executePlan } from './executor.ts';
import { newBlackboard } from './tools.ts';
import type { ExecutionPlan } from './types.ts';

describe('dynamic planner fallbacks', () => {
	it('check plan is doc-first with clause tools', () => {
		const plan = fallbackPlanFor('plan', 'check');
		expect(plan.dynamic).toBe(false);
		expect(plan.steps.map((s) => s.tool)).toContain('searchUserDocs');
		expect(plan.steps.map((s) => s.tool)).toContain('splitClauses');
		expect(planAdherence(plan, 'check')).toBe(true);
	});

	it('draft plan includes the admission guard', () => {
		const plan = fallbackPlanFor('plan', 'draft');
		expect(plan.steps.map((s) => s.tool)).toContain('admissionGuard');
		expect(planAdherence(plan, 'draft')).toBe(true);
	});

	it('interview fallback stays within the allowlist', () => {
		for (const agent of ['ask', 'check', 'draft'] as const) {
			const plan = fallbackPlanFor('interview', agent);
			expect(planAdherence(plan, agent)).toBe(true);
		}
	});
});

describe('plan validation', () => {
	function base(): ExecutionPlan {
		return fallbackPlanFor('interview', 'ask');
	}

	it('rejects tools outside the agent allowlist', () => {
		const plan = base();
		const hacked = {
			...plan,
			steps: [
				...plan.steps,
				{ id: 'x', tool: 'splitClauses', label: 'Split', retry: 0, onFail: 'skip' }
			]
		};
		expect(validatePlan(hacked, 'interview', 'ask')).toBeNull();
	});

	it('rejects duplicate step ids and truncates oversized plans', () => {
		const plan = base();
		const dup = { ...plan.steps[0]! };
		expect(validatePlan({ ...plan, steps: [plan.steps[0], dup] }, 'interview', 'ask')).toBeNull();
		const big = Array.from({ length: 8 }, (_, i) => ({
			id: `s${i}`,
			tool: 'searchLegal',
			label: `Search ${i}`,
			retry: 0,
			onFail: 'skip'
		}));
		const truncated = validatePlan({ title: 't', reason: 'r', steps: big }, 'interview', 'ask');
		expect(truncated?.steps.length).toBe(6);
		const bigBad = big.map((s, i) => (i === 5 ? { ...s, tool: 'splitClauses' } : s));
		expect(validatePlan({ title: 't', reason: 'r', steps: bigBad }, 'interview', 'ask')).toBeNull();
	});

	it('accepts a well-formed LLM plan', () => {
		const raw = {
			title: 'Plan: check document before signing',
			reason: 'doc-first',
			steps: [
				{
					id: 'docs',
					tool: 'searchUserDocs',
					label: 'Read attached documents',
					onFail: 'skip',
					parallelGroup: 1
				},
				{
					id: 'law',
					tool: 'searchLegal',
					label: 'Search Kenyan law',
					onFail: 'skip',
					parallelGroup: 1
				},
				{
					id: 'write',
					tool: 'generatePlan',
					label: 'Write document check plan',
					onFail: 'fallback'
				}
			]
		};
		const valid = validatePlan(raw, 'plan', 'check');
		expect(valid?.dynamic).toBe(true);
		expect(valid?.steps.length).toBe(3);
	});

	it('rejects writer tools in interview plans (no duplicate writer trace)', () => {
		const raw = {
			title: 'Plan: drafting interview',
			reason: 'retrieval + draft',
			steps: [
				{
					id: 'retrieve-law',
					tool: 'searchLegal',
					label: 'Search Kenyan law',
					onFail: 'skip',
					parallelGroup: 1
				},
				{
					id: 'write',
					tool: 'generatePlan',
					label: 'Generate response plan',
					onFail: 'fallback'
				}
			]
		};
		expect(validatePlan(raw, 'interview', 'draft')).toBeNull();
		expect(validatePlan(raw, 'plan', 'draft')).not.toBeNull();
	});
});

describe('plan executor (offline)', () => {
	it('runs pure steps in order and marks them done', async () => {
		const plan: ExecutionPlan = {
			goal: 'plan',
			agentId: 'check',
			title: 'Plan: test',
			reason: 'test',
			dynamic: false,
			steps: [
				{
					id: 'search',
					tool: 'searchUserDocs',
					label: 'Search docs',
					budgetMs: 5000,
					retry: 0,
					onFail: 'skip'
				},
				{
					id: 'docs',
					tool: 'requestDocs',
					label: 'Request docs',
					budgetMs: 5000,
					retry: 0,
					onFail: 'skip'
				}
			]
		};
		const bb = newBlackboard({
			issue: 'Review my tenancy agreement',
			langPref: 'en',
			agentId: 'check'
		});
		const { stepStatus, subagents } = await executePlan(plan, bb, {});
		expect(stepStatus['search']).toBe('done');
		expect(stepStatus['docs']).toBe('done');
		expect(bb.lang).toBe('en');
		expect(bb.needsDocs).toBe(true);
		expect(subagents.length).toBeGreaterThan(0);
	});

	it('runs parallel groups together and skips failures', async () => {
		const plan: ExecutionPlan = {
			goal: 'interview',
			agentId: 'ask',
			title: 'Plan: test',
			reason: 'test',
			dynamic: false,
			steps: [
				{
					id: 'a',
					tool: 'requestDocs',
					label: 'Request docs A',
					budgetMs: 5000,
					retry: 0,
					onFail: 'skip',
					parallelGroup: 1
				},
				{
					id: 'b',
					tool: 'requestDocs',
					label: 'Request docs B',
					budgetMs: 5000,
					retry: 0,
					onFail: 'skip',
					parallelGroup: 1
				},
				{
					id: 'nope',
					tool: 'bogus' as never,
					label: 'Bogus',
					budgetMs: 1000,
					retry: 0,
					onFail: 'skip'
				}
			]
		};
		const bb = newBlackboard({ issue: 'dismissed without notice', langPref: 'en', agentId: 'ask' });
		const { stepStatus } = await executePlan(plan, bb, {});
		expect(stepStatus['a']).toBe('done');
		expect(stepStatus['b']).toBe('done');
		expect(stepStatus['nope']).toBe('skipped');
	});

	it('abort fails the plan instead of falling back', async () => {
		const plan: ExecutionPlan = {
			goal: 'interview',
			agentId: 'ask',
			title: 'Plan: test',
			reason: 'test',
			dynamic: false,
			steps: [
				{
					id: 'x',
					tool: 'bogus' as never,
					label: 'Bogus',
					budgetMs: 1000,
					retry: 0,
					onFail: 'abort'
				}
			]
		};
		const bb = newBlackboard({ issue: 'x', langPref: 'en', agentId: 'ask' });
		await expect(executePlan(plan, bb, {})).rejects.toThrow();
	});
});
