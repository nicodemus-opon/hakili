import { json } from '@sveltejs/kit';
import { deleteUserDocument } from '#lib/server/documents.ts';

export async function DELETE({ params }) {
	try {
		const id = String(params.id ?? '').trim();
		if (!id) return json({ error: 'Missing document id.' }, { status: 400 });
		await deleteUserDocument(id);
		return json({ ok: true });
	} catch (e) {
		console.error('document delete error', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
