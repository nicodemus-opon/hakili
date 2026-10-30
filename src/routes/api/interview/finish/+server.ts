import { json } from '@sveltejs/kit';
import { parsePlanInput, runPlanPipeline } from '#lib/server/agent/pipeline.ts';

export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const input = parsePlanInput(body);
		if ('error' in input) return json({ error: input.error }, { status: 400 });
		const result = await runPlanPipeline(input);
		return json(result);
	} catch (e) {
		console.error('finish error', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
