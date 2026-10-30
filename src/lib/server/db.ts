import { Pool } from 'pg';

const connectionString =
	process.env.DATABASE_URL ?? 'postgres://hakili:hakili@localhost:5432/hakili';

export const pool = new Pool({ connectionString });

export async function ensureSchema(): Promise<void> {
	await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS legal_documents (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			citation TEXT NOT NULL,
			url TEXT NOT NULL,
			content TEXT NOT NULL,
			topic TEXT NOT NULL DEFAULT 'general',
			source_type TEXT NOT NULL DEFAULT 'legislation',
			effective_date TEXT,
			embedding vector(768),
			search_vector tsvector GENERATED ALWAYS AS (
				to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
			) STORED,
			created_at TIMESTAMPTZ DEFAULT now()
		);
	`);
	// Migrate older tables.
	await pool.query(
		`ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'general';`
	);
	await pool.query(
		`ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'legislation';`
	);
	await pool.query(`ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS effective_date TEXT;`);
	// Migrate FTS config from english (stemming, English-only) to simple (language-agnostic).
	try {
		const cur = await pool.query<{ cfg: string }>(
			`SELECT pg_get_expr(adbin, adrelid) AS cfg FROM pg_attrdef WHERE adrelid = 'legal_documents'::regclass AND adnum = (SELECT attnum FROM pg_attribute WHERE attrelid = 'legal_documents'::regclass AND attname = 'search_vector')`
		);
		const expr: string = cur.rows[0]?.cfg ?? '';
		if (expr && !expr.includes(`'simple'`)) {
			await pool.query(`DROP INDEX IF EXISTS legal_documents_search_idx;`);
			await pool.query(`ALTER TABLE legal_documents DROP COLUMN search_vector;`);
			await pool.query(
				`ALTER TABLE legal_documents ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))) STORED;`
			);
		}
	} catch {
		// Best-effort migration; fresh installs already use the right config.
	}
	await pool.query(
		`CREATE INDEX IF NOT EXISTS legal_documents_search_idx ON legal_documents USING gin (search_vector);`
	);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS plans (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			issue TEXT NOT NULL,
			answers JSONB NOT NULL DEFAULT '{}'::jsonb,
			plan TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT now()
		);
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS user_documents (
			id TEXT PRIMARY KEY,
			filename TEXT NOT NULL,
			mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
			size_bytes INTEGER NOT NULL DEFAULT 0,
			kind TEXT NOT NULL DEFAULT 'txt',
			extracted_chars INTEGER NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT now()
		);
	`);
	await pool.query(`
		CREATE TABLE IF NOT EXISTS user_document_chunks (
			id TEXT PRIMARY KEY,
			document_id TEXT NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
			chunk_index INTEGER NOT NULL DEFAULT 0,
			content TEXT NOT NULL,
			embedding vector(768),
			created_at TIMESTAMPTZ DEFAULT now()
		);
	`);
	await pool.query(
		`CREATE INDEX IF NOT EXISTS user_document_chunks_doc_idx ON user_document_chunks (document_id);`
	);
}
