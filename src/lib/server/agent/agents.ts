/** Server agent configs: interview focus, output template, prompt directives. */
import type { ResponseLang } from './types.ts';
import { PLAN_HEADINGS, PLAN_OPTIONAL, PLAN_REQUIRED } from './plan/headings.ts';
import type { Dimension } from './interview/facts.ts';

export type AgentId = 'ask' | 'check' | 'draft';

export function isAgentId(v: unknown): v is AgentId {
	return v === 'ask' || v === 'check' || v === 'draft';
}

export function normalizeAgentId(v: unknown): AgentId {
	return isAgentId(v) ? v : 'ask';
}

export interface AgentConfig {
	id: AgentId;
	/** Interview dimension priority: earlier = asked first. */
	dimensionOrder: Dimension[];
	/** Extra instruction appended to the batch-draft prompt. */
	interviewDirective: string;
	/** Extra instruction appended to the plan prompt. */
	planDirective: string;
	/** Extra instruction for follow-ups. */
	followupDirective: string;
	/** Retrieval query boost terms appended to the query. */
	retrievalBoost: string;
	/** Larger user-doc budget for doc-heavy agents. */
	userDocBudget: number | null;
	/** Dynamic-planner allowlist: executor rejects any other tool. */
	allowedTools: string[];
	/** Appended to the planner prompt so the model picks agent-correct steps. */
	plannerFragment: string;
	/** Max parallel subagent fan-out for this agent. */
	maxParallel: number;
}

const ASK: AgentConfig = {
	id: 'ask',
	dimensionOrder: ['party', 'when_where_proof', 'steps_outcome', 'docs_deadline'],
	interviewDirective:
		' Focus intake on parties, issues, facts, proof, relief, forum, and deadlines.',
	planDirective:
		' Research memo. State the issues, cite the governing provisions, apply them to the facts, then give the other side.',
	followupDirective:
		' Give the position first with cites, then the other side, then what to confirm.',
	retrievalBoost: 'section order rule precedent holding remedy procedure limitation jurisdiction',
	userDocBudget: 1500,
	allowedTools: [
		'extractState',
		'searchLegal',
		'searchUserDocs',
		'draftQuestions',
		'generatePlan',
		'repairSections',
		'verifyCitations',
		'fallbackPlan'
	],
	plannerFragment:
		' Ask is the generalist: retrieve law first, then extract state, then draft one question per missing dimension. Repair only sections the verifier flags.',
	maxParallel: 2
};

const CHECK: AgentConfig = {
	id: 'check',
	dimensionOrder: ['docs_deadline', 'when_where_proof', 'party', 'steps_outcome'],
	interviewDirective:
		' Document review. The file should be attached. Cover parties, key clauses, amounts, dates, and notice or termination terms.',
	planDirective:
		' Document review. In Document, name the file and what it covers. In Clauses, go through each numbered clause in order, quote the key term, and start each clause with its rating in bold (e.g. "**High risk** — ..."). Quote the file where relevant and ground legal points in the passages. Close with risks and what to amend.',
	retrievalBoost: 'agreement contract clause signature notice termination demand payment',
	followupDirective:
		' Compare what the file says against the law, quote the clause, and state the fix.',
	userDocBudget: 6000,
	allowedTools: [
		'extractState',
		'searchLegal',
		'searchUserDocs',
		'splitClauses',
		'draftQuestions',
		'generatePlan',
		'repairSections',
		'verifyCitations',
		'requestDocs',
		'fallbackPlan'
	],
	plannerFragment:
		' Check is doc-first: always searchUserDocs before generatePlan. Without attached files, plan requestDocs and doc-focused draftQuestions instead of a full plan. With files, splitClauses first, then generatePlan with Document Reviewed + Risky Clauses headings.',
	maxParallel: 4
};

const DRAFT: AgentConfig = {
	id: 'draft',
	dimensionOrder: ['party', 'steps_outcome', 'docs_deadline', 'when_where_proof'],
	interviewDirective:
		' Drafting. Cover parties, the claim or response, admitted and disputed facts, relief, attachments, forum, and deadlines.',
	planDirective:
		' Drafting. Include a ready-to-file draft with title, parties, numbered paragraphs, prayers, and signature block where needed. Follow with attachments and filing steps. Do not invent facts.',
	retrievalBoost: 'pleading plaint defence affidavit prayers verification service filing demand',
	followupDirective: ' Offer revised wording on request and flag admissions risk.',
	userDocBudget: 4000,
	allowedTools: [
		'extractState',
		'searchLegal',
		'searchUserDocs',
		'draftQuestions',
		'generatePlan',
		'admissionGuard',
		'repairSections',
		'verifyCitations',
		'fallbackPlan'
	],
	plannerFragment: ' Draft first, then run admissionGuard to drop invented admissions.',
	maxParallel: 2
};

const CONFIGS: Record<AgentId, AgentConfig> = { ask: ASK, check: CHECK, draft: DRAFT };

export function agentConfig(id: unknown): AgentConfig {
	return CONFIGS[normalizeAgentId(id)];
}

/**
 * Per-agent memo headings. Ask is the research memo; Check foregrounds
 * the file and clause risks; Draft foregrounds the draft instrument.
 * Optional sections stay conditional (never backfilled with filler).
 */
export function agentRequiredHeadings(agent: AgentId, lang: ResponseLang): string[] {
	if (agent === 'check') {
		return lang === 'sw'
			? ['## Ukweli', '## Hati', '## Vifungu', '## Sheria', '## Hatua', '## Mamlaka', '## Ujumbe']
			: [
					'## Facts',
					'## Document',
					'## Clauses',
					'## Law',
					'## Next Steps',
					'## Authorities',
					'## Note'
				];
	}
	if (agent === 'draft') {
		return lang === 'sw'
			? [
					'## Ukweli',
					'## Masuala',
					'## Sheria',
					'## Rasimu',
					'## Viambatisho',
					'## Hatua',
					'## Ujumbe'
				]
			: [
					'## Facts',
					'## Issues',
					'## Law',
					'## Draft',
					'## Attachments',
					'## Next Steps',
					'## Note'
				];
	}
	return PLAN_REQUIRED[lang] ?? PLAN_HEADINGS[lang];
}

export function agentAllHeadings(agent: AgentId, lang: ResponseLang): string[] {
	const required = agentRequiredHeadings(agent, lang);
	const optional = PLAN_OPTIONAL[lang] ?? [];
	return [...required.slice(0, -1), ...optional, required[required.length - 1]];
}
