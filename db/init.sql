CREATE EXTENSION IF NOT EXISTS vector;

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
		to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
	) STORED,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_documents_search_idx
	ON legal_documents USING gin (search_vector);

CREATE TABLE IF NOT EXISTS plans (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	issue TEXT NOT NULL,
	answers JSONB NOT NULL DEFAULT '{}'::jsonb,
	plan TEXT NOT NULL,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_documents (
	id TEXT PRIMARY KEY,
	filename TEXT NOT NULL,
	mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
	size_bytes INTEGER NOT NULL DEFAULT 0,
	kind TEXT NOT NULL DEFAULT 'txt',
	extracted_chars INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_document_chunks (
	id TEXT PRIMARY KEY,
	document_id TEXT NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
	chunk_index INTEGER NOT NULL DEFAULT 0,
	content TEXT NOT NULL,
	embedding vector(768),
	created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_document_chunks_doc_idx
	ON user_document_chunks (document_id);
