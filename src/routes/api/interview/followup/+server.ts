import { json } from '@sveltejs/kit';
import { parseFollowUp, runFollowUp } from '#lib/server/agent/pipeline.ts';

export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const input = parseFollowUp(body);
		if ('error' in input) return json({ error: input.error }, { status: 400 });
		const result = await runFollowUp(input);
		return json(result);
	} catch (e) {
		console.error('followup error', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
