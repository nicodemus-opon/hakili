<script lang="ts">
	import { onMount } from 'svelte';
	import { toggleMode } from 'mode-watcher';
	import SunIcon from 'phosphor-svelte/lib/SunIcon';
	import MoonIcon from 'phosphor-svelte/lib/MoonIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import FileTextIcon from 'phosphor-svelte/lib/FileTextIcon';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '#lib/components/ui/select/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import * as Message from '#lib/components/ui/message/index.js';
	import * as Bubble from '#lib/components/ui/bubble/index.js';
	import * as MessageScroller from '#lib/components/ui/message-scroller/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import * as Item from '#lib/components/ui/item/index.js';
	import CitedMarkdown from '#lib/components/cited-markdown.svelte';
	import AttachmentDialog from '#lib/components/attachment-dialog.svelte';
	import DocumentList from '#lib/components/document-list.svelte';
	import ChatSidebar from '#lib/components/chat-sidebar.svelte';
	import AppLogo from '#lib/components/app-logo.svelte';
	import ProjectDialog from '#lib/components/project-dialog.svelte';
	import ProjectSearch from '#lib/components/project-search.svelte';
	import SourceLinks from '#lib/components/source-links.svelte';
	import PromptComposer from '#lib/components/prompt-composer.svelte';
	import InterviewQuestion from '#lib/components/interview-question.svelte';
	import ThinkingLine from '#lib/components/thinking-line.svelte';
	import PlanView from '#lib/components/plan-view.svelte';
	import SubagentView from '#lib/components/subagent-view.svelte';
	import type {
		ExecutionPlan,
		PlanStepStatus,
		SubagentRun
	} from '#lib/server/agent/planner/types.ts';
	import type { UploadedDoc } from '#lib/filepond.ts';
	import {
		deleteSession as removeStoredSession,
		loadSessions,
		newSessionId,
		persistSession,
		sessionTitle,
		type ChatSession
	} from '#lib/chat-history.ts';
	import {
		deleteProject as removeStoredProject,
		isProjectDoc,
		loadProjects,
		newProjectId,
		persistProject,
		projectTitle,
		syncProjectDocs,
		type Project
	} from '#lib/projects.ts';
	import { AGENTS, normalizeAgentId, type AgentId } from '#lib/agents.ts';

	interface Question {
		id: string;
		text: string;
		type: 'text' | 'single_choice' | 'multi_choice' | 'boolean' | 'date';
		options?: string[];
		required?: boolean;
		help?: string;
		needsDocs?: boolean;
	}

	type LangPref = 'en' | 'sw';

	let issue = $state('');
	let langPref = $state<LangPref>('en');
	let agentId = $state<AgentId>('ask');
	let questions = $state<Question[]>([]);
	let idx = $state(0);
	let answers = $state<Record<string, string | string[]>>({});
	let custom = $state<Record<string, string>>({});
	let busy = $state(false);
	let error = $state<string | null>(null);
	let plan = $state('');
	let passages = $state<Array<{ title: string; citation: string; url: string }>>([]);
	let userDocs = $state<UploadedDoc[]>([]);
	let userSources = $state<Array<{ filename: string; content: string }>>([]);
	let followups = $state<
		Array<{
			q: string;
			a: string;
			passages: Array<{ title: string; citation: string; url: string }>;
			executionPlan?: ExecutionPlan;
			stepStatus?: Record<string, PlanStepStatus>;
			subagents?: SubagentRun[];
		}>
	>([]);
	/** Advice intent answered directly: response shown, no interview, no plan. */
	let directAnswer = $state(false);
	let interviewPlan = $state<ExecutionPlan | undefined>(undefined);
	let interviewSteps = $state<Record<string, PlanStepStatus> | undefined>(undefined);
	let interviewAgents = $state<SubagentRun[] | undefined>(undefined);
	let planExecution = $state<ExecutionPlan | undefined>(undefined);
	let planSteps = $state<Record<string, PlanStepStatus> | undefined>(undefined);
	let planAgents = $state<SubagentRun[] | undefined>(undefined);
	let generating = $state(false);
	let draft = $state('');
	let copied = $state(false);

	function isVagueIssueLocal(t: string): boolean {
		const s = t.trim().toLowerCase().replace(/\s+/g, ' ');
		if (!s) return true;
		if (s.length < 24) return true;
		return /^(please\s+)?(review|check|look at|go through|read|help( me)? with?|assist with?)\s+(this|it|the|my|attached|file|doc|document|pdf)(\s+(doc|document|file|pdf|please|for me))?[.!?]*$/.test(
			s
		);
	}

	function maybeRouteToCheck(): void {
		if (userDocs.length === 0 || agentId !== 'ask') return;
		if (
			isVagueIssueLocal(issue) ||
			/\b(review|check|verify|agreement|contract|lease|tenancy|demand letter|document|attachment)\b/i.test(
				issue
			)
		) {
			agentId = 'check';
		}
	}

	function applyServerRouting(data: Record<string, unknown>): void {
		const eff = (data as { effectiveAgentId?: unknown }).effectiveAgentId;
		if (typeof eff === 'string' && (eff === 'ask' || eff === 'check' || eff === 'draft')) {
			agentId = eff;
		}
	}

	let sessions = $state<ChatSession[]>([]);
	let sessionId = $state<string>(newSessionId());
	let chatTitle = $state('');
	let hydrated = $state(false);

	let projects = $state<Project[]>([]);
	let activeProjectId = $state<string | null>(null);
	let searchOpen = $state(false);
	let searchQuery = $state('');

	let projectDialogOpen = $state(false);
	let projectDialogMode = $state<'create' | 'edit'>('create');
	let editingProjectId = $state<string | null>(null);
	let projectName = $state('');
	let projectInstructions = $state('');
	let projectDocs = $state<UploadedDoc[]>([]);
	let projectSaved = $state(false);
	let prevProjectDialogOpen = $state(false);

	const activeProject = $derived(projects.find((p) => p.id === activeProjectId) ?? null);
	const visibleSessions = $derived(
		activeProjectId ? sessions.filter((s) => s.projectId === activeProjectId) : sessions
	);
	const projectHint = $derived.by((): string | null => {
		if (!activeProject) return null;
		const parts: string[] = [];
		if (activeProject.instructions.trim()) parts.push('instructions');
		if (activeProject.docIds.length > 0)
			parts.push(
				`${activeProject.docIds.length} file${activeProject.docIds.length === 1 ? '' : 's'}`
			);
		return parts.length > 0
			? `Project ${activeProject.name} · ${parts.join(' + ')} included`
			: `Project ${activeProject.name}`;
	});

	function scopedDocumentIds(): string[] {
		const ids = userDocs.map((d) => d.id);
		if (activeProject) {
			for (const id of activeProject.docIds) if (!ids.includes(id)) ids.push(id);
		}
		return ids.slice(0, 8);
	}

	function scopedInstructions(): string {
		return activeProject?.instructions.trim() ?? '';
	}

	let composerEl: HTMLTextAreaElement | null = $state(null);
	let pendingFollowup = $state<string | null>(null);
	let streamLabel = $state<string>('');

	type StreamPayload = {
		type: string;
		step?: string;
		label?: string;
		text?: string;
		payload?: Record<string, unknown>;
		message?: string;
	};

	async function consumeStream(res: Response, onEvent: (e: StreamPayload) => void): Promise<void> {
		const reader = res.body?.getReader();
		if (!reader) throw new Error('Streaming not supported.');
		const decoder = new TextDecoder();
		let buf = '';
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buf += decoder.decode(value, { stream: true });
			const parts = buf.split('\n\n');
			buf = parts.pop() ?? '';
			for (const part of parts) {
				const line = part
					.split('\n')
					.map((l) => l.trim())
					.find((l) => l.startsWith('data:'));
				if (!line) continue;
				try {
					onEvent(JSON.parse(line.slice(5).trim()) as StreamPayload);
				} catch {
					/* ignore malformed keepalive */
				}
			}
		}
	}

	const current = $derived(questions[idx]);
	const idle = $derived(questions.length === 0 && !plan && !directAnswer && !generating && !busy);
	const activeTitle = $derived(
		chatTitle || (issue.trim() ? sessionTitle(issue) : (activeProject?.name ?? 'New chat'))
	);
	/** The interview plan is live only while interviewing. Once the checklist
	 * exists, advice was answered directly, or a follow-up is running, the
	 * historic plan stays frozen — the global `busy` flag must not re-animate it. */
	const interviewBusy = $derived(busy && !generating && !plan && !directAnswer);

	function selected(q: Question): string | string[] {
		return answers[q.id] ?? (q.type === 'multi_choice' ? [] : '');
	}

	function setAnswer(q: Question, v: string | string[]) {
		answers[q.id] = v;
	}

	function toggleMulti(q: Question, opt: string) {
		const cur = (answers[q.id] as string[] | undefined) ?? [];
		if (cur.includes(opt))
			setAnswer(
				q,
				cur.filter((x) => x !== opt)
			);
		else setAnswer(q, [...cur, opt]);
	}

	function hasAnswer(q: Question): boolean {
		const v = answers[q.id];
		const c = custom[q.id] ?? '';
		if (c.trim()) return true;
		if (Array.isArray(v)) return v.length > 0;
		return String(v ?? '').trim().length > 0;
	}

	function finalAnswer(q: Question): string | string[] {
		if (q.type === 'text') return answers[q.id] ?? '';
		const c = custom[q.id]?.trim();
		if (c) return c;
		return answers[q.id] ?? (q.type === 'multi_choice' ? [] : '');
	}

	function loadDraft(q: Question | undefined) {
		if (!q) {
			draft = '';
			return;
		}
		if (q.type === 'text' || q.type === 'date') draft = String(answers[q.id] ?? '');
		else draft = custom[q.id] ?? '';
	}

	function answerSummary(q: Question): string {
		const v = finalAnswer(q);
		const s = Array.isArray(v) ? v.join(', ') : String(v ?? '');
		return s.trim() ? s : '—';
	}

	function isAnswered(q: Question): boolean {
		const v = finalAnswer(q);
		const s = Array.isArray(v) ? v.join(', ') : String(v ?? '');
		return s.trim().length > 0;
	}

	function choiceOptions(q: Question): string[] {
		if (q.type === 'boolean') return ['Yes', 'No'];
		return q.options ?? [];
	}

	onMount(() => {
		sessions = loadSessions();
		projects = loadProjects();
		try {
			const saved = localStorage.getItem('hakili:activeProject:v1');
			if (saved && projects.some((p) => p.id === saved)) activeProjectId = saved;
		} catch {
			/* ignore */
		}
		hydrated = true;
	});

	function snapshot(): ChatSession | null {
		if (!issue.trim()) return null;
		return {
			id: sessionId,
			title: chatTitle || sessionTitle(issue),
			updatedAt: Date.now(),
			issue,
			langPref,
			agentId,
			projectId: activeProjectId,
			questions,
			answers,
			custom,
			idx,
			plan,
			passages,
			userSources,
			followups
		};
	}

	function applyServerTitle(value: unknown, fallbackIssue: string) {
		if (typeof value === 'string' && value.trim()) {
			chatTitle = value.trim().slice(0, 60);
		} else if (!chatTitle) {
			chatTitle = sessionTitle(fallbackIssue);
		}
	}

	/** Fact-first batches arrive as `questions`; single-question responses as `question`. */
	function questionBatch(data: Record<string, unknown>): Question[] {
		if (Array.isArray(data.questions) && data.questions.length > 0)
			return data.questions as Question[];
		if (data.question && typeof data.question === 'object') return [data.question as Question];
		return [];
	}

	function applyAgentPlan(data: Record<string, unknown>, target: 'interview' | 'plan'): void {
		const plan = (data.executionPlan ?? data.planExecution ?? undefined) as
			ExecutionPlan | undefined;
		const steps = (data.stepStatus ?? data.planSteps ?? undefined) as
			Record<string, PlanStepStatus> | undefined;
		const agents = (data.subagents ?? data.subagentRuns ?? undefined) as SubagentRun[] | undefined;
		if (target === 'interview') {
			interviewPlan = plan;
			interviewSteps = steps;
			interviewAgents = agents;
		} else {
			planExecution = plan;
			planSteps = steps;
			planAgents = agents;
		}
	}

	function saveNow() {
		const s = snapshot();
		if (s) sessions = persistSession(s);
	}

	$effect(() => {
		if (!hydrated) return;
		void issue;
		void chatTitle;
		void langPref;
		void agentId;
		void activeProjectId;
		void questions;
		void answers;
		void custom;
		void idx;
		void plan;
		void passages;
		void userSources;
		void followups;
		if (!issue.trim()) return;
		const s = snapshot();
		if (s) sessions = persistSession(s);
	});

	$effect(() => {
		if (!hydrated) return;
		void activeProjectId;
		try {
			if (activeProjectId) localStorage.setItem('hakili:activeProject:v1', activeProjectId);
			else localStorage.removeItem('hakili:activeProject:v1');
		} catch {
			/* ignore */
		}
	});

	// Project dialog closed without saving a new project: drop orphaned uploads.
	$effect(() => {
		if (prevProjectDialogOpen && !projectDialogOpen) {
			if (projectDialogMode === 'create' && !projectSaved) {
				const orphaned = projectDocs;
				projectDocs = [];
				for (const d of orphaned) {
					fetch(`/api/documents/${encodeURIComponent(d.id)}`, { method: 'DELETE' }).catch(() => {});
				}
			}
			projectSaved = false;
		}
		prevProjectDialogOpen = projectDialogOpen;
	});

	async function start() {
		busy = true;
		error = null;
		maybeRouteToCheck();
		plan = '';
		passages = [];
		userSources = [];
		followups = [];
		directAnswer = false;
		questions = [];
		idx = 0;
		answers = {};
		custom = {};
		draft = '';
		generating = false;
		interviewPlan = undefined;
		interviewSteps = undefined;
		interviewAgents = undefined;
		planExecution = undefined;
		planSteps = undefined;
		planAgents = undefined;
		chatTitle = sessionTitle(issue);
		try {
			const res = await fetch('/api/interview/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					issue,
					langPref,
					agentId,
					documentIds: scopedDocumentIds(),
					projectInstructions: scopedInstructions()
				})
			});
			if (!res.ok) {
				let msg = await res.text();
				try {
					msg = JSON.parse(msg).error ?? msg;
				} catch {
					/* ignore */
				}
				throw new Error(msg);
			}
			const data = await res.json();
			applyServerTitle(data.title, issue);
			applyServerRouting(data);
			applyAgentPlan(data, 'interview');
			const batch = questionBatch(data);
			const direct =
				typeof data.answer === 'string' && data.answer.trim() ? data.answer.trim() : null;
			if (direct) {
				// Advice intent: show the grounded answer and stop. No
				// interview, no plan — follow-ups stay free-form from here.
				followups = [
					...followups,
					{
						q: issue,
						a: direct,
						passages: (Array.isArray(data.answerPassages) ? data.answerPassages : []) as Array<{
							title: string;
							citation: string;
							url: string;
						}>
					}
				];
				directAnswer = true;
			} else if (batch.length > 0) {
				questions = batch;
				idx = 0;
				loadDraft(questions[0]);
			} else {
				await finish();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function next() {
		if (current?.required && !hasAnswer(current)) {
			error = 'Please answer this question.';
			return;
		}
		error = null;
		if (current) {
			const c = custom[current.id]?.trim();
			if (c) answers[current.id] = c;
		}
		busy = true;
		try {
			if (idx < questions.length - 1) {
				idx += 1;
				loadDraft(questions[idx]);
				return;
			}
			const history = questions.map((q) => ({
				q: q.text,
				a: String(
					(custom[q.id]?.trim()
						? custom[q.id]
						: Array.isArray(answers[q.id])
							? (answers[q.id] as string[]).join(', ')
							: (answers[q.id] ?? '')) ?? ''
				)
			}));
			const res = await fetch('/api/interview/next', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					issue,
					history,
					langPref,
					agentId,
					documentIds: scopedDocumentIds(),
					projectInstructions: scopedInstructions()
				})
			});
			if (!res.ok) {
				let msg = await res.text();
				try {
					msg = JSON.parse(msg).error ?? msg;
				} catch {
					/* ignore */
				}
				throw new Error(msg);
			}
			const data = await res.json();
			applyServerTitle(data.title, issue);
			applyServerRouting(data);
			applyAgentPlan(data, 'interview');
			const batch = questionBatch(data);
			if (batch.length > 0) {
				questions = [...questions, ...batch];
				idx = questions.length - batch.length;
				loadDraft(questions[idx]);
			} else {
				draft = '';
				await finish();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function pickOption(q: Question, v: string) {
		if (busy || generating) return;
		if (custom[q.id]) custom[q.id] = '';
		setAnswer(q, v);
		draft = '';
		await next();
	}

	function toggleOption(q: Question, opt: string) {
		if (custom[q.id]) custom[q.id] = '';
		toggleMulti(q, opt);
	}

	async function submitDraft() {
		if (!current || busy || generating) return;
		const t = draft.trim();
		if (current.type === 'text') {
			if (!t && current.required) {
				error = 'Please answer this question.';
				return;
			}
			setAnswer(current, draft);
		} else if (current.type === 'multi_choice') {
			if (t) {
				custom[current.id] = t;
				answers[current.id] = [];
			}
		} else if (current.type === 'date') {
			if (t) setAnswer(current, t);
			if (!hasAnswer(current) && current.required) {
				error = 'Please answer this question.';
				return;
			}
		} else {
			if (t) custom[current.id] = t;
		}
		await next();
	}

	async function composerSubmit() {
		if (busy || generating) return;
		if (idle) {
			if (!issue.trim()) return;
			await start();
			return;
		}
		if (plan || directAnswer) {
			await sendFollowUp();
			return;
		}
	}

	function editQuestion(i: number) {
		error = null;
		idx = i;
		loadDraft(questions[i]);
	}

	async function finish() {
		busy = true;
		error = null;
		generating = true;
		streamLabel = 'Preparing your memo…';
		try {
			const ansObj: Record<string, string> = {};
			for (const q of questions) {
				const v = finalAnswer(q);
				ansObj[q.id] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
			}
			if (userDocs.length > 0) {
				const names = userDocs.map((d) => d.filename).join(', ');
				for (const q of questions) {
					if (q.needsDocs === true && !String(ansObj[q.id] ?? '').trim()) {
						ansObj[q.id] = `Attached files: ${names}`;
					}
				}
			}
			const payload = {
				issue,
				questions,
				answers: ansObj,
				documentIds: scopedDocumentIds(),
				projectInstructions: scopedInstructions(),
				langPref,
				agentId
			};
			// Streaming first: progressive tokens + status labels. Falls back
			// to the buffered endpoint when SSE is unavailable.
			let streamed = false;
			try {
				const res = await fetch('/api/interview/finish/stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
					body: JSON.stringify(payload)
				});
				const ctype = res.headers.get('content-type') ?? '';
				if (res.ok && ctype.includes('text/event-stream') && res.body) {
					streamed = true;
					plan = '';
					passages = [];
					userSources = [];
					await consumeStream(res, (e) => {
						if (e.type === 'status' && e.label) streamLabel = e.label;
						else if (e.type === 'token' && typeof e.text === 'string') plan += e.text;
						else if (
							e.type === 'done' &&
							e.payload &&
							(e.payload as { kind?: string }).kind === 'plan'
						) {
							const p = e.payload as unknown as {
								plan: string;
								passages: typeof passages;
								userPassages: typeof userSources;
								executionPlan?: ExecutionPlan;
								stepStatus?: Record<string, PlanStepStatus>;
								subagents?: SubagentRun[];
							};
							plan = p.plan;
							passages = p.passages ?? [];
							userSources = p.userPassages ?? [];
							applyAgentPlan(p as unknown as Record<string, unknown>, 'plan');
						} else if (e.type === 'error') {
							throw new Error(e.message || 'Stream failed.');
						}
					});
					if (!plan.trim()) throw new Error('Empty response; please try again.');
				}
			} catch (e) {
				if (streamed) throw e;
				// Fall through to buffered JSON below.
			}
			if (!streamed) {
				const res = await fetch('/api/interview/finish', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				if (!res.ok) {
					let msg = await res.text();
					try {
						msg = JSON.parse(msg).error ?? msg;
					} catch {
						/* ignore */
					}
					throw new Error(msg);
				}
				const data = await res.json();
				plan = data.plan;
				passages = data.passages ?? [];
				userSources = data.userPassages ?? [];
				applyAgentPlan(data, 'plan');
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
			generating = false;
			streamLabel = '';
		}
	}

	async function sendFollowUp() {
		const text = draft.trim();
		if (!text || busy || generating) return;
		error = null;
		draft = '';
		pendingFollowup = text;
		streamLabel = 'Searching Kenyan law…';
		busy = true;
		try {
			const history = questions.map((q) => ({
				q: q.text,
				a: String(
					(custom[q.id]?.trim()
						? custom[q.id]
						: Array.isArray(answers[q.id])
							? (answers[q.id] as string[]).join(', ')
							: (answers[q.id] ?? '')) ?? ''
				)
			}));
			const turns = followups.flatMap((f) => [
				{ role: 'user', content: f.q },
				{ role: 'assistant', content: f.a }
			]);
			const payload = {
				issue,
				langPref,
				agentId,
				history,
				plan,
				turns,
				message: text,
				projectInstructions: scopedInstructions()
			};
			let streamed = false;
			try {
				const res = await fetch('/api/interview/followup/stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
					body: JSON.stringify(payload)
				});
				const ctype = res.headers.get('content-type') ?? '';
				if (res.ok && ctype.includes('text/event-stream') && res.body) {
					streamed = true;
					pendingFollowup = null;
					let acc = '';
					const entry = {
						q: text,
						a: '',
						passages: [] as Array<{ title: string; citation: string; url: string }>,
						executionPlan: undefined as ExecutionPlan | undefined,
						stepStatus: undefined as Record<string, PlanStepStatus> | undefined,
						subagents: undefined as SubagentRun[] | undefined
					};
					followups = [...followups, entry];
					await consumeStream(res, (e) => {
						if (e.type === 'status' && e.label) streamLabel = e.label;
						else if (e.type === 'token' && typeof e.text === 'string') {
							acc += e.text;
							const last = followups[followups.length - 1];
							if (last) last.a = acc;
							followups = [...followups];
						} else if (
							e.type === 'done' &&
							e.payload &&
							(e.payload as { kind?: string }).kind === 'followup'
						) {
							const p = e.payload as unknown as {
								answer: string;
								passages: typeof entry.passages;
								executionPlan?: ExecutionPlan;
								stepStatus?: Record<string, PlanStepStatus>;
								subagents?: SubagentRun[];
							};
							const last = followups[followups.length - 1];
							if (last) {
								last.a = p.answer;
								last.passages = p.passages ?? [];
								last.executionPlan = p.executionPlan;
								last.stepStatus = p.stepStatus;
								last.subagents = p.subagents;
							}
							followups = [...followups];
						} else if (e.type === 'error') {
							throw new Error(e.message || 'Stream failed.');
						}
					});
					const doneAnswer = followups[followups.length - 1]?.a.trim() ?? '';
					if (!doneAnswer) throw new Error('Empty response; please try again.');
					return;
				}
			} catch (e) {
				if (streamed) throw e;
				// Fall through to buffered JSON below.
			}
			const res = await fetch('/api/interview/followup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				let msg = await res.text();
				try {
					msg = JSON.parse(msg).error ?? msg;
				} catch {
					/* ignore */
				}
				throw new Error(msg);
			}
			const data = await res.json();
			const answer = String(data.answer ?? '').trim();
			if (!answer) throw new Error('Empty response; please try again.');
			followups = [
				...followups,
				{
					q: text,
					a: answer,
					passages: data.passages ?? [],
					executionPlan: data.executionPlan as ExecutionPlan | undefined,
					stepStatus: data.stepStatus as Record<string, PlanStepStatus> | undefined,
					subagents: data.subagents as SubagentRun[] | undefined
				}
			];
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			draft = text;
		} finally {
			pendingFollowup = null;
			streamLabel = '';
			busy = false;
		}
	}

	async function copyPlan() {
		try {
			await navigator.clipboard.writeText(plan);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* ignore */
		}
	}

	function reset() {
		for (const d of userDocs) {
			if (isProjectDoc(d.id, projects)) continue;
			fetch(`/api/documents/${encodeURIComponent(d.id)}`, { method: 'DELETE' }).catch(() => {});
		}
		userDocs = [];
		userSources = [];
		issue = '';
		chatTitle = '';
		questions = [];
		idx = 0;
		answers = {};
		custom = {};
		plan = '';
		passages = [];
		followups = [];
		directAnswer = false;
		interviewPlan = undefined;
		interviewSteps = undefined;
		interviewAgents = undefined;
		planExecution = undefined;
		planSteps = undefined;
		planAgents = undefined;
		error = null;
		generating = false;
		pendingFollowup = null;
		streamLabel = '';
		draft = '';
	}

	function newChat() {
		saveNow();
		reset();
		sessionId = newSessionId();
		composerEl?.focus();
	}

	function openSession(id: string) {
		const s = sessions.find((x) => x.id === id);
		if (!s) return;
		saveNow();
		for (const d of userDocs) {
			if (isProjectDoc(d.id, projects)) continue;
			fetch(`/api/documents/${encodeURIComponent(d.id)}`, { method: 'DELETE' }).catch(() => {});
		}
		sessionId = s.id;
		activeProjectId = ((s as { projectId?: unknown }).projectId as string | null) ?? null;
		issue = s.issue;
		chatTitle = s.title && s.title !== 'New chat' ? s.title : sessionTitle(s.issue);
		langPref = s.langPref === 'sw' ? 'sw' : 'en';
		agentId = normalizeAgentId((s as { agentId?: unknown }).agentId);
		questions = s.questions;
		answers = s.answers;
		custom = s.custom;
		idx = Math.min(s.idx, Math.max(s.questions.length - 1, 0));
		plan = s.plan;
		passages = s.passages;
		userSources = s.userSources;
		followups = Array.isArray(s.followups) ? s.followups : [];
		directAnswer = followups.length > 0 && !s.plan && s.questions.length === 0;
		userDocs = [];
		interviewPlan = undefined;
		interviewSteps = undefined;
		interviewAgents = undefined;
		planExecution = undefined;
		planSteps = undefined;
		planAgents = undefined;
		error = null;
		busy = false;
		generating = false;
		pendingFollowup = null;
		loadDraft(questions[idx]);
		if (s.plan) draft = '';
	}

	function deleteChat(id: string) {
		sessions = removeStoredSession(id);
		if (id === sessionId) {
			reset();
			sessionId = newSessionId();
		}
	}

	function selectProject(id: string | null) {
		saveNow();
		activeProjectId = id;
		reset();
		sessionId = newSessionId();
		composerEl?.focus();
	}

	function openCreateProject() {
		projectDialogMode = 'create';
		editingProjectId = null;
		projectName = '';
		projectInstructions = '';
		projectDocs = [];
		projectSaved = false;
		projectDialogOpen = true;
	}

	function openEditProject(id: string) {
		const p = projects.find((x) => x.id === id);
		if (!p) return;
		projectDialogMode = 'edit';
		editingProjectId = id;
		projectName = p.name;
		projectInstructions = p.instructions;
		projectDocs = p.docIds.map((docId, i) => ({
			id: docId,
			filename: p.docNames[i] ?? 'document',
			chars: 0,
			chunks: 0
		}));
		projectSaved = false;
		projectDialogOpen = true;
	}

	function saveProject() {
		const name = projectName.trim();
		if (!name) return;
		if (projectDialogMode === 'edit' && editingProjectId) {
			const prev = projects.find((p) => p.id === editingProjectId);
			const removed = (prev?.docIds ?? []).filter((id) => !projectDocs.some((d) => d.id === id));
			for (const id of removed) {
				fetch(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
			}
			const updated = syncProjectDocs(
				{
					...(prev as Project),
					id: editingProjectId,
					name: projectTitle(name),
					instructions: projectInstructions.trim().slice(0, 4000)
				},
				projectDocs
			);
			projects = persistProject(updated);
		} else {
			const created: Project = {
				id: newProjectId(),
				name: projectTitle(name),
				instructions: projectInstructions.trim().slice(0, 4000),
				docIds: projectDocs.map((d) => d.id).slice(0, 5),
				docNames: projectDocs.map((d) => d.filename).slice(0, 5),
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
			projects = persistProject(created);
			activeProjectId = created.id;
		}
		projectSaved = true;
		projectDialogOpen = false;
	}

	function deleteProjectById(id: string) {
		const doomed = projects.find((p) => p.id === id);
		projects = removeStoredProject(id);
		if (activeProjectId === id) {
			saveNow();
			reset();
			sessionId = newSessionId();
			activeProjectId = null;
		}
		// Orphaned chats stay, unassigned; project files are removed server-side.
		const touched = sessions.filter((s) => s.projectId === id);
		if (touched.length > 0) {
			for (const s of touched) {
				sessions = persistSession({ ...s, projectId: null });
			}
		}
		if (doomed) {
			for (const docId of doomed.docIds) {
				if (isProjectDoc(docId, projects)) continue;
				fetch(`/api/documents/${encodeURIComponent(docId)}`, { method: 'DELETE' }).catch(() => {});
			}
		}
		projectDialogOpen = false;
	}

	$effect(() => {
		function onKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				searchOpen = true;
			}
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<svelte:head>
	<title
		>{activeTitle === 'New chat'
			? 'Hakili — Offline counsel assistant'
			: `${activeTitle} — Hakili`}</title
	>
</svelte:head>

<Tooltip.Provider>
	<Sidebar.Provider class="h-svh">
		<Sidebar.Root variant="inset" collapsible="offcanvas">
			<ChatSidebar
				sessions={visibleSessions}
				allSessions={sessions}
				{projects}
				{activeProjectId}
				activeId={issue ? sessionId : null}
				onNew={newChat}
				onOpen={openSession}
				onDelete={deleteChat}
				onSearch={() => (searchOpen = true)}
				onNewProject={openCreateProject}
				onSelectProject={selectProject}
				onEditProject={openEditProject}
			/>
		</Sidebar.Root>

		<Sidebar.Inset class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
			<header class="shrink-0 border-b">
				<div class="flex h-14 items-center justify-between gap-2 px-4">
					<div class="flex min-w-0 items-center gap-2">
						<Sidebar.Trigger aria-label="Toggle chat history" />
						<Separator orientation="vertical" class="h-5" />
						<h1 class="truncate text-sm font-medium">{activeTitle}</h1>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<Select
							type="single"
							value={langPref}
							onValueChange={(v: string) => (langPref = v as LangPref)}
						>
							<SelectTrigger aria-label="Response language">
								<SelectValue placeholder="Language" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="en">English</SelectItem>
								<SelectItem value="sw">Kiswahili</SelectItem>
							</SelectContent>
						</Select>
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="ghost"
										size="icon"
										onclick={toggleMode}
										aria-label="Toggle theme"
									>
										<SunIcon class="size-4 dark:hidden" />
										<MoonIcon class="hidden size-4 dark:block" />
									</Button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>Toggle theme</Tooltip.Content>
						</Tooltip.Root>
					</div>
				</div>
			</header>

			<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
				{#if idle}
					<div class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
						<div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-10">
							<Empty.Root>
								<Empty.Header>
									<Empty.Media variant="icon">
										<AppLogo size="md" />
									</Empty.Media>
									<Empty.Title>{AGENTS[agentId].emptyTitle}</Empty.Title>
									<Empty.Description>
										{AGENTS[agentId].emptyDescription}
									</Empty.Description>
								</Empty.Header>
							</Empty.Root>
							<PromptComposer
								bind:value={issue}
								bind:element={composerEl}
								bind:agentId
								bind:docs={userDocs}
								placeholder={AGENTS[agentId].placeholder}
								ariaLabel="Describe the matter"
								disabled={busy}
								sendDisabled={busy || !issue.trim()}
								sendLabel="Start"
								{projectHint}
								onSubmit={() => void composerSubmit()}
							/>
							{#if busy}
								<ThinkingLine title="Thinking…" />
							{/if}
							{#if error}
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							{/if}
						</div>
					</div>
				{:else}
					<MessageScroller.Provider>
						<MessageScroller.Root class="h-full">
							<MessageScroller.Viewport>
								<MessageScroller.Content aria-live="polite" aria-busy={busy || generating}>
									<div class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
										<MessageScroller.Item messageId="issue" scrollAnchor>
											<Message.Root align="end">
												<Message.Content>
													<Bubble.Root align="end" variant="muted">
														<Bubble.Content>{issue}</Bubble.Content>
													</Bubble.Root>
												</Message.Content>
											</Message.Root>
										</MessageScroller.Item>

										{#if interviewPlan}
											<MessageScroller.Item messageId="interview-plan">
												<Message.Root>
													<Message.Content>
														<PlanView
															plan={interviewPlan}
															stepStatus={interviewSteps ?? {}}
															busy={interviewBusy}
														/>
														{#if interviewAgents}
															<SubagentView runs={interviewAgents} />
														{/if}
													</Message.Content>
												</Message.Root>
											</MessageScroller.Item>
										{/if}

										{#each questions as q, i (q.id)}
											{#if i <= idx || isAnswered(q)}
												<MessageScroller.Item messageId={q.id}>
													<Message.Root>
														<Message.Content>
															{#if i === idx && !plan && !generating}
																<p class="text-xs text-muted-foreground">Question {i + 1}</p>
																<InterviewQuestion
																	name={q.id}
																	title={q.text}
																	type={q.type}
																	choices={choiceOptions(q).map((o) => ({ value: o, label: o }))}
																	required={q.required}
																	description={q.help ??
																		(q.type === 'single_choice' || q.type === 'boolean'
																			? 'Choose one, or type your own answer.'
																			: q.type === 'multi_choice'
																				? 'Select all that apply, or add your own.'
																				: undefined)}
																	selected={selected(q)}
																	bind:draft
																	canGoBack={i > 0}
																	submitDisabled={busy || generating}
																	onPick={(v) => pickOption(q, v)}
																	onToggle={(v) => toggleOption(q, v)}
																	onPrevious={() => editQuestion(i - 1)}
																	onSubmit={() => void submitDraft()}
																/>
																<AttachmentDialog bind:docs={userDocs} />
																<DocumentList bind:docs={userDocs} />
															{:else}
																<p class="text-sm leading-relaxed">{q.text}</p>
															{/if}
														</Message.Content>
													</Message.Root>
												</MessageScroller.Item>

												{#if isAnswered(q) && (i < idx || plan)}
													<MessageScroller.Item messageId={`${q.id}-answer`}>
														<Message.Root align="end">
															<Message.Content>
																<Bubble.Root align="end" variant="muted">
																	<Bubble.Content>{answerSummary(q)}</Bubble.Content>
																</Bubble.Root>
																{#if !plan && !generating}
																	<Message.Footer>
																		<Button
																			variant="ghost"
																			size="sm"
																			onclick={() => editQuestion(i)}
																			aria-label="Edit answer"
																		>
																			<PencilSimpleIcon />
																			Edit
																		</Button>
																	</Message.Footer>
																{/if}
															</Message.Content>
														</Message.Root>
													</MessageScroller.Item>
												{/if}
											{/if}
										{/each}

										{#if error}
											<Alert variant="destructive">
												<AlertDescription>{error}</AlertDescription>
											</Alert>
										{/if}

										{#if plan}
											<MessageScroller.Item messageId="plan">
												<Message.Root>
													<Message.Content>
														{#if planExecution}
															<PlanView
																plan={planExecution}
																stepStatus={planSteps ?? {}}
																busy={generating}
															/>
															{#if planAgents}
																<SubagentView runs={planAgents} />
															{/if}
														{/if}
														<CitedMarkdown source={plan} {passages} />
														<Message.Footer>
															<Button variant="outline" size="sm" onclick={copyPlan}>
																{#if copied}
																	<CheckIcon />
																{:else}
																	<CopyIcon />
																{/if}
																{copied ? 'Copied' : 'Copy'}
															</Button>
														</Message.Footer>
														{#if passages.length}
															<SourceLinks {passages} />
														{/if}
														{#if userSources.length}
															<Trace.Root>
																<Trace.Collapsible>
																	<Trace.CollapsibleTrigger>
																		<Trace.Line>
																			<Trace.Icon>
																				<FileTextIcon />
																			</Trace.Icon>
																			<Trace.Title>
																				Files ({userSources.length})
																			</Trace.Title>
																		</Trace.Line>
																	</Trace.CollapsibleTrigger>
																	<Trace.CollapsibleContent>
																		<Item.Group>
																			{#each userSources as u, i (i)}
																				<Item.Root size="sm" variant="muted">
																					<Item.Media>
																						<FileTextIcon />
																					</Item.Media>
																					<Item.Content>
																						<Item.Title>{u.filename}</Item.Title>
																						<Item.Description
																							>{u.content.slice(0, 160)}…</Item.Description
																						>
																					</Item.Content>
																				</Item.Root>
																			{/each}
																		</Item.Group>
																	</Trace.CollapsibleContent>
																</Trace.Collapsible>
															</Trace.Root>
														{/if}
													</Message.Content>
												</Message.Root>
											</MessageScroller.Item>
										{/if}

										{#each followups as f, i (i)}
											{#if i !== 0 || f.q.trim().replace(/\s+/g, ' ') !== issue
														.trim()
														.replace(/\s+/g, ' ')}
												<MessageScroller.Item messageId={`followup-${i}-q`}>
													<Message.Root align="end">
														<Message.Content>
															<Bubble.Root align="end" variant="muted">
																<Bubble.Content>{f.q}</Bubble.Content>
															</Bubble.Root>
														</Message.Content>
													</Message.Root>
												</MessageScroller.Item>
											{/if}
											<MessageScroller.Item messageId={`followup-${i}-a`}>
												<Message.Root>
													<Message.Content>
														{#if f.executionPlan}
															<PlanView
																plan={f.executionPlan}
																stepStatus={f.stepStatus ?? {}}
																busy={false}
															/>
															{#if f.subagents}
																<SubagentView runs={f.subagents} />
															{/if}
														{/if}
														<CitedMarkdown source={f.a} passages={f.passages} />
														{#if f.passages.length}
															<SourceLinks passages={f.passages} />
														{/if}
													</Message.Content>
												</Message.Root>
											</MessageScroller.Item>
										{/each}

										{#if pendingFollowup}
											<MessageScroller.Item messageId="pending-followup-q" scrollAnchor>
												<Message.Root align="end">
													<Message.Content>
														<Bubble.Root align="end" variant="muted">
															<Bubble.Content>{pendingFollowup}</Bubble.Content>
														</Bubble.Root>
													</Message.Content>
												</Message.Root>
											</MessageScroller.Item>
										{/if}

										{#if busy || generating}
											<MessageScroller.Item messageId="thinking" scrollAnchor>
												<ThinkingLine
													title={streamLabel || (generating ? 'Drafting memo…' : 'Thinking…')}
												/>
											</MessageScroller.Item>
										{/if}
									</div>
								</MessageScroller.Content>
							</MessageScroller.Viewport>
							<MessageScroller.Button />
						</MessageScroller.Root>
					</MessageScroller.Provider>
				{/if}
			</div>

			{#if !idle && (plan || directAnswer)}
				<footer class="shrink-0 bg-background">
					<div class="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3">
						<PromptComposer
							bind:value={draft}
							bind:element={composerEl}
							bind:agentId
							bind:docs={userDocs}
							placeholder="Ask a follow-up…"
							ariaLabel="Ask a counsel follow-up"
							disabled={busy}
							sendDisabled={busy || !draft.trim()}
							sendLabel="Send follow-up question"
							{projectHint}
							onSubmit={() => void composerSubmit()}
						/>
					</div>
				</footer>
			{/if}
		</Sidebar.Inset>
	</Sidebar.Provider>
	<ProjectSearch
		bind:open={searchOpen}
		bind:query={searchQuery}
		{projects}
		{sessions}
		onOpenProject={(id) => selectProject(id)}
		onOpenChat={(id) => openSession(id)}
	/>
	<ProjectDialog
		bind:open={projectDialogOpen}
		title={projectDialogMode === 'create' ? 'New project' : 'Edit project'}
		description={projectDialogMode === 'create'
			? 'Group related chats. Instructions and files apply to every chat in this project.'
			: 'Instructions and files apply to every chat in this project.'}
		bind:name={projectName}
		bind:instructions={projectInstructions}
		bind:docs={projectDocs}
		saveLabel={projectDialogMode === 'create' ? 'Create project' : 'Save changes'}
		showDelete={projectDialogMode === 'edit' && editingProjectId !== null}
		onSave={saveProject}
		onDelete={() => editingProjectId && deleteProjectById(editingProjectId)}
	/>
</Tooltip.Provider>
