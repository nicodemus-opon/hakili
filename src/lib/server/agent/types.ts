/** Shared agent-harness types. Pure data contracts, no QVAC imports. */

export type ResponseLang = 'en' | 'sw';
/** Explicit user toggle. No auto-detection: the toggle IS the language. */
export type LangPref = ResponseLang;

export const ALLOWED_TOPICS = [
	'constitutional',
	'criminal',
	'employment',
	'family',
	'succession',
	'land',
	'housing',
	'consumer',
	'debt',
	'traffic',
	'business',
	'ip',
	'privacy',
	'procedure',
	'general'
] as const;

export type Topic = (typeof ALLOWED_TOPICS)[number];

export function isTopic(t: string): t is Topic {
	return (ALLOWED_TOPICS as readonly string[]).includes(t);
}

export interface Passage {
	id: string;
	title: string;
	citation: string;
	url: string;
	content: string;
	topic: string;
	score: number;
}

export interface UserPassage {
	id: string;
	documentId: string;
	filename: string;
	content: string;
	score: number;
}

export type QuestionType = 'text' | 'single_choice' | 'multi_choice' | 'boolean' | 'date';

export interface Question {
	id: string;
	text: string;
	type: QuestionType;
	options?: string[];
	required?: boolean;
	help?: string;
	needsDocs?: boolean;
}

export interface HistoryTurn {
	q: string;
	a: string;
}

export interface InterviewStep {
	question: Question | null;
	topic: Topic;
	lang: ResponseLang;
	traceId: string;
}

export interface PlanResult {
	plan: string;
	passages: Passage[];
	userPassages: Array<{ filename: string; content: string }>;
	topic: string;
	lang: ResponseLang;
	traceId: string;
	timings: Record<string, number>;
	warnings: string[];
	executionPlan?: import('./planner/types.ts').ExecutionPlan;
	stepStatus?: Record<string, import('./planner/types.ts').PlanStepStatus>;
	subagents?: import('./planner/types.ts').SubagentRun[];
}

export interface RetrievalOptions {
	topK?: number;
	topic?: string;
	signal?: AbortSignal;
}
