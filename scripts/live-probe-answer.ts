/** Live verify: advice intent answers, case intent interviews. */
import { runInterviewNext, runInterviewStart } from '#lib/server/agent/pipeline.ts';

for (const issue of [
	'can my employer dismiss me without a notice',
	'My employer dismissed me without notice'
]) {
	console.log(`\n===== ISSUE: ${issue}`);
	try {
		const out = await runInterviewStart({
			issue,
			langPref: 'auto',
			agentId: 'ask',
			documentIds: []
		});
		console.log(`  questions: ${(out.questions ?? []).length}`);
		console.log(
			`  answer: ${out.answer ? out.answer.slice(0, 400).replace(/\s+/g, ' ') : '(none)'}`
		);
	} catch (err) {
		console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
	}
}
// Case control: follow-up turn still interviews (no reroute mid-intake).
try {
	const out = await runInterviewNext({
		issue: 'My employer dismissed me without notice',
		langPref: 'auto',
		agentId: 'ask',
		documentIds: [],
		history: [{ q: 'What is the name of your employer?', a: 'Bidii Ltd' }]
	});
	console.log(`\n===== FOLLOW-UP (Bidii Ltd named)`);
	console.log(`  questions: ${(out.questions ?? []).map((q) => q.text).join(' | ') || '(none)'}`);
	console.log(`  answer: ${out.answer ? '(unexpected)' : '(none, correct)'}`);
} catch (err) {
	console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
}
console.log('\nDONE-ANSWER');
process.exit(0);
