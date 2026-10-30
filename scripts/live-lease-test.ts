import { ingestUserDocument } from '../src/lib/server/documents.ts';
import { ensureSchema, pool } from '../src/lib/server/db.ts';
import { runInterviewStart, runPlanPipeline } from '../src/lib/server/agent/pipeline.ts';

await ensureSchema();

const lease = `SAMPLE RENTAL AGREEMENT (Basic / Beginning)
THIS AGREEMENT made this 15th Day of June, 2012, by and between ABC Properties, herein called "Landlord," and Silvia Mando, herein called "Tenant." Landlord hereby agrees to rent to Tenant the dwelling located at 9876 Cherry Avenue, Apartment 426.
1. FIXED-TERM AGREEMENT (LEASE): Tenants agree to lease this dwelling for a fixed term of one year, beginning July 1, 2012 and ending June 30, 2013. Upon expiration, this Agreement shall become a month-to-month agreement AUTOMATICALLY, UNLESS either Tenants or Owners notify the other party in writing at least 30 days prior to expiration.
2. RENT: Tenant agrees to pay Landlord as base rent the sum of $685 per month, due and payable monthly in advance on the 1st day of each month. The first month's rent is required on or before move-in.
3. FORM OF PAYMENT: personal check, cashier's check, or money order made out to the Landlord.
4. RENT PAYMENT PROCEDURE: by mail to 426 Main Street, Anycity, USA, or in person.
5. RENT DUE DATE: 3 day grace period. Rent not received prior to the 4th: $25 late fee, plus $5 per day thereafter. No excuses accepted.
6. BAD-CHECK SERVICING CHARGE: $25 returned check charge; all future rent payments cash or money order.
7. SECURITY DEPOSIT: $685 to be refunded upon vacating; held intact until at least thirty (30) working days after vacating; returned minus charges within 60 days with written explanation.
8. CLEANING FEE: return property in same condition or pay a $200.00 minimum cleaning fee.
9. REMOVAL OF LANDLORD'S PROPERTY: removal without written consent constitutes abandonment and termination.
10. VEHICLES & GARAGE USE: maximum of 1 vehicle; operable and licensed; no boats/trailers without written permission.
11. UTILITIES: Tenant pays electricity, gas, heating, telephone; Landlord pays water, garbage, sewer.
12. NOTIFICATION OF SERIOUS BUILDING PROBLEMS: notify Landlord immediately of leaks, termites, cracks; tenant may be held financially responsible if not prompt.
13. PETS: only with written permission; $25 per month pet-rent; dangerous pets banned; constant barking not permitted.
14. FULL DISCLOSURE: Tenants state they understand all provisions; signatures required.`;

const doc = await ingestUserDocument({
	filename: 'sample-rental-agreement.txt',
	mimeType: 'text/plain',
	bytes: new TextEncoder().encode(lease)
});
console.log('INGESTED', JSON.stringify({ id: doc.id, chunks: doc.chunks }));

const interview = await runInterviewStart({
	issue: 'review this',
	langPref: 'auto',
	agentId: 'ask',
	documentIds: [doc.id]
});
console.log('--- INTERVIEW ---');
console.log(
	JSON.stringify(
		{
			effectiveAgentId: interview.effectiveAgentId,
			topic: interview.topic,
			lang: interview.lang,
			questions: (interview.questions ?? []).map((q) => q.text),
			planTitle: interview.executionPlan?.title
		},
		null,
		1
	)
);

const plan = await runPlanPipeline({
	issue: 'review this',
	langPref: 'auto',
	agentId: 'ask',
	questions: interview.questions ?? [],
	answers: {},
	topK: 6,
	documentIds: [doc.id]
});
console.log('--- PLAN ---');
console.log(
	JSON.stringify(
		{
			topic: plan.topic,
			warnings: plan.warnings,
			passages: plan.passages.map((p) => `${p.title} [${p.topic}]`),
			planHead: plan.plan.slice(0, 2500)
		},
		null,
		1
	)
);
await pool.end();
