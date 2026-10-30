export interface ChatQuestion {
	id: string;
	text: string;
	type: 'text' | 'single_choice' | 'multi_choice' | 'boolean' | 'date';
	options?: string[];
	required?: boolean;
	help?: string;
	needsDocs?: boolean;
}

export interface ChatPassage {
	title: string;
	citation: string;
	url: string;
}

export interface ChatUserSource {
	filename: string;
	content: string;
}

export interface ChatFollowUp {
	q: string;
	a: string;
	passages: ChatPassage[];
	executionPlan?: import('./server/agent/planner/types.ts').ExecutionPlan;
	stepStatus?: Record<string, import('./server/agent/planner/types.ts').PlanStepStatus>;
	subagents?: import('./server/agent/planner/types.ts').SubagentRun[];
}

export interface ChatSession {
	id: string;
	title: string;
	updatedAt: number;
	issue: string;
	langPref: 'en' | 'sw';
	agentId: 'ask' | 'check' | 'draft';
	projectId: string | null;
	questions: ChatQuestion[];
	answers: Record<string, string | string[]>;
	custom: Record<string, string>;
	idx: number;
	plan: string;
	passages: ChatPassage[];
	userSources: ChatUserSource[];
	followups: ChatFollowUp[];
}

const KEY = 'hakili:sessions:v1';
const MAX = 30;

function readable(): boolean {
	return typeof localStorage !== 'undefined';
}

export function loadSessions(): ChatSession[] {
	if (!readable()) return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as Array<ChatSession & { agentId?: unknown }>;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((s) => s && typeof s.id === 'string')
			.map((s) => ({
				...s,
				projectId:
					typeof (s as { projectId?: unknown }).projectId === 'string'
						? ((s as { projectId?: string }).projectId ?? null)
						: null,
				langPref:
					(s as { langPref?: unknown }).langPref === 'sw' ? ('sw' as const) : ('en' as const),
				agentId: (s.agentId === 'check' || s.agentId === 'draft' ? s.agentId : 'ask') as
					'ask' | 'check' | 'draft'
			}))
			.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
			.slice(0, MAX);
	} catch {
		return [];
	}
}

export function persistSession(session: ChatSession): ChatSession[] {
	if (!readable()) return [];
	const list = loadSessions().filter((s) => s.id !== session.id);
	list.unshift(session);
	const trimmed = list.slice(0, MAX);
	try {
		localStorage.setItem(KEY, JSON.stringify(trimmed));
	} catch {
		/* storage full or unavailable */
	}
	return trimmed;
}

export function deleteSession(id: string): ChatSession[] {
	if (!readable()) return [];
	const list = loadSessions().filter((s) => s.id !== id);
	try {
		localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		/* ignore */
	}
	return list;
}

export function newSessionId(): string {
	try {
		return crypto.randomUUID();
	} catch {
		return `s-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	}
}

export function sessionTitle(issue: string): string {
	const t = issue.trim().replace(/\s+/g, ' ');
	if (!t) return 'New chat';
	return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}
