<script lang="ts">
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import FolderIcon from 'phosphor-svelte/lib/FolderIcon';
	import * as Command from '#lib/components/ui/command/index.js';
	import type { ChatSession } from '#lib/chat-history.ts';
	import type { Project } from '#lib/projects.ts';

	interface Hit {
		kind: 'project' | 'chat';
		id: string;
		title: string;
		detail: string;
		meta?: string;
	}

	let {
		open = $bindable(false),
		query = $bindable(''),
		projects,
		sessions,
		onOpenProject,
		onOpenChat
	}: {
		open?: boolean;
		query?: string;
		projects: Project[];
		sessions: ChatSession[];
		onOpenProject: (id: string) => void;
		onOpenChat: (id: string) => void;
	} = $props();

	$effect(() => {
		if (open) query = '';
	});

	function snippet(s: ChatSession): string {
		const bits = [s.issue, ...s.followups.flatMap((f) => [f.q, f.a]), s.plan]
			.join(' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (!bits) return 'No messages yet';
		return bits.length > 120 ? `${bits.slice(0, 120)}…` : bits;
	}

	const projectHits: Hit[] = $derived(
		projects.map((p) => ({
			kind: 'project' as const,
			id: p.id,
			title: p.name,
			detail:
				p.instructions.trim() ||
				(p.docNames.length > 0 ? `${p.docNames.length} file(s)` : 'No instructions yet'),
			meta:
				sessions.filter((s) => s.projectId === p.id).length === 1
					? '1 chat'
					: `${sessions.filter((s) => s.projectId === p.id).length} chats`
		}))
	);

	const chatHits: Hit[] = $derived(
		sessions.map((s) => ({
			kind: 'chat' as const,
			id: s.id,
			title: s.title,
			detail: snippet(s),
			meta: projects.find((p) => p.id === s.projectId)?.name
		}))
	);

	function openHit(h: Hit) {
		open = false;
		if (h.kind === 'project') onOpenProject(h.id);
		else onOpenChat(h.id);
	}
</script>

<Command.Dialog
	bind:open
	bind:value={query}
	title="Search chats and projects"
	description="Type to search chat and project names and contents."
>
	<Command.Input placeholder="Search chats and projects…" />
	<Command.List>
		<Command.Empty>
			{query.trim() ? `Nothing found for “${query.trim()}”.` : 'No chats yet.'}
		</Command.Empty>
		{#if projectHits.length > 0}
			<Command.Group heading="Projects">
				{#each projectHits as h (h.id)}
					<Command.Item value={h.title} keywords={[h.detail]} onSelect={() => openHit(h)}>
						<FolderIcon />
						<div class="flex min-w-0 flex-col">
							<span class="truncate">{h.title}</span>
							<span class="truncate text-xs text-muted-foreground">{h.detail.slice(0, 120)}</span>
						</div>
						<span class="ms-auto shrink-0 text-xs text-muted-foreground">{h.meta}</span>
					</Command.Item>
				{/each}
			</Command.Group>
			{#if chatHits.length > 0}
				<Command.Separator />
			{/if}
		{/if}
		{#if chatHits.length > 0}
			<Command.Group heading="Chats">
				{#each chatHits as h (h.id)}
					<Command.Item
						value={h.title}
						keywords={[h.detail, h.meta ?? '']}
						onSelect={() => openHit(h)}
					>
						<ChatCircleIcon />
						<div class="flex min-w-0 flex-col">
							<span class="truncate">{h.title}</span>
							<span class="truncate text-xs text-muted-foreground">{h.detail}</span>
						</div>
						{#if h.meta}
							<span class="ms-auto shrink-0 text-xs text-muted-foreground">{h.meta}</span>
						{/if}
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
