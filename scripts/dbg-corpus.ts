import { pool } from '../src/lib/server/db.ts';
import { searchLegal } from '../src/lib/server/agent/retrieval.ts';
import { initAgent } from '../src/lib/server/agent/llm.ts';

const r = await pool.query('SELECT count(*)::int AS c FROM legal_documents');
console.log('legal_documents:', r.rows[0].c);
const s = await pool.query(
	'SELECT topic, count(*)::int AS c FROM legal_documents GROUP BY topic ORDER BY c DESC LIMIT 12'
);
console.log('by_topic:', JSON.stringify(s.rows));

await initAgent();
const hits = await searchLegal('rent security deposit tenancy landlord tenant', 6);
console.log(
	'housing_query_hits:',
	hits.map((h) => `${h.title} [${h.topic}]`).join(' | ') || '(none)'
);
const hits2 = await searchLegal(
	'review this SAMPLE RENTAL AGREEMENT ABC Properties Silvia Mando rent $685 per month Anycity',
	6
);
console.log(
	'lease_query_hits:',
	hits2.map((h) => `${h.title} [${h.topic}]`).join(' | ') || '(none)'
);
await pool.end();
