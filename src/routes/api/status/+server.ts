import { json } from '@sveltejs/kit';
import {
	agentReady,
	dualDegraded,
	initAgent,
	loadedTiers,
	resolveModelStrategy
} from '#lib/server/agent/llm.ts';
import { hasCorpus } from '#lib/server/agent/retrieval.ts';

export async function GET() {
	try {
		await initAgent();
		const corpus = await hasCorpus().catch(() => false);
		return json({
			ready: agentReady(),
			corpus,
			llm: process.env.QVAC_LLM_MODEL ?? '4B',
			strategy: resolveModelStrategy(),
			tiers: loadedTiers(),
			degraded: dualDegraded()
		});
	} catch (e) {
		console.error('status error', e);
		return json(
			{ ready: false, error: e instanceof Error ? e.message : String(e) },
			{ status: 500 }
		);
	}
}
