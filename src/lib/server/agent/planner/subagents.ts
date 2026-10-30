/** Subagent fan-out: named workers composing tools, run in parallel groups. */
import type { SubagentRun } from './types.ts';
import { humanizeLabel } from '#lib/humanize.ts';
import {
	toolDraftQuestions,
	toolExtractState,
	toolGeneratePlan,
	toolRepairSections,
	toolSearchLegal,
	toolSearchUserDocs,
	toolSplitClauses,
	toolVerifyCitations,
	type Blackboard,
	type ToolOpts
} from './tools.ts';

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
	const start = Date.now();
	const value = await fn();
	return { value, ms: Date.now() - start };
}

/** Retrieval subagent: law + user docs in parallel. */
export async function retrievalSubagent(bb: Blackboard, opts: ToolOpts): Promise<SubagentRun> {
	const start = Date.now();
	const run: SubagentRun = {
		id: `retrieval-${Date.now().toString(36)}`,
		name: 'retrieval',
		task: 'Search Kenyan law and attached documents',
		status: 'running',
		tools: []
	};
	try {
		const [law, docs] = await Promise.all([
			timed(() => toolSearchLegal(bb, opts)),
			timed(() => toolSearchUserDocs(bb, opts))
		]);
		run.tools = [
			{ tool: 'searchLegal', title: `Searched law (${law.value.length} passages)`, status: 'done' },
			{ tool: 'searchUserDocs', title: `Searched documents (${docs.value} chunks)`, status: 'done' }
		];
		run.status = 'done';
		run.result = `${law.value.length} law passages, ${docs.value} doc chunks`;
	} catch {
		run.status = 'error';
		run.tools.push({ tool: 'searchLegal', title: 'Retrieval failed', status: 'error' });
	}
	run.durationMs = Date.now() - start;
	if (opts.trace)
		opts.trace.events.push({
			at: Date.now() - opts.trace.startedAt,
			name: 'subagent:retrieval',
			detail: run.status
		});
	return run;
}

/** Interview subagent: state extraction + batched drafting + deterministic gates. */
export async function interviewSubagent(bb: Blackboard, opts: ToolOpts): Promise<SubagentRun> {
	const start = Date.now();
	const run: SubagentRun = {
		id: `interview-${Date.now().toString(36)}`,
		name: 'interview',
		task: 'Extract case state and draft grounded questions',
		status: 'running',
		tools: []
	};
	try {
		const state = await timed(() => toolExtractState(bb, opts));
		const draft = await timed(() => toolDraftQuestions(bb, opts));
		run.tools = [
			{
				tool: 'extractState',
				title: `State: missing ${state.value.missing.map((m) => humanizeLabel(m)).join(', ') || 'none'}`,
				status: 'done'
			},
			{ tool: 'draftQuestions', title: `Drafted ${draft.value.length} question(s)`, status: 'done' }
		];
		run.status = 'done';
		run.result = `${draft.value.length} question(s)`;
	} catch {
		run.status = 'error';
		run.tools.push({ tool: 'draftQuestions', title: 'Interview drafting failed', status: 'error' });
	}
	run.durationMs = Date.now() - start;
	return run;
}

/** Writer subagent: plan generation + repair + citation verification. */
export async function writerSubagent(bb: Blackboard, opts: ToolOpts): Promise<SubagentRun> {
	const start = Date.now();
	const run: SubagentRun = {
		id: `writer-${Date.now().toString(36)}`,
		name: 'writer',
		task: 'Write plan, repair weak sections, verify citations',
		status: 'running',
		tools: []
	};
	try {
		await timed(() => toolGeneratePlan(bb, opts));
		run.tools.push({ tool: 'generatePlan', title: 'Generated plan draft', status: 'done' });
		try {
			await toolRepairSections(bb, opts);
			run.tools.push({ tool: 'repairSections', title: 'Repaired weak sections', status: 'done' });
		} catch {
			run.tools.push({ tool: 'repairSections', title: 'Repair skipped', status: 'skipped' });
		}
		await toolVerifyCitations(bb, opts);
		run.tools.push({ tool: 'verifyCitations', title: 'Verified citations', status: 'done' });
		run.status = 'done';
		run.result = `${bb.plan.length} chars`;
	} catch {
		run.status = 'error';
		run.tools.push({ tool: 'generatePlan', title: 'Plan generation failed', status: 'error' });
	}
	run.durationMs = Date.now() - start;
	return run;
}

/** Check-only clause splitter: deterministic fan-out over doc clauses. */
export async function clauseSubagent(bb: Blackboard, opts: ToolOpts): Promise<SubagentRun> {
	const start = Date.now();
	const run: SubagentRun = {
		id: `clauses-${Date.now().toString(36)}`,
		name: 'clause-splitter',
		task: 'Split attached document into reviewable clauses',
		status: 'running',
		tools: []
	};
	try {
		const n = await toolSplitClauses(bb, opts);
		run.tools = bb.clauses.slice(0, 6).map((c) => ({
			tool: 'splitClauses' as const,
			title: `Clause ${c.index}: ${c.text.slice(0, 60)}…`,
			status: 'done' as const
		}));
		run.status = 'done';
		run.result = `${n} clause(s)`;
	} catch {
		run.status = 'error';
	}
	run.durationMs = Date.now() - start;
	return run;
}

export const SUBAGENTS = { retrievalSubagent, interviewSubagent, writerSubagent, clauseSubagent };

export type SubagentName = keyof typeof SUBAGENTS;
