/** Plan generator: full pass + targeted section repair + citation verification. */
import { completeText, initAgent, streamText } from '../llm.ts';
import { translateTextToSwahili } from '../language.ts';
import { CONTEXT_BUDGETS } from '../context.ts';
import { isDegenerateText } from '../interview/loop.ts';
import { PLAN_HEADINGS, PLAN_OPTIONAL, PLAN_REQUIRED, stripSourcesSection } from './headings.ts';
import {
	assignCitations,
	citationCoverage,
	groundingScore,
	hasSafetyFooter,
	isThinPlan,
	packNumbered,
	packPassages,
	pruneOptionalSections,
	selectRepairPassages,
	splitSections,
	stripUnsafeDisclaimer,
	uncitedSections,
	verifyCitations,
	verifyQuoteSpans,
	weakSections
} from './validator.ts';
import type { Passage, ResponseLang, UserPassage } from '../types.ts';
import type { Trace } from '../observability.ts';
import { event, mark } from '../observability.ts';
import { agentConfig, agentAllHeadings, agentRequiredHeadings } from '../agents.ts';

export interface GeneratePlanOptions {
	signal?: AbortSignal;
	trace?: Trace;
	agentId?: unknown;
	/** Preview deltas from the drafting passes (not the verified final text). */
	onToken?: (delta: string) => void;
	/** Lifecycle hook for SSE status events. */
	onStage?: (stage: string) => void;
}

function langDirective(lang: ResponseLang): string {
	return lang === 'sw'
		? 'Respond ENTIRELY in Kiswahili (Kiswahili sanifu) — even though the user wrote in English. Every sentence must be Kiswahili; never write any part in English. Keep legal titles, citations, and filenames in their original language. Write as counsel to counsel: precise, no basic explanations.'
		: 'Respond entirely in English. Write for an advocate. Be direct. Refer to the instructing facts in third person ("The client instructs…", "The file shows…"), never as "you".';
}

function buildPrompt(
	issue: string,
	answers: Record<string, string>,
	context: string,
	userContext: string,
	lang: ResponseLang,
	simple: boolean,
	agentDirective = '',
	requiredOverride?: string[],
	optionalOverride?: string[]
): string {
	const required = requiredOverride ?? PLAN_REQUIRED[lang] ?? PLAN_HEADINGS[lang];
	const optional = optionalOverride ?? PLAN_OPTIONAL[lang] ?? [];
	const unavailable = lang === 'sw' ? 'Hayajulikani.' : 'Not available.';
	return `You are Hakili, an offline assistant for an advocate in Kenya. Write for an advocate. Be direct. ${langDirective(lang)}${agentDirective} Based on counsel's instructions, the answers, the verified legal passages below, and the client file, produce a counsel-grade memo. Use these EXACT headings, in this order:

${required.join('\n')}

You may ALSO include any of these headings, in position, ONLY when you have something case-specific to write under it (a real deadline, office, or time limit from the passages or answers; a real risk grounded in the facts):
${optional.join('\n') || '(none)'}
If you have nothing specific for one, OMIT the heading entirely — never write "${unavailable}" and never pad with generic advice.

${simple ? `Do not repeat the same sentence twice and do not get stuck in a loop. Ordinary words (na, ya, kwa, the, and) will naturally reappear — that is fine. Prefer a short precise sentence over "${unavailable}". Use "${unavailable}" only when you truly have nothing to say for that section.` : `Do not repeat the same sentence twice and do not get stuck in a loop. Ordinary words (na, ya, kwa, the, and) will naturally reappear — that is fine. Only describe facts stated in COUNSEL'S INSTRUCTIONS, ANSWERS, or CLIENT FILE — never invent names, places, beats, platforms, amounts, or events. Names, dates, amounts, and places that appear verbatim in the CLIENT FILE are not inventions: quote them with filename attribution (e.g. "the tenancy agreement states ..."). Be specific, give the other side, flag limitation, and do not invent conclusions. Under ## Next Steps (or its agent equivalent), cover the way forward under a "Way forward — do these in order:" heading (forum, filing, service, evidence to add, demands or amendments). Under ## Note (or its agent equivalent), confirm the authorities are still current and apply independent professional judgment before filing, serving, or advising - never use the word "currency" (it is confused with money); say "still current" instead. Every section except the Note MUST contain at least one [n] citation marker pointing at a VERIFIED LEGAL PASSAGE below whose content supports that exact sentence — a section with no markers will be rejected and rewritten; file-descriptive steps need no marker. Cite pinpoint provisions where the passage supports them. Under Authorities, state the controlling provisions and what to confirm. When CLIENT FILE lists files, acknowledge them by filename and never state that no documents were provided. Do not omit any section; if information is unavailable, write "${unavailable}" under that heading. Do not add a Sources, References, Vyanzo, or Marejeo section — sources are displayed separately.`}

COUNSEL'S INSTRUCTIONS:
${issue}

ANSWERS:
${Object.entries(answers)
	.map(([k, v]) => `- ${k}: ${v}`)
	.join('\n')}

VERIFIED LEGAL PASSAGES:
${simple ? context.slice(0, 4000) : context}

Client files (quote filenames when relevant):
${userContext}

FINAL CHECK before answering: every sentence stating Kenyan LAW ends with an [n] marker (e.g. [1]) pointing at a passage above that supports it; sentences about the user's own story need no marker.`;
}

