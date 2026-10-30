import { pool } from '../src/lib/server/db.ts';
import { searchLegal } from '../src/lib/server/agent/retrieval.ts';
import { searchUserDocuments } from '../src/lib/server/documents.ts';
import { planQuestionBatch } from '../src/lib/server/agent/interview/batch.ts';
import { newTrace } from '../src/lib/server/agent/observability.ts';

const DOC_ID = 'e5b51b0e-ce3b-4738-8337-25ae05feb5d4';
const Q =
	'review this SAMPLE RENTAL AGREEMENT ABC Properties Silvia Mando rent $685 per month Anycity agreement contract clause signature notice termination demand payment';

// 1. Parallel (what the executor does) vs sequential
const par = await Promise.allSettled([searchLegal(Q, 6), searchUserDocuments(Q, [DOC_ID], 4)]);
for (const [i, r] of par.entries()) {
	if (r.status === 'fulfilled')
		console.log(
			`parallel[${i}] ok hits=${r.value.length}:`,
			r.value
				.map((h: { title: string }) => h.title)
				.slice(0, 3)
				.join(' | ') || '(none)'
		);
	else console.log(`parallel[${i}] THREW:`, String(r.reason).slice(0, 300));
}

const seq = await searchLegal(Q, 6).catch((e: unknown) => `THREW: ${String(e).slice(0, 300)}`);
console.log(
	'sequential searchLegal hits=',
	Array.isArray(seq) ? seq.length : seq,
	Array.isArray(seq)
		? seq
				.map((h) => `${h.title} [${h.topic}]`)
				.slice(0, 3)
				.join(' | ')
		: ''
);

// 2. Batch draft visibility
const trace = newTrace();
const batch = await planQuestionBatch(Q, [], 'en', { trace, agentId: 'check' });
console.log(
	'batch questions:',
	batch.map((q) => q.text)
);
for (const e of trace.events) {
	if (e.name.startsWith('interview:'))
		console.log(`trace ${e.name}:`, (e.detail ?? '').slice(0, 500));
}
await pool.end();
