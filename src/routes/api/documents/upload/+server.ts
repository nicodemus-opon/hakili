import { json } from '@sveltejs/kit';
import { deleteUserDocument, ingestUserDocument } from '#lib/server/documents.ts';

export async function POST({ request }) {
	try {
		const form = await request.formData();
		// FilePond FormPostStore posts the file under the configured `name`
		// (`file`); accept the default `entry` field as well for tolerance.
		const raw = form.get('file') ?? form.get('entry');
		const file = raw instanceof File ? raw : undefined;
		if (!file) {
			return json({ error: 'Attach a file first.' }, { status: 400 });
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		const summary = await ingestUserDocument({
			filename: file.name || 'document',
			mimeType: file.type || 'application/octet-stream',
			bytes
		});
		return json({ document: summary });
	} catch (e) {
		console.error('document upload error', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
	}
}

/**
 * FilePond FormPostStore release hook fires
 * `DELETE /api/documents/upload?id=<server-id>` when a stored entry is
 * removed. Support it here alongside `DELETE /api/documents/[id]`.
 */
export async function DELETE({ url }) {
	try {
		const id = String(url.searchParams.get('id') ?? '').trim();
		if (!id) return json({ error: 'Missing document id.' }, { status: 400 });
		await deleteUserDocument(id);
		return json({ ok: true });
	} catch (e) {
		console.error('document release error', e);
		return json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