function buildRepairPrompt(
	issue: string,
	answers: Record<string, string>,
	context: string,
	lang: ResponseLang,
	headings: string[],
	repairDirective = ''
): string {
	return `You are Hakili, an offline research and drafting assistant for an advocate of the High Court of Kenya. ${langDirective(lang)} Rewrite ONLY the following section(s) of a counsel memo. For each heading below, write precise replacements grounded in the instructions, answers, and passages, including the counterargument where relevant. Never invent names, places, amounts, or events. Sentences stating the LAW must end with an [n] citation marker using the passage numbers shown below — but only when that passage's content supports the exact sentence (unsupported markers are stripped automatically, so cite precisely, not decoratively).${repairDirective}

COUNSEL'S INSTRUCTIONS:
${issue}

ANSWERS:
${Object.entries(answers)
	.map(([k, v]) => `- ${k}: ${v}`)
	.join('\n')}

VERIFIED LEGAL PASSAGES:
${context.slice(0, 4000)}

Rewrite these sections now, using each EXACT heading followed by its replacement body:
${headings.join('\n')}`;
}

function spliceSections(
	original: string,
	lang: ResponseLang,
	repair: string,
	headingsOverride?: string[]
): string {
	const required = headingsOverride ?? PLAN_HEADINGS[lang];
	let out = original;
	for (const h of required) {
		const rStart = repair.indexOf(h);
		if (rStart === -1) continue;
		let rEnd = repair.length;
		for (const n of required) {
			if (n === h) continue;
			const idx = repair.indexOf(n, rStart + h.length);
			if (idx !== -1 && idx < rEnd) rEnd = idx;
		}
		const newBody = repair.slice(rStart + h.length, rEnd).trim();
		if (!newBody || newBody.split(/\s+/).length < 8) continue;
		const oStart = out.indexOf(h);
		if (oStart === -1) {
			out += `\n\n${h}\n${newBody}`;
			continue;
		}
		let oEnd = out.length;
		for (const n of required) {
			if (n === h) continue;
			const idx = out.indexOf(n, oStart + h.length);
			if (idx !== -1 && idx < oEnd) oEnd = idx;
		}
		out = `${out.slice(0, oStart + h.length)}\n${newBody}\n${out.slice(oEnd)}`.trim() + '\n';
	}
	return out.trim();
}

