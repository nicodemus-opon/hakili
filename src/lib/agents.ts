/** Client-safe agent definitions. No server imports (QVAC/pg) here. */

export const AGENT_IDS = ['ask', 'check', 'draft'] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export function isAgentId(v: unknown): v is AgentId {
	return v === 'ask' || v === 'check' || v === 'draft';
}

export function normalizeAgentId(v: unknown): AgentId {
	return isAgentId(v) ? v : 'ask';
}

export interface AgentMeta {
	id: AgentId;
	label: string;
	shortLabel: string;
	description: string;
	placeholder: string;
	emptyTitle: string;
	emptyDescription: string;
	needsDocsHint: string | null;
}

export const AGENTS: Record<AgentId, AgentMeta> = {
	ask: {
		id: 'ask',
		label: 'Research',
		shortLabel: 'Research',
		description: 'Issues, law and strategy',
		placeholder: 'e.g. Dismissal without notice…',
		emptyTitle: 'New research',
		emptyDescription: 'Describe the facts. Get a memo with sources.',
		needsDocsHint: null
	},
	check: {
		id: 'check',
		label: 'Review',
		shortLabel: 'Review',
		description: 'Files and clauses',
		placeholder: 'e.g. Review this agreement… (attach file)',
		emptyTitle: 'Review a file',
		emptyDescription: 'Attach the file. Get clause notes with sources.',
		needsDocsHint: 'Attach the file for a full review.'
	},
	draft: {
		id: 'draft',
		label: 'Draft',
		shortLabel: 'Draft',
		description: 'Letters and pleadings',
		placeholder: 'e.g. Draft a demand for KES 50,000…',
		emptyTitle: 'New draft',
		emptyDescription: 'Give the facts and the other side. Get a draft with sources.',
		needsDocsHint: null
	}
};

export function agentMeta(id: unknown): AgentMeta {
	return AGENTS[normalizeAgentId(id)];
}
