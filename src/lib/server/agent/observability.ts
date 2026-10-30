/** Minimal structured observability for the offline agent harness. */

export interface Trace {
	id: string;
	startedAt: number;
	marks: Record<string, number>;
	events: Array<{ at: number; name: string; detail?: string }>;
}

export function newTrace(): Trace {
	let id: string;
	try {
		id = crypto.randomUUID().slice(0, 8);
		id = `t-${id}`;
	} catch {
		id = `t-${Date.now().toString(36)}`;
	}
	return { id, startedAt: Date.now(), marks: {}, events: [] };
}

export function mark(trace: Trace, name: string): void {
	trace.marks[name] = Date.now() - trace.startedAt;
}

export function event(trace: Trace, name: string, detail?: string): void {
	trace.events.push({ at: Date.now() - trace.startedAt, name, detail });
}

export function timings(trace: Trace): Record<string, number> {
	return { totalMs: Date.now() - trace.startedAt, ...trace.marks };
}

/** Run fn with an overall timeout. Rejects with Error('... timed out ...'). */
export async function withTimeout<T>(
	label: string,
	ms: number,
	fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	try {
		return await fn(controller.signal);
	} catch (e) {
		if (controller.signal.aborted)
			throw new Error(`${label} timed out after ${ms}ms`, { cause: e });
		throw e;
	} finally {
		clearTimeout(timer);
	}
}

export function logWarn(trace: Trace, scope: string, message: string): void {
	event(trace, `warn:${scope}`, message);
	console.warn(`[${trace.id}][${scope}] ${message}`);
}

export function logError(trace: Trace, scope: string, err: unknown): void {
	const msg = err instanceof Error ? err.message : String(err);
	event(trace, `error:${scope}`, msg);
	console.error(`[${trace.id}][${scope}]`, err);
}
