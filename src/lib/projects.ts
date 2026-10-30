import type { UploadedDoc } from '#lib/filepond.ts';

export interface Project {
	id: string;
	name: string;
	instructions: string;
	docIds: string[];
	docNames: string[];
	createdAt: number;
	updatedAt: number;
}

const KEY = 'hakili:projects:v1';
const MAX = 50;

function readable(): boolean {
	return typeof localStorage !== 'undefined';
}

export function loadProjects(): Project[] {
	if (!readable()) return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as Project[];
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
			.map((p) => ({
				id: p.id,
				name: String(p.name).slice(0, 80),
				instructions: typeof p.instructions === 'string' ? p.instructions.slice(0, 4000) : '',
				docIds: Array.isArray(p.docIds) ? p.docIds.map(String).slice(0, 5) : [],
				docNames: Array.isArray(p.docNames) ? p.docNames.map(String).slice(0, 5) : [],
				createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
				updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now()
			}))
			.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
			.slice(0, MAX);
	} catch {
		return [];
	}
}

function writeProjects(list: Project[]): Project[] {
	if (!readable()) return list;
	try {
		localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
	} catch {
		/* storage full or unavailable */
	}
	return list;
}

export function persistProject(project: Project): Project[] {
	const list = loadProjects().filter((p) => p.id !== project.id);
	list.unshift({ ...project, updatedAt: Date.now() });
	return writeProjects(list);
}

export function deleteProject(id: string): Project[] {
	return writeProjects(loadProjects().filter((p) => p.id !== id));
}

export function newProjectId(): string {
	try {
		return crypto.randomUUID();
	} catch {
		return `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	}
}

export function projectTitle(name: string): string {
	const t = name.trim().replace(/\s+/g, ' ');
	if (!t) return 'Untitled project';
	return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

/** Docs pinned to a project must survive per-chat cleanup. */
export function isProjectDoc(docId: string, projects: Project[]): boolean {
	return projects.some((p) => p.docIds.includes(docId));
}

/** Snapshot helper: keep stored project docs in sync with the uploader list. */
export function syncProjectDocs(project: Project, docs: UploadedDoc[]): Project {
	return {
		...project,
		docIds: docs.map((d) => d.id).slice(0, 5),
		docNames: docs.map((d) => d.filename).slice(0, 5),
		updatedAt: Date.now()
	};
}
