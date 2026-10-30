import { describe, expect, it } from 'vitest';
import { decodeStreamEvent, encodeStreamEvent } from './stream-events.ts';

describe('stream-events', () => {
	it('round-trips status, token, done, error', () => {
		const events = [
			{ type: 'status', step: 'drafting', status: 'running', label: 'Drafting' },
			{ type: 'token', text: 'hello' },
			{
				type: 'done',
				payload: {
					kind: 'followup',
					answer: 'hi',
					passages: [],
					lang: 'en',
					traceId: 't-1',
					timings: {}
				}
			},
			{ type: 'error', message: 'boom' }
		] as const;
		for (const e of events) {
			const line = encodeStreamEvent(e as never);
			expect(line.startsWith('data: ')).toBe(true);
			expect(decodeStreamEvent(line)).toEqual(e);
		}
	});

	it('ignores keepalive comments and empty lines', () => {
		expect(decodeStreamEvent(': stream start')).toBeNull();
		expect(decodeStreamEvent('')).toBeNull();
	});
});
