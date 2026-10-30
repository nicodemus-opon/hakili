import { describe, expect, it } from 'vitest';
import { answerAddressesQuestion } from './jurisdiction.ts';
import { isDraftInstrument } from './plan/generator.ts';
import { hasSubstantiveContent } from './jurisdiction.ts';
import {
	assignCitations,
	citationCoverage,
	verifyCitations,
	verifyQuoteSpans
} from './plan/validator.ts';
import {
	authorityChecks,
	buildFollowUpPrompt,
	conversationalAnswer,
	draftConversational,
	extractiveAnswer,
	fallbackFollowUp,
	fallbackPlan,
	isUsableConversational,
	keepDirectives,
	nextStepsFallback,
	parseFollowUp,
	parseInterviewNext,
	parseInterviewStart,
	parsePlanInput,
	stripPassageHeaderEchoes
} from './pipeline.ts';
import { filterApplicablePassages } from './retrieval.ts';

describe('pipeline input validation', () => {
	it('rejects empty issues', () => {
		expect(parseInterviewStart({ issue: '   ' })).toEqual({
			error: 'Please describe your issue first.'
		});
		expect(parseInterviewNext({ issue: '', history: [] })).toHaveProperty('error');
		expect(parsePlanInput({})).toHaveProperty('error');
	});

	it('normalises language prefs and caps history', () => {
		const ok = parseInterviewNext({
			issue: 'dismissed',
			history: Array.from({ length: 30 }, (_, i) => ({ q: `q${i}`, a: `a${i}` })),
			langPref: 'xx'
		});
		expect(ok).toMatchObject({ issue: 'dismissed', langPref: 'en' });
		if (!('error' in ok)) expect(ok.history.length).toBeLessThanOrEqual(12);
	});

	it('caps document ids and topK', () => {
		const ok = parsePlanInput({
			issue: 'dismissed',
			answers: { q1: 'x' },
			topK: 99,
			documentIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
		});
		expect(ok).toMatchObject({ topK: 12 });
		if (!('error' in ok)) expect(ok.documentIds.length).toBeLessThanOrEqual(10);
	});

	it('accepts legacy lang field', () => {
		expect(parseInterviewStart({ issue: 'x', lang: 'sw' })).toMatchObject({ langPref: 'sw' });
	});

	it('rejects empty follow-up messages and caps turns', () => {
		expect(parseFollowUp({ issue: 'dismissed', message: '   ' })).toHaveProperty('error');
		expect(parseFollowUp({ issue: '', message: 'hello' })).toHaveProperty('error');
		const ok = parseFollowUp({
			issue: 'dismissed',
			message: 'What next?',
			history: [{ q: 'q', a: 'a' }],
			plan: 'plan text',
			turns: Array.from({ length: 30 }, (_, i) => ({
				role: i % 2 ? 'assistant' : 'user',
				content: `t${i}`
			}))
		});
		expect(ok).toMatchObject({ issue: 'dismissed', message: 'What next?' });
		if (!('error' in ok)) {
			expect(ok.turns.length).toBeLessThanOrEqual(10);
			expect(ok.turns.every((t) => t.role === 'user' || t.role === 'assistant')).toBe(true);
		}
	});

	it('builds a grounded follow-up prompt', () => {
		const prompt = buildFollowUpPrompt({
			issue: 'dismissed without notice',
			facts: ['When? Last Monday'],
			plan: 'Step 1: write a demand letter.',
			turns: [{ role: 'user', content: 'Can I claim pay?' }],
			message: 'How long do I have?',
			passages: [
				{
					id: 'p1',
					title: 'Termination',
					citation: 'Employment Act, 2007',
					url: 'https://example.test',
					content: 'Notice rules apply.',
					topic: 'employment',
					score: 1
				}
			],
			lang: 'en'
		});
		expect(prompt).toContain('How long do I have?');
		expect(prompt).toContain('dismissed without notice');
		expect(prompt).toContain('[1] Termination');
		expect(prompt).toContain('for an advocate');
	});

	it('failure floor omits deadlines and risks without a time signal', () => {
		const plan = fallbackPlan(
			'My neighbour built a wall on my land',
			{ q1: 'The wall is two feet over the boundary' },
			[
				{
					id: 'p1',
					title: 'Land',
					citation: 'Land Act',
					url: 'https://example.test',
					content: 'Boundaries are fixed by survey.',
					topic: 'land',
					score: 1
				}
			],
			[],
			[]
		);
		expect(plan).toContain('My neighbour built a wall');
		expect(plan).not.toContain('## Deadlines');
		expect(plan).not.toContain('## Urgent');
	});

	it('failure floor keeps deadlines and risks when time rules apply', () => {
		const plan = fallbackPlan(
			'My employer dismissed me without notice',
			{ q1: 'No hearing at Bidii Ltd' },
			[
				{
					id: 'p1',
					title: 'Employment Act',
					citation: 'Employment Act, 2007',
					url: 'https://example.test',
					content: 'Notice periods depend on the contract terms.',
					topic: 'employment',
					score: 1
				}
			],
			[],
			[]
		);
		expect(plan).toContain('## Deadlines');
		expect(plan).toContain('## Urgent');
	});

	it('failure floor stays case-specific without a model', () => {
		const plan = fallbackPlan(
			'My employer dismissed me without notice',
			{ q1: 'No hearing at Bidii Ltd', q2: 'I have payslips' },
			[
				{
					id: 'p1',
					title: 'Employment Act',
					citation: 'Employment Act, 2007',
					url: 'https://example.test',
					content: 'x',
					topic: 'employment',
					score: 1
				}
			],
			[],
			[]
		);
		expect(plan).toContain('My employer dismissed me without notice');
		expect(plan).toContain('Bidii Ltd');
		expect(plan).toContain('payslips');
		expect(plan).toContain('Employment Act, 2007');
		expect(plan).not.toContain('What are my rights in this situation?');
		expect(plan).not.toContain('See the sources listed below');
	});

	it('ungrounded hedging fails the citation floor even with zero passages', () => {
		// Live repro: "Yes, you can be evicted..." shipped with no sources.
		// citationCoverage is 0 for factual claims with no evidence, so the
		// follow-up gate (no passage-count exemption) routes it to the
		// honest fallback instead of shipping model hedging as law.
		const hedging =
			"Yes, you can be evicted without a notice in some cases, but it depends on the specific circumstances and local laws. I can help you understand your rights if you'd like to discuss them further.";
		expect(citationCoverage(hedging, [])).toBe(0);
	});

	it('follow-up fallback is honest with and without passages', () => {
		const withSources = fallbackFollowUp(
			'can i be evicted without a notice',
			[{ title: 'Eviction process', citation: 'Kenya Law', content: 'x' }],
			'en'
		);
		expect(withSources).toContain('These sources look relevant');
		expect(withSources).toContain('Eviction process');
		const withoutSources = fallbackFollowUp('can i be evicted without a notice', [], 'en');
		expect(withoutSources).toContain('could not put together');
		expect(withoutSources).not.toContain('These sources look relevant');
		expect(withoutSources).not.toContain('Yes, you can be evicted');
	});

	it('failure floor always includes an ordered way forward', () => {
		const land = fallbackPlan(
			'neighbor is encroaching on my property',
			{ demand: 'yes i did', started: '2 years ago' },
			[
				{
					id: 'p1',
					title: 'Land Act',
					citation: 'Land Act, 2012',
					url: 'https://example.test',
					content: 'Boundaries are fixed by survey. Keep the title deed and survey map.',
					topic: 'land',
					score: 1
				}
			],
			[],
			[]
		);
		expect(land).toContain('Way forward');
		// Passage-derived evidence ships; no office is invented.
		expect(land).toContain('Keep the title deed and survey map');
		expect(land).not.toContain('Land Registrar');
		expect(land).not.toContain('Small Claims');
		expect(land).toContain('## Facts');
		expect(land).toContain('## Authorities');
		expect(land).toContain('## Note');
		const employment = fallbackPlan('dismissed without notice', { q1: 'no hearing' }, [], [], []);
		expect(employment).toContain('Way forward');
		expect(employment).toContain('File dated copies');
		// No passages → the neutral spine only, never an invented forum.
		expect(employment).not.toContain('Labour');
		expect(employment).not.toContain('Small Claims');
		expect(employment).toContain('## Note');
		const generic = fallbackPlan(
			'I need general advice about a signed paper',
			{ q1: 'not sure what it means' },
			[],
			[],
			[]
		);
		expect(generic).toContain('Way forward');
		expect(generic).toContain('## Note');
	});

	it('draft failure floor keeps the Draft instrument contract without inventing facts', () => {
		const plan = fallbackPlan(
			'My landlord sent me a notice to vacate in 7 days',
			{ 'Who is the other party?': 'John Mwangi', 'What do you want?': 'Ask for more time' },
			[
				{
					id: 'p1',
					title: 'Eviction process',
					citation: 'Kenya Law',
					url: 'https://example.test',
					content: 'Eviction requires lawful process with proper notice.',
					topic: 'housing',
					score: 1
				}
			],
			[],
			[],
			'draft'
		);
		expect(plan).toContain('## Facts');
		expect(plan).toContain('## Draft');
		expect(plan).toContain('## Attachments');
		expect(plan).not.toContain('## Clauses');
		// Skeletal instrument from instructed facts only: numbered paragraphs,
		// no invented admissions, prayers left to counsel.
		expect(plan).toContain('John Mwangi');
		expect(plan).toContain('Ask for more time');
		expect(plan).toMatch(/^1\. /m);
		expect(plan).toContain('Facts:');
		expect(plan).toContain('Relief and signature block');
		expect(plan).not.toMatch(/I admit|I confess|nakiri|nakubali kuwa na hatia/i);
		expect(plan).toContain('## Note');
	});

	it('applicability gate keeps similar lines, drops unrelated ones, fails open', () => {
		const line = (id: string, content: string) => ({
			id,
			title: id,
			citation: 'Test',
			url: 'https://example.test',
			content,
			topic: 'general',
			score: 1
		});
		const transfer = line(
			'transfer',
			'Ownership passes only when the seller initiates the transfer on NTSA TIMS.'
		);
		const accident = line(
			'accident',
			'Report accidents to police promptly and seek medical care with P3 forms where injured.'
		);
		const kept = filterApplicablePassages('my car transfer never came after I paid', [
			transfer,
			accident
		]);
		expect(kept.map((p) => p.id)).toEqual(['transfer']);
		// Nothing shared → fail open, never starve drafting.
		expect(filterApplicablePassages('xyz qqq', [transfer, accident]).length).toBe(2);
		expect(filterApplicablePassages('   ', [transfer]).length).toBe(1);
	});

	it('failure floor extracts evidence instead of scripting matters', () => {
		expect(keepDirectives([{ title: 'T', content: 'Do X. Keep A and B.' }])).toEqual([
			'- T: Keep A and B.'
		]);
		expect(keepDirectives([{ title: 'T', content: 'Do X.' }])).toEqual([]);
		const steps = nextStepsFallback(false, ['- T: Keep A and B.']).join('\n');
		expect(steps).toContain('Gather what the sources above say to keep');
		expect(steps).toContain('Keep A and B');
		expect(steps).toContain('Take that file to a paralegal/lawyer');
		expect(nextStepsFallback(false, []).join('\n')).not.toMatch(
			/Land Registrar|Labour|Small Claims|police abstract/i
		);
		expect(authorityChecks([{ title: 'T', citation: 'C' }])).toContain('T (C)');
		expect(authorityChecks([])).not.toMatch(/Labour|Small Claims|police/i);
	});

	it('transfer delay never gets accident steps (live repro)', () => {
		const issue = 'someone hasnt transfferred my car over a year since i fully paid them';
		const logbook = {
			id: 'ke-tims-transfer-steps-note',
			title: 'Motor vehicle logbook transfer on NTSA TIMS',
			citation: 'Traffic Act, Cap. 403; NTSA guidance',
			url: 'https://example.test',
			content:
				'Ownership passes only when the seller initiates the transfer on NTSA TIMS and the buyer accepts it and a new logbook is issued. Keep sale agreement, payment proof, ID copies and TIMS receipts.',
			topic: 'procedure',
			score: 1
		};
		const hirePurchase = {
			id: 'ke-hire-purchase-motor-note',
			title: 'Hire-purchase for motor vehicles — general guidance',
			citation: 'Hire Purchase Act, Cap. 507',
			url: 'https://example.test',
			content:
				'Under hire-purchase you use the vehicle while paying instalments but ownership passes only after the final payment and transfer. Keep the signed agreement, payment schedule and all instalment receipts.',
			topic: 'debt',
			score: 1
		};
		const accident = {
			id: 'ke-accident-note',
			title: 'Road accidents: reporting and police abstract — general guidance',
			citation: 'Traffic Act, Cap. 403',
			url: 'https://example.test',
			content:
				'Report accidents to police promptly, obtain the OB number and later the police abstract, and seek medical care with P3 forms where injured. Take scene photos and witness contacts.',
			topic: 'traffic',
			score: 1
		};
		const applicable = filterApplicablePassages(issue, [logbook, hirePurchase, accident]).map(
			(p) => p.id
		);
		expect(applicable).toEqual(
			expect.arrayContaining(['ke-tims-transfer-steps-note', 'ke-hire-purchase-motor-note'])
		);
		expect(applicable).not.toContain('ke-accident-note');

		const plan = fallbackPlan(
			issue,
			{
				'Was there an agreement that explicitly stated ownership passes upon final payment?': 'Yes'
			},
			[logbook, hirePurchase, accident],
			[],
			[]
		);
		expect(plan).toContain('Way forward');
		expect(plan).toContain('Keep sale agreement, payment proof, ID copies and TIMS receipts');
		expect(plan).not.toMatch(
			/police abstract|medical records|scene\/vehicle|vehicles involved|P3 form/i
		);
		expect(plan).not.toMatch(/Confirm liability|chance to be heard/i);
	});
});

