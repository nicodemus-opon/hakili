import { parsePlanInput } from '#lib/server/agent/pipeline.ts';
import { streamPlanPipeline } from '#lib/server/agent/stream-pipeline.ts';
import { encodeStreamEvent } from '#lib/stream-events.ts';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	let input: ReturnType<typeof parsePlanInput>;
	try {
		const body = await request.json().catch(() => ({}));
		input = parsePlanInput(body);
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
	}
	if ('error' in input) return json({ error: input.error }, { status: 400 });
	const signal = request.signal;
	const stream = new ReadableStream({
		async start(controller) {
			const enc = new TextEncoder();
			const send = (s: string): void => controller.enqueue(enc.encode(s));
			send(': stream start\n\n');
			try {
				for await (const ev of streamPlanPipeline(input, { signal })) {
					if (signal.aborted) break;
					send(encodeStreamEvent(ev));
				}
			} catch (e) {
				send(
					encodeStreamEvent({
						type: 'error',
						message: e instanceof Error ? e.message : String(e)
					})
				);
			} finally {
				try {
					controller.close();
				} catch {
					/* already closed on abort */
				}
			}
		},
		cancel() {
			/* request.signal aborts the generator loop */
		}
	});
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
