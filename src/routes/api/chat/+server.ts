import { json } from '@sveltejs/kit';
import { parsePlanInput, runPlanPipeline } from '#lib/server/agent/pipeline.ts';

/** Legacy chat endpoint: shares the interview/finish plan pipeline. */
export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const input = parsePlanInput(body);
		if ('error' in input) return json({ error: input.error }, { status: 400 });
		const result = await runPlanPipeline(input);
		return json(result);
	} catch (e) {
		console.error('chat error', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