describe('draft instrument gate (instrument, not advice)', () => {
	it('accepts a pleading with parties, numbered paragraphs, and prayers', () => {
		expect(
			isDraftInstrument(
				'IN THE ENVIRONMENT AND LAND COURT AT NAIROBI BETWEEN John Mwangi (Plaintiff) AND Mary Wanjiru (Defendant). 1. The Plaintiff is the registered owner of the parcel. 2. The Defendant encroached on the boundary in May. PARTICULARS OF TRESPASS. PRAYERS: (a) A declaration of ownership; (b) Costs of this suit.'
			)
		).toBe(true);
	});

	it('accepts a demand letter with salutation and demand', () => {
		expect(
			isDraftInstrument(
				'Dear Sir/Madam, I am writing about the notice to vacate dated 20 October 2026. I have paid rent for January and I demand proper notice before any eviction proceedings commence against me. Please confirm receipt of this letter in writing within seven days. Yours faithfully'
			)
		).toBe(true);
	});

	it('rejects second-person instructions about drafting', () => {
		expect(
			isDraftInstrument(
				'You should draft a plaint setting out the parties and the cause of action. You can also file it in the correct court once counsel settles the prayers and verifies the supporting affidavit exhibits.'
			)
		).toBe(false);
	});

	it('rejects thin sections', () => {
		expect(isDraftInstrument('1. The Defendant encroached on the boundary.')).toBe(false);
	});
});

