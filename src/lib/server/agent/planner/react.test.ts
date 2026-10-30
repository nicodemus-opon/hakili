import { describe, expect, it } from 'vitest';
import { fallbackPlanFor } from './planner.ts';
import { newBlackboard, type Blackboard } from './tools.ts';
import { runReactiveRetrieval, runReactiveWithTail, type ReactDeps } from './react.ts';
import { MAX_NATIVE_STEPS } from './native-tools.ts';
import type { ExecutionPlan } from './types.ts';

function bb(): Blackboard {
	return newBlackboard({ issue: 'dismissed without notice', langPref: 'en', agentId: 'ask' });
}

function fakeRunTool(stepId: string, tool: string, board: Blackboard): Promise<void> {
	if (tool === 'searchLegal') {
		board.passages = [
			{
				id: 'p1',
				title: 'Employment Act',
				citation: 'Employment Act, 2007',
				url: 'https://example.test',
				content: 'Notice rules.',
				topic: 'employment',
				score: 1
			}
		];
		board.topic = 'employment';
		return Promise.resolve();
	}
	if (tool === 'searchUserDocs') {
		board.rawUser = [{ filename: 'contract.pdf', content: 'clause text' }];
		return Promise.resolve();
	}
	if (tool === 'splitClauses') {
		board.clauses = [{ index: 1, text: 'Clause one text here and more words to count' }];
		return Promise.resolve();
	}
	if (tool === 'requestDocs') {
		board.needsDocs = true;
		return Promise.resolve();
	}
	if (tool === 'draftQuestions') {
		const draft = (board as { __reactDraft?: { maxQuestions?: number } }).__reactDraft;
		const n =
			typeof draft?.maxQuestions === 'number'
				? Math.max(1, Math.min(4, Math.floor(draft.maxQuestions)))
				: 1;
		board.questions = Array.from({ length: n }, (_, i) => ({
			id: `q${i + 1}`,
			text: `Drafted question ${i + 1}?`,
			type: 'text' as const
		}));
		return Promise.resolve();
	}
	return Promise.resolve();
}

type Call = { id: string; name: string; arguments: Record<string, unknown> };

function scriptedCalls(script: Array<Call[] | Error>): ReactDeps['callTools'] {
	let n = 0;
	return (async () => {
		const turn = script[Math.min(n++, script.length - 1)];
		if (turn instanceof Error) throw turn;
		return {
			content: turn.length > 0 ? `Calling ${(turn[0] as Call).name}.` : 'Done retrieving.',
			toolCalls: turn
		};
	}) as ReactDeps['callTools'];
}

function depsFor(script: Array<Call[] | Error>, draft?: ExecutionPlan): ReactDeps {
	return {
		callTools: scriptedCalls(script),
		runTool: fakeRunTool as ReactDeps['runTool'],
		draftPlan: (async () => draft ?? fallbackPlanFor('interview', 'ask')) as ReactDeps['draftPlan'],
		executeTail: (async (plan) => ({
			stepStatus: Object.fromEntries(plan.steps.map((s) => [s.id, 'done'])),
			subagents: []
		})) as ReactDeps['executeTail']
	};
}