/** Draft-instrument gate: the Draft/Rasimu section must be the ACTUAL
 * instrument (pleading, affidavit, or demand letter) — caption/parties,
 * numbered paragraphs, prayers or demand, verification/signature — never
 * second-person instructions about drafting one ("You should draft…").
 * Failing sections join the repair set with a draft-specific instruction
 * instead of shipping meta-advice as the instrument. */
const DRAFT_META_ADVICE =
	/you should (draft|file|write|prepare|consider)|andaa (rasimu|maelezo)|you can also (draft|file)|counsel should/i;
const DRAFT_INSTRUMENT_MARK =
	/^\s*\d+[.)]\s+\S|between\b.{0,80}\band\b|in the matter|republic of kenya|prayers?(\s+sought)?|orders?\s+sought|verif|affirmed|sworn|drawn by|dated at|\bsigned\b|dear\s+(sir|madam)|mpendwa|particulars of/i;

export function isDraftInstrument(body: string): boolean {
	const t = body.trim();
	if (t.split(/\s+/).filter(Boolean).length < 30) return false;
	if (DRAFT_META_ADVICE.test(t)) return false;
	return DRAFT_INSTRUMENT_MARK.test(t);
}

export async function generatePlan(
	issue: string,
	answers: Record<string, string>,
	passages: Passage[],
	userPassages: UserPassage[] = [],
	lang: ResponseLang = 'en',
	opts: GeneratePlanOptions = {}
): Promise<string> {
	await initAgent();
	// Kiswahili containment (same doctrine as the interview batch): the small
	// model reasons, grounds, and shapes far better in English, so the memo
	// is ALWAYS drafted in English and translated to Kiswahili at the end —
	// one narrow task. The toggle decides the output language, never the
	// drafting language.
	const wantSw = lang === 'sw';
	// Draft language is always English (containment); the toggle only decides the final translation.
	const genLang: ResponseLang = 'en';
	const trace = opts.trace;
	const cfg = agentConfig(opts.agentId);
	const userContext =
		userPassages.length > 0
			? userPassages
					.map((p, i) => `[Client File ${i + 1}: ${p.filename}]\n${p.content}`)
					.join('\n\n')
			: 'None provided.';
	const required = agentRequiredHeadings(cfg.id, genLang);
	const allHeadings = agentAllHeadings(cfg.id, genLang);
	const optional = allHeadings.filter((h) => !(required as string[]).includes(h));
	const unavailable = 'Not available.';
	const signal = opts.signal;

	// Defensive prompt budgeting: the local model runs a 4k context shared
	// with the prediction budget. All budgets live in `context.ts` so every
	// prompt packs the smallest high-signal set (Select) instead of ad-hoc
	// slices. User documents are truncated last — they carry the user's own
	// evidence. Packing cuts at sentence/word boundaries.
	// Check gets a larger user-doc window (contract text matters most).
	const userBudget = cfg.userDocBudget ?? CONTEXT_BUDGETS.PLAN_USER_FIT;
	const context = packPassages(passages, CONTEXT_BUDGETS.PLAN_FULL);
	const fitContext = packPassages(passages, CONTEXT_BUDGETS.PLAN_FIT);
	const fitUserContext = userContext.slice(0, userBudget);

	async function runPrompt(
		prompt: string,
		predict: number,
		sampling: { temp: number; repeat_penalty: number; frequency_penalty: number },
		task: 'plan' | 'repair' = 'plan'
	): Promise<string> {
		if (signal?.aborted) throw new Error('Plan generation aborted');
		if (!opts.onToken) {
			return completeText(prompt, { predict, ...sampling, signal, model: task }, trace);
		}
		const gen = streamText(prompt, { predict, ...sampling, signal, model: task }, trace);
		while (true) {
			const r = await gen.next();
			if (!r.done && r.value) {
				try {
					opts.onToken(r.value);
				} catch {
					/* preview hook must never break generation */
				}
			}
			if (r.done) return String(r.value ?? '');
		}
	}

	async function runPromptOverflowSafe(
		prompt: string,
		predict: number,
		sampling: { temp: number; repeat_penalty: number; frequency_penalty: number },
		trimmedPrompt: string,
		trimmedPredict: number
	): Promise<string> {
		try {
			return await runPrompt(prompt, predict, sampling);
		} catch (e) {
			if (e instanceof Error && /context overflow/i.test(e.message)) {
				if (trace) event(trace, 'plan:overflow-retry', 'trimmed-context');
				return await runPrompt(trimmedPrompt, trimmedPredict, sampling);
			}
			throw e;
		}
	}

	const needsRetry = (t: string) =>
		isDegenerateText(t) || isThinPlan(t, genLang, allHeadings, required);
	const sampling = {
		temp: 0.7,
		repeat_penalty: 1.18,
		frequency_penalty: 0.25
	};
	const fullPrompt = buildPrompt(
		issue,
		answers,
		context,
		userContext.slice(0, userBudget),
		genLang,
		false,
		cfg.planDirective,
		required,
		optional
	);
	const fitPrompt = buildPrompt(
		issue,
		answers,
		fitContext,
		fitUserContext,
		genLang,
		false,
		cfg.planDirective,
		required,
		optional
	);
	opts.onStage?.('drafting');
	let out = await runPromptOverflowSafe(fullPrompt, 2048, sampling, fitPrompt, 1024);
	if (trace) event(trace, 'plan:pass1', `weak=${weakSections(out, genLang, allHeadings).length}`);

	// Targeted repair: regenerate weak sections instead of the whole plan.
	// Isolate: repair sees only the passages most relevant to the weak
	// bodies (original `[n]` numbers preserved), so one noisy source cannot
	// poison the fix (clash) and the prompt stays small (distraction).
	// Citation pressure: sections whose factual claims no passage supports
	// join the weak set, so repair must ground or cite them. Check-agent
	// nuance: sentences quoting the user's own document (amounts, dates,
	// clause wording) are supported by the user-doc corpus, not the law —
	// without that, every Risky Clause quoting "Kshs 22,000" flags as
	// uncited and repair can never converge. Document Reviewed is
	// descriptive (filename + what it covers), never a legal claim.
	const docSupport = userPassages.map((u) => ({ content: u.content }));
	// Check-agent nuance: Situation Summary + Document Reviewed describe the
	// user's own story and file — paraphrases ("eviction" for "re-enter") and
	// doc-specific amounts never match the law verbatim, so citation pressure
	// on them loops until degeneration. Risky Clauses keeps pressure (with
	// the user doc as support, so direct quotes pass).
	const citationExempt =
		cfg.id === 'check'
			? required.filter((h) =>
					/Brief Facts|Maelezo Mafupi|Document Reviewed|Hati Iliyopitilizwa/i.test(h)
				)
			: [];
	const citationWeak = uncitedSections(
		out,
		genLang,
		passages,
		allHeadings,
		docSupport,
		citationExempt
	);
	// Draft-only gate: the Draft/Rasimu section must read as the actual
	// instrument (caption, numbered paragraphs, prayers/signature), never
	// second-person instructions about drafting one. Failing sections join
	// the repair set with a draft-specific instruction below.
	const draftHeading = allHeadings.find((h) => /^## (Draft|Rasimu)\s*$/.test(h));
	const draftWeak =
		cfg.id === 'draft' && draftHeading
			? (() => {
					const body =
						splitSections(out, genLang, allHeadings).find((s) => s.heading === draftHeading)
							?.body ?? '';
					return body && !isDraftInstrument(body) ? [draftHeading] : [];
				})()
			: [];
	if (needsRetry(out) || citationWeak.length > 0 || draftWeak.length > 0) {
		const weak = [
			...new Set([...weakSections(out, genLang, allHeadings), ...citationWeak, ...draftWeak])
		];
		if (trace && citationWeak.length > 0)
			event(trace, 'plan:citation-weak', citationWeak.join(','));
		if (trace && draftWeak.length > 0) event(trace, 'plan:draft-weak', draftWeak.join(','));
		if (weak.length > 0 && weak.length < required.length) {
			const repairDirective =
				draftWeak.length > 0
					? ' For the Draft section, write the ACTUAL instrument (pleading, affidavit, or demand letter): title, parties, numbered paragraphs, prayers and verification where applicable. Quote only instructed facts. Never write second-person instructions such as "You should draft...".'
					: '';
			try {
				const bodies = splitSections(out, genLang, allHeadings)
					.filter((s) => weak.includes(s.heading))
					.map((s) => `${s.heading}\n${s.body}`);
				const isolated = packNumbered(
					selectRepairPassages(passages, bodies, CONTEXT_BUDGETS.REPAIR_PASSAGES),
					CONTEXT_BUDGETS.REPAIR_BUDGET
				);
				opts.onStage?.('repairing');
				const repair = await runPrompt(
					buildRepairPrompt(issue, answers, isolated, genLang, weak, repairDirective),
					1024,
					{
						temp: 0.7,
						repeat_penalty: 1.18,
						frequency_penalty: 0.25
					},
					'repair'
				);
				const spliced = spliceSections(out, genLang, repair, allHeadings);
				if (!isDegenerateText(spliced)) {
					out = spliced;
					if (trace) event(trace, 'plan:repair', `sections=${weak.length}`);
				}
			} catch {
				/* keep the pass-1 output; the simple retry below still applies */
			}
		}
	}
	if (needsRetry(out)) {
		// Retry with a shorter task: small models sustain the simple prompt
		// far better than the full one. Uses the fitted context so this
		// retry cannot overflow either.
		const simplePrompt = buildPrompt(
			issue,
			answers,
			fitContext,
			fitUserContext,
			genLang,
			true,
			cfg.planDirective,
			required,
			optional
		);
		out = await runPrompt(simplePrompt, 2048, {
			temp: 0.6,
			repeat_penalty: 1.25,
			frequency_penalty: 0.4
		});
		if (trace)
			event(trace, 'plan:pass2-simple', `thin=${isThinPlan(out, genLang, allHeadings, required)}`);
	}
	if (needsRetry(out)) {
		throw new Error('Plan generation degenerated; please try again.');
	}
	const needed = required;
	for (const h of needed) {
		// The safety net owns the professional note: never backfill it with
		// "Not available.", or the memo ships two Professional Note headings.
		// Optional sections are never backfilled — an omitted deadlines or
		// risks section is restraint, not a gap.
		if (h === needed[needed.length - 1]) continue;
		if (!out.includes(h)) out += `\n\n${h}\n${unavailable}`;
	}
	out = stripSourcesSection(out);
	// Echo cut: with no attached documents the prompt shows
	// "USER-PROVIDED DOCUMENTS: None provided." and the model sometimes
	// copies that line as the attachment list. Drop a bare echo under the
	// Attachments heading — the section reads fine without it.
	if (userPassages.length === 0) {
		out = out.replace(
			/(## Attachments|## Viambatisho)([^\n]*\n+)\s*(?:attach(?:ments)?\s*:\s*)?None provided\.?\s*\n/i,
			'$1$2'
		);
	}
	// De-dupe: a model-written weak Professional Note plus the safety footer below
	// it reads as two Professional Note sections. Strip unsafe ones first.
	out = stripUnsafeDisclaimer(out, genLang, allHeadings);
	// Deterministic citation floor: propose `[n]` for every supported but
	// uncited sentence (the model emits none on its own). The verifier below
	// strips anything unsupported, so only provable claims keep markers.
	opts.onStage?.('citing');
	out = assignCitations(out, genLang, passages, allHeadings);
	out = verifyCitations(out, passages.length);
	out = verifyQuoteSpans(out, passages);
	out = pruneOptionalSections(out, genLang, allHeadings);
	if (trace)
		event(trace, 'plan:prune', `headings=${allHeadings.filter((h) => out.includes(h)).length}`);
	// Safety net: the model sometimes drops the Professional Note during
	// repair. Re-append it rather than shipping a memo with no professional note.
	if (!hasSafetyFooter(out, genLang, allHeadings)) {
		const safety =
			'## Note\nConfirm the authorities are still current, check fee and limitation exposure, and apply independent professional judgment before filing, serving, or advising the client.';
		out = `${out.trimEnd()}\n\n${safety}\n`;
		if (trace) event(trace, 'plan:safety-repair', 'disclaimer-reappended');
	}
	if (trace) {
		mark(trace, 'planMs');
		event(
			trace,
			'plan:grounding',
			`score=${groundingScore(out, passages).toFixed(2)} coverage=${citationCoverage(out, passages).toFixed(2)}`
		);
	}
	if (wantSw) {
		opts.onStage?.('translating');
		return await translateMemoToSwahili(out, allHeadings, { signal, trace });
	}
	return out;
}

/** English heading → Kiswahili heading for the translate-at-end step. */
const EN_TO_SW_HEADING: Record<string, string> = {
	'## Facts': '## Ukweli',
	'## Issues': '## Masuala',
	'## Law': '## Sheria',
	'## Analysis': '## Uchambuzi',
	'## Risks': '## Hatari',
	'## Next Steps': '## Hatua',
	'## Authorities': '## Mamlaka',
	'## Note': '## Ujumbe',
	'## Deadlines': '## Tarehe',
	'## Urgent': '## Dharura',
	'## Document': '## Hati',
	'## Clauses': '## Vifungu',
	'## Draft': '## Rasimu',
	'## Attachments': '## Viambatisho'
};

/**
 * Translate a finished English memo to Kiswahili, section by section in
 * document order (each call stays small enough for the 4k context).
 * Headings swap via the map above; bodies cross the model. A section whose
 * translation fails verification keeps its English original — content is
 * never dropped — and the trace records it. Never throws.
 */
async function translateMemoToSwahili(
	out: string,
	headingsEn: string[],
	opts: { signal?: AbortSignal; trace?: Trace } = {}
): Promise<string> {
	try {
		const found = headingsEn
			.map((h) => ({ heading: h, start: out.indexOf(h) }))
			.filter((s) => s.start !== -1)
			.sort((a, b) => a.start - b.start);
		const parts: string[] = [];
		const preamble = (found.length > 0 ? out.slice(0, found[0]!.start) : out).trim();
		if (preamble) {
			parts.push((await translateTextToSwahili(preamble, opts)) ?? preamble);
		}
		for (let i = 0; i < found.length; i++) {
			const cur = found[i]!;
			const end = i + 1 < found.length ? found[i + 1]!.start : out.length;
			const body = out.slice(cur.start + cur.heading.length, end).trim();
			const swHeading = EN_TO_SW_HEADING[cur.heading] ?? cur.heading;
			if (!body) {
				parts.push(swHeading);
				continue;
			}
			const translated = await translateTextToSwahili(body, opts);
			if (!translated && opts.trace)
				event(opts.trace, 'plan:sw-fallback', `kept-english:${cur.heading}`);
			parts.push(`${swHeading}\n${translated ?? body}`);
		}
		const merged = parts.join('\n\n').trim();
		return merged ? `${merged}\n` : out;
	} catch {
		return out;
	}
}

export async function savePlan(
	issue: string,
	answers: Record<string, string>,
	plan: string
): Promise<void> {
	const { pool } = await import('../../db.ts');
	await pool.query('INSERT INTO plans (issue, answers, plan) VALUES ($1, $2, $3)', [
		issue,
		JSON.stringify(answers),
		plan
	]);
}
