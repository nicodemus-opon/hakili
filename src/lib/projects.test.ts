import { describe, expect, it } from 'vitest';
import { projectTitle, syncProjectDocs, type Project } from './projects.ts';

const base: Project = {
	id: 'p-1',
	name: 'Employment dispute',
	instructions: 'Prefer Kiswahili summaries.',
	docIds: [],
	docNames: [],
	createdAt: 1,
	updatedAt: 1
};

describe('projects store', () => {
	it('titles fall back and truncate like chat titles', () => {
		expect(projectTitle('   ')).toBe('Untitled project');
		expect(projectTitle('Employment dispute — Achieng')).toBe('Employment dispute — Achieng');
		expect(projectTitle(`x${'y'.repeat(100)}`).length).toBeLessThanOrEqual(43);
	});

	it('syncs uploader docs onto the project record, capped at five', () => {
		const docs = Array.from({ length: 7 }, (_, i) => ({
			id: `d-${i}`,
			filename: `file-${i}.pdf`,
			chars: 10,
			chunks: 1
		}));
		const synced = syncProjectDocs(base, docs);
		expect(synced.docIds).toHaveLength(5);
		expect(synced.docNames[0]).toBe('file-0.pdf');
		expect(synced.updatedAt).toBeGreaterThanOrEqual(base.updatedAt);
	});
});