describe('reactive retrieval loop (mocked model)', () => {
	it('executes one valid call then stops on no-call', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([[{ id: 'c1', name: 'searchLegal', arguments: { query: 'dismissal notice' } }], []])
		);
		expect(res.drove).toBe(true);
		expect(res.steps.length).toBe(1);
		expect(res.steps[0]?.tool).toBe('searchLegal');
		expect(board.passages.length).toBe(1);
	});

	it('rejects unknown tools with error feedback and continues', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([
				[{ id: 'c1', name: 'inventTool', arguments: { query: 'x' } }],
				[{ id: 'c2', name: 'searchLegal', arguments: { query: 'dismissal notice' } }],
				[]
			])
		);
		expect(res.drove).toBe(true);
		expect(res.steps.length).toBe(1);
		expect(res.steps[0]?.tool).toBe('searchLegal');
	});

	it('rejects invalid args and continues', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([
				[{ id: 'c1', name: 'searchLegal', arguments: { query: '   ' } }],
				[{ id: 'c2', name: 'searchUserDocs', arguments: { query: 'contract' } }],
				[]
			])
		);
		expect(res.drove).toBe(true);
		expect(res.steps.map((s) => s.tool)).toEqual(['searchUserDocs']);
	});

	it('never throws when the model is down', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'x',
			{ agentId: 'ask' },
			depsFor([new Error('down')])
		);
		expect(res).toEqual({ steps: [], drove: false });
	});

	it('caps the loop at MAX_NATIVE_STEPS', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor(
				Array.from(
					{ length: 20 },
					(_, i) => [{ id: `c${i}`, name: 'searchLegal', arguments: { query: 'q' } }] as Call[]
				)
			)
		);
		expect(res.steps.length).toBe(MAX_NATIVE_STEPS);
	});

	it('stops after the terminal requestDocs tool', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'plan',
			'review this contract',
			{ agentId: 'check' },
			depsFor([
				[{ id: 'c1', name: 'requestDocs', arguments: {} }],
				[{ id: 'c2', name: 'searchLegal', arguments: { query: 'should not run' } }]
			])
		);
		expect(res.steps.map((s) => s.tool)).toEqual(['requestDocs']);
		expect(board.needsDocs).toBe(true);
	});

	it('drives draftQuestions after searchLegal with focus args', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([
				[{ id: 'c1', name: 'searchLegal', arguments: { query: 'dismissal notice' } }],
				[
					{
						id: 'c2',
						name: 'draftQuestions',
						arguments: { focus: ['party'], maxQuestions: 1 }
					}
				],
				[]
			])
		);
		expect(res.drove).toBe(true);
		expect(res.steps.map((s) => s.tool)).toEqual(['searchLegal', 'draftQuestions']);
		expect(board.passages.length).toBe(1);
	});

	it('stashes draftQuestions args leniently without rejecting', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([[{ id: 'c1', name: 'draftQuestions', arguments: { focus: ['bogus'] } }], []])
		);
		expect(res.drove).toBe(true);
		expect(res.steps.map((s) => s.tool)).toEqual(['draftQuestions']);
	});

	it('labels repeated calls distinctly so trace rows never duplicate', async () => {
		const board = bb();
		const res = await runReactiveRetrieval(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([
				[{ id: 'c1', name: 'searchLegal', arguments: { query: 'dismissal notice period' } }],
				[
					{ id: 'c2', name: 'searchLegal', arguments: { query: 'hearing procedure labour office' } }
				],
				[]
			])
		);
		expect(res.steps.length).toBe(2);
		const [first, second] = res.steps.map((s) => s.label);
		expect(first).not.toBe(second);
		expect(first).toContain('dismissal notice period');
		expect(second).toContain('hearing procedure');
	});
});

describe('reactive + writer tail merge', () => {
	it('runs the full drafted plan when reactive does not drive', async () => {
		const board = bb();
		const fallback = fallbackPlanFor('interview', 'ask');
		const { plan, stepStatus, subagents } = await runReactiveWithTail(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor([[]], fallback)
		);
		expect(plan.steps.map((s) => s.tool)).toEqual(fallback.steps.map((s) => s.tool));
		expect(plan.dynamic).toBe(false);
		for (const s of plan.steps) expect(stepStatus[s.id]).toBe('done');
		expect(subagents.length).toBeGreaterThan(0);
	});

	it('skips drafted retrieval once reactive has driven it', async () => {
		const board = bb();
		const fallback = fallbackPlanFor('interview', 'ask');
		const { plan } = await runReactiveWithTail(
			board,
			'interview',
			'dismissed without notice',
			{ agentId: 'ask' },
			depsFor(
				[[{ id: 'c1', name: 'searchLegal', arguments: { query: 'dismissal notice' } }], []],
				fallback
			)
		);
		expect(plan.dynamic).toBe(true);
		expect(plan.title).toContain('reactive');
		// Reactive step leads; the drafted retrieve-law step is dropped (no double search).
		expect(plan.steps[0]?.tool).toBe('searchLegal');
		expect(plan.steps.filter((s) => s.tool === 'searchLegal').length).toBe(1);
		expect(plan.steps.some((s) => s.tool === 'draftQuestions')).toBe(true);
	});
});
