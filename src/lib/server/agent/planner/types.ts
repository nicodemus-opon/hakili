/** Dynamic execution-plan types. Pure data contracts, no QVAC imports. */

export type PlanGoal = 'interview' | 'plan' | 'followup';

export type PlanTool =
	| 'extractState'
	| 'searchLegal'
	| 'searchUserDocs'
	| 'draftQuestions'
	| 'generatePlan'
	| 'repairSections'
	| 'verifyCitations'
	| 'splitClauses'
	| 'admissionGuard'
	| 'requestDocs'
	| 'fallbackPlan';

export interface PlanStep {
	/** Stable step id, e.g. "retrieve-law". */
	id: string;
	tool: PlanTool;
	/** Short human label for the Plan AI Element, e.g. "Search Kenyan law". */
	label: string;
	budgetMs: number;
	retry: 0 | 1;
	onFail: 'skip' | 'fallback' | 'abort';
	/** Steps sharing a group run via Promise.allSettled. */
	parallelGroup?: number;
}

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface ExecutionPlan {
	goal: PlanGoal;
	agentId: string;
	/** e.g. "Plan: check document before signing". */
	title: string;
	reason: string;
	steps: PlanStep[];
	/** True when the LLM produced this plan; false = deterministic fallback. */
	dynamic: boolean;
}

export interface ToolRun {
	tool: PlanTool;
	title: string;
	status: 'done' | 'running' | 'error' | 'skipped';
	detail?: string;
}

export interface SubagentRun {
	id: string;
	/** e.g. "retrieval", "writer", "clause-splitter". */
	name: string;
	task: string;
	status: 'done' | 'running' | 'error';
	durationMs?: number;
	tools: ToolRun[];
	result?: string;
}