describe('relevance gates (no phrase lists)', () => {
	it('pre-retrieval tripwire passes anything with words in it', () => {
		expect(hasSubstantiveContent('hi')).toBe(false);
		expect(hasSubstantiveContent('???')).toBe(false);
		expect(hasSubstantiveContent('   ')).toBe(false);
		// Single content words pass here; the post-generation gate judges them.
		expect(hasSubstantiveContent('hello')).toBe(true);
		expect(hasSubstantiveContent('habari')).toBe(true);
		// Meta questions pass too — caught post-generation, not by a list.
		expect(hasSubstantiveContent('what can you do')).toBe(true);
	});

	it('accepts short but meaningful queries without overfitting to land', () => {
		expect(hasSubstantiveContent('Property purchase requirements')).toBe(true);
		expect(hasSubstantiveContent('rent')).toBe(true);
		expect(hasSubstantiveContent('unfair dismissal without notice')).toBe(true);
	});

	it('canned conversational floor carries no law and no citations', () => {
		for (const lang of ['en', 'sw'] as const) {
			const text = conversationalAnswer(lang);
			expect(text.trim().length).toBeGreaterThan(20);
			expect(text).not.toMatch(/\[\d+\]/);
			expect(text).not.toMatch(/Cap\.\s*21|Copyright Act|KECOBO/i);
		}
	});

	it('drafted-reply quality bar rejects dumps, markers, and wrong-language text', () => {
		expect(isUsableConversational('Hi! I can help with that. What happened?', 'en')).toBe(true);
		expect(isUsableConversational('Habari! Mimi ni Hakili. Eleza jambo lako.', 'sw')).toBe(true);
		expect(isUsableConversational('', 'en')).toBe(false);
		expect(isUsableConversational('x'.repeat(601), 'en')).toBe(false);
		expect(isUsableConversational('The Act requires notice [1].', 'en')).toBe(false);
		expect(isUsableConversational('Who is the other party?', 'sw')).toBe(false);
		expect(isUsableConversational('Mwenzako ni nani katika jambo hili?', 'en')).toBe(false);
	});

	it('drafted replies respond to the input; failures fall back to null', async () => {
		const good = await draftConversational('hi', 'en', {}, async () => 'Hi there! What happened?');
		expect(good).toBe('Hi there! What happened?');
		const bad = await draftConversational(
			'what can you do',
			'en',
			{},
			async () => 'The Civil Procedure Act requires filing [1].'
		);
		expect(bad).toBeNull();
		const down = draftConversational('hi', 'en', {}, async () => {
			throw new Error('model down');
		});
		await expect(down).rejects.toThrow('model down');
	});
});

