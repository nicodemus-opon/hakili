/** SSE stream event protocol for plan + follow-up streaming. Pure, unit-tested. */

export type StreamStatusStep =
	| 'start'
	| 'search-legal'
	| 'search-docs'
	| 'planning'
	| 'drafting'
	| 'repairing'
	| 'citing'
	| 'translating'
	| 'saving'
	| 'done';

export interface StatusEvent {
	type: 'status';
	step: StreamStatusStep;
	status: 'running' | 'done' | 'error';
	label?: string;
	/** Live ExecutionPlan step map when known (dynamic planner path). */
	stepStatus?: Record<string, string>;
}

export interface TokenEvent {
	type: 'token';
	/** Raw model delta (preview only; final text arrives in `done`). */
	text: string;
}

export interface DonePlanPayload {
	kind: 'plan';
	plan: string;
	passages: Array<{ title: string; citation: string; url: string }>;
	userPassages: Array<{ filename: string; content: string }>;
	topic: string;
	lang: string;
	traceId: string;
	timings: Record<string, number>;
	warnings: string[];
	executionPlan?: unknown;
	stepStatus?: Record<string, unknown>;
	subagents?: unknown[];
}

export interface DoneFollowUpPayload {
	kind: 'followup';
	answer: string;
	passages: Array<{ title: string; citation: string; url: string }>;
	lang: string;
	traceId: string;
	timings: Record<string, number>;
	executionPlan?: unknown;
	stepStatus?: Record<string, unknown>;
	subagents?: unknown[];
}

export interface DoneEvent {
	type: 'done';
	payload: DonePlanPayload | DoneFollowUpPayload;
}

export interface ErrorEvent {
	type: 'error';
	message: string;
}

export type StreamEvent = StatusEvent | TokenEvent | DoneEvent | ErrorEvent;

export function encodeStreamEvent(e: StreamEvent): string {
	return `data: ${JSON.stringify(e)}\n\n`;
}

export function decodeStreamEvent(line: string): StreamEvent | null {
	const t = line.trim();
	if (!t) return null;
	const body = t.startsWith('data:') ? t.slice(5).trim() : t;
	if (!body || body === '[DONE]') return null;
	try {
		return JSON.parse(body) as StreamEvent;
	} catch {
		return null;
	}
}
