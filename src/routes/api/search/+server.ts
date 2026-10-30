import { json } from '@sveltejs/kit';
import { searchLegal } from '#lib/server/agent/retrieval.ts';

export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const query = String((body as Record<string, unknown>).query ?? '');
		if (!query.trim()) return json({ error: 'Empty query.', results: [] }, { status: 400 });
		const topK = Math.min(
			Math.max(Number((body as Record<string, unknown>).topK ?? 5) || 5, 1),
			12
		);
		const results = await searchLegal(query, topK);
		return json({ results });
	} catch (e) {
		console.error('search error', e);
		return json(
			{ error: e instanceof Error ? e.message : String(e), results: [] },
			{ status: 500 }
		);
	}
}