describe('follow-up depth without overfitting', () => {
	it('asks for grounded answers with per-claim citations', () => {
		const prompt = buildFollowUpPrompt({
			issue: 'Property purchase requirements',
			facts: [],
			plan: 'None yet.',
			turns: [],
			message: 'Property purchase requirements',
			passages: [
				{
					id: 'p1',
					title: 'Land Act',
					citation: 'Land Act, 2012',
					url: 'https://example.test',
					content: 'Official search and consent rules apply.',
					topic: 'land',
					score: 1
				}
			],
			lang: 'en'
		});
		expect(prompt).toContain('[n]');
		// Generic shape: no land-specific steps hardcoded in the prompt.
		expect(prompt).not.toContain('stamp duty');
		expect(prompt).not.toContain('Land Control Board');
		expect(prompt).not.toContain('structured checklist');
		expect(prompt).not.toContain('step-by-step guide');
		expect(prompt).not.toContain('one requirement or step per line');
	});

	it('citation floor strips law claims the passages do not support', () => {
		const passages = [
			{
				title: 'Land Act',
				citation: 'Land Act, 2012',
				content: 'Official search and consent rules apply before transfer.'
			}
		];
		const hallucinated =
			'The client needs to follow property purchase requirements under the Civil Procedure Act (Cap. 21) for initiating a civil suit [1].';
		const out = verifyCitations(
			verifyQuoteSpans(assignCitations(hallucinated, 'en', passages), passages),
			passages.length
		);
		expect(out).not.toContain('[1]');
		expect(out).toContain('Civil Procedure Act');
	});

	it('procedural how-to answers in action order', () => {
		const prompt = buildFollowUpPrompt({
			issue: 'How do I start a business in Kenya?',
			facts: [],
			plan: 'None yet.',
			turns: [],
			message: 'How do I start a business in Kenya?',
			passages: [],
			lang: 'en'
		});
		expect(prompt).toContain('in the order the user must act');
		expect(prompt).not.toContain('6-10 numbered steps');
		expect(prompt).not.toContain('step-by-step guide');
		expect(prompt).not.toContain('flowing prose');
		expect(prompt).not.toContain('Write the ACTUAL letter now');
	});

	it('non-how-to follow-ups keep the direct answer shape', () => {
		const prompt = buildFollowUpPrompt({
			issue: 'Property purchase requirements',
			facts: [],
			plan: 'None yet.',
			turns: [],
			message: 'Property purchase requirements',
			passages: [],
			lang: 'en'
		});
		expect(prompt).toContain('give the direct position');
		expect(prompt).not.toContain('step-by-step guide');
		expect(prompt).not.toContain('structured checklist');
		expect(prompt).not.toContain('flowing prose');
	});

	it('draft intent still wins over the guide shape', () => {
		const prompt = buildFollowUpPrompt({
			issue: 'How do I start a business in Kenya?',
			facts: [],
			plan: 'None yet.',
			turns: [],
			message: 'Please draft a demand letter for how do I start',
			passages: [],
			lang: 'en'
		});
		expect(prompt).toContain('Write the ACTUAL letter now');
		expect(prompt).not.toContain('step-by-step guide');
	});
});

describe('business formation vs dispute (live repro)', () => {
	it('formation and dispute alike get the neutral spine without passages', () => {
		// The floor never invents BRS/KRA/Small Claims: with no passages it
		// is the neutral spine; with passages it quotes them.
		const formation = fallbackPlan(
			'How do I start a business in Kenya?',
			{ Issue: 'How do I start a business in Kenya?' },
			[],
			[],
			[],
			'ask'
		);
		expect(formation).toContain('Way forward');
		expect(formation).toContain('File dated copies');
		expect(formation).not.toContain('Small Claims');
		expect(formation).not.toContain('BRS');
		const dispute = fallbackPlan(
			'My business partner breached our supply contract',
			{ Issue: 'My business partner breached our supply contract' },
			[],
			[],
			[],
			'ask'
		);
		expect(dispute).toContain('Way forward');
		expect(dispute).not.toContain('Small Claims');
	});

	it('passage evidence names the office, not a script', () => {
		const plan = fallbackPlan(
			'How do I start a business in Kenya?',
			{ Issue: 'How do I start a business in Kenya?' },
			[
				{
					id: 'p1',
					title: 'Business Registration Service',
					citation: 'Companies Act',
					url: 'https://example.test',
					content: 'Reserve a name via eCitizen before trading. Keep the certificate.',
					topic: 'business',
					score: 1
				}
			],
			[],
			[],
			'ask'
		);
		expect(plan).toContain('Keep the certificate');
		expect(plan).not.toContain('Small Claims');
	});

	it('extractive floor quotes the top passages with surviving markers', () => {
		// Live repro: the model draft failed the floor for an eviction
		// question with 6 passages on hand. The extractive floor must be a
		// useful grounded answer, not another fallback.
		const passages = [
			{
				title: 'Eviction process — general guidance',
				citation: 'Kenya Law (new.kenyalaw.org)',
				content:
					'Eviction from residential premises generally requires lawful process with proper notice and, where contested, a court or tribunal order. Tenants facing eviction may seek interim relief.'
			},
			{
				title: 'Unlawful eviction — general guidance',
				citation: 'Kenya Law (new.kenyalaw.org)',
				content:
					'Self-help eviction, including lockouts or disconnection of utilities without a court order, may be unlawful. Affected tenants can seek legal assistance and may recover possession.'
			},
			{
				title: 'Notice to quit: length and form',
				citation: 'Rent Restriction Act, Cap. 296',
				content:
					'Termination notices must follow the agreement and applicable law in writing with clear dates. Defective notices can be challenged. Keep the notice and proof of delivery.'
			}
		];
		const out = extractiveAnswer(passages);
		expect(out).toContain('[1]');
		expect(out).toContain('[2]');
		expect(out).toContain('proper notice');
		// Markers survive the verifiers and coverage clears the 0.15 floor.
		const grounded = verifyCitations(verifyQuoteSpans(out, passages), passages.length);
		expect(grounded).toContain('[1]');
		expect(citationCoverage(grounded, passages)).toBeGreaterThanOrEqual(0.5);
		expect(answerAddressesQuestion(grounded, ['can i be evicted without a notice'])).toBe(true);
	});

	it('header echoes are stripped so title lists fail the floor', () => {
		// Live repro: the model answered with packed header lines. Headers
		// name sources but state no law — stripped, the husk must fail
		// coverage and degrade to retry/extractive instead of shipping.
		const passages = [
			{
				title: 'Eviction from land needs a court order',
				citation: 'Land Act, 2012',
				content:
					'Occupants can only be removed through lawful notice and court process, never by demolitions or force.'
			},
			{
				title: 'Unlawful eviction — general guidance',
				citation: 'Kenya Law (new.kenyalaw.org)',
				content:
					'Self-help eviction, including lockouts or disconnection of utilities without a court order, may be unlawful.'
			},
			{
				title: 'Business Premises Rent Tribunal — general guidance',
				citation:
					'Landlord and Tenant (Shops, Hotels and Catering Establishments) Act; Tribunal guidance',
				content:
					'The Business Premises Rent Tribunal resolves disputes over controlled business premises.'
			}
		];
		const titleList =
			'Eviction from land needs a court order — Land Act, 2012. Eviction process — general guidance — Kenya Law (new.kenyalaw.org). [3] Business Premises Rent Tribunal — general guidance — Landlord and Tenant (Shops, Hotels and Catering Establishments) Act; Tribunal guidance. Confirm whether the law is still current.';
		const stripped = stripPassageHeaderEchoes(titleList, passages);
		expect(stripped).not.toContain('Eviction from land needs a court order — Land Act, 2012');
		expect(stripped).not.toContain('Business Premises Rent Tribunal — general guidance');
		// The husk keeps the confirm footer at most: no supported law claim.
		expect(citationCoverage(stripped, passages)).toBeLessThan(0.15);
		// Header glued to its content sentence: header cut, sentence kept.
		const glued =
			'[2] Unlawful eviction — general guidance — Kenya Law (new.kenyalaw.org)\nSelf-help eviction, including lockouts without a court order, may be unlawful.';
		const unglued = stripPassageHeaderEchoes(glued, passages);
		expect(unglued).not.toContain('Unlawful eviction — general guidance');
		expect(unglued).toContain('Self-help eviction');
		// A genuine cited sentence is never stripped.
		const genuine = 'Occupants can only be removed through lawful notice and court process [1].';
		expect(stripPassageHeaderEchoes(genuine, passages)).toContain('Occupants can only be removed');
	});
});
