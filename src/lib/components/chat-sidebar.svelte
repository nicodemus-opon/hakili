<script lang="ts">
	import FolderIcon from 'phosphor-svelte/lib/FolderIcon';
	import FolderPlusIcon from 'phosphor-svelte/lib/FolderPlusIcon';
	import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
	import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon';
	import PlusIcon from 'phosphor-svelte/lib/PlusIcon';
	import TrashIcon from 'phosphor-svelte/lib/TrashIcon';
	import AppLogo from '#lib/components/app-logo.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Kbd } from '#lib/components/ui/kbd/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import type { ChatSession } from '#lib/chat-history.ts';
	import type { Project } from '#lib/projects.ts';

	const sidebar = Sidebar.useSidebar();

	function handleNew() {
		sidebar.setOpenMobile(false);
		onNew();
	}

	function handleOpen(id: string) {
		sidebar.setOpenMobile(false);
		onOpen(id);
	}

	function handleSelectProject(id: string | null) {
		sidebar.setOpenMobile(false);
		onSelectProject(id);
	}

	let {
		sessions,
		activeId,
		onNew,
		onOpen,
		onDelete,
		projects = [],
		allSessions = [],
		activeProjectId = null,
		onSearch = () => {},
		onNewProject = () => {},
		onSelectProject = () => {},
		onEditProject = () => {}
	}: {
		sessions: ChatSession[];
		activeId: string | null;
		onNew: () => void;
		onOpen: (id: string) => void;
		onDelete: (id: string) => void;
		projects?: Project[];
		allSessions?: ChatSession[];
		activeProjectId?: string | null;
		onSearch?: () => void;
		onNewProject?: () => void;
		onSelectProject?: (id: string | null) => void;
		onEditProject?: (id: string) => void;
	} = $props();

	const countFor = (projectId: string) =>
		allSessions.filter((s) => s.projectId === projectId).length;
	const activeProject = $derived(projects.find((p) => p.id === activeProjectId) ?? null);
	let hoveredProject = $state<string | null>(null);
</script>

<Sidebar.Header>
	<Button variant="secondary" size="sm" class="mt-2 w-full" onclick={handleNew}>
		<PlusIcon />
		<span class="flex-1 text-left">New chat</span>
	</Button>
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<Sidebar.MenuButton
				size="default"
				onclick={onSearch}
				tooltipContent="Search chats and projects"
			>
				<MagnifyingGlassIcon />
				<span class="font-medium">Search</span>
				<span class="ml-auto flex items-center gap-1">
					<Kbd>⌘K</Kbd>
				</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Header>

<Sidebar.Content>
	<Sidebar.Group>
		<Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
		<Sidebar.GroupAction title="New project" onclick={onNewProject}>
			<FolderPlusIcon />
			<span class="sr-only">New project</span>
		</Sidebar.GroupAction>
		<Sidebar.GroupContent>
			{#if projects.length === 0}
				<p class="px-2 py-2 text-sm text-muted-foreground">
					Group related chats with shared instructions and files.
				</p>
			{:else}
				<Sidebar.Menu>
					{#each projects as p (p.id)}
						<Sidebar.MenuItem
							onmouseenter={() => (hoveredProject = p.id)}
							onmouseleave={() => (hoveredProject = null)}
						>
							<Sidebar.MenuButton
								isActive={p.id === activeProjectId}
								tooltipContent={p.name}
								onclick={() => handleSelectProject(p.id)}
							>
								<FolderIcon class="size-4" />
								<span>{p.name}</span>
							</Sidebar.MenuButton>
							{#if hoveredProject !== p.id}
								<Sidebar.MenuBadge>{countFor(p.id)}</Sidebar.MenuBadge>
							{/if}
							<Sidebar.MenuAction
								showOnHover
								aria-label="Edit {p.name}"
								onclick={() => onEditProject(p.id)}
							>
								<PencilSimpleIcon />
								<span class="sr-only">Edit</span>
							</Sidebar.MenuAction>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			{/if}
		</Sidebar.GroupContent>
	</Sidebar.Group>

	<Sidebar.Group>
		<Sidebar.GroupLabel>
			{activeProject ? `Chats in ${activeProject.name}` : 'Chats'}
		</Sidebar.GroupLabel>
		<Sidebar.GroupAction title="New chat" onclick={handleNew}>
			<PlusIcon />
			<span class="sr-only">New chat</span>
		</Sidebar.GroupAction>
		<Sidebar.GroupContent>
			{#if sessions.length === 0}
				<p class="px-2 py-4 text-sm text-muted-foreground">
					{activeProject
						? 'No chats in this project yet.'
						: allSessions.length === 0
							? 'No chats yet.'
							: 'No unassigned chats.'}
				</p>
			{:else}
				<Sidebar.Menu>
					{#each sessions as s (s.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={s.id === activeId}
								tooltipContent={s.title}
								onclick={() => handleOpen(s.id)}
							>
								<span>{s.title}</span>
							</Sidebar.MenuButton>
							<Sidebar.MenuAction
								showOnHover
								aria-label="Delete {s.title}"
								onclick={() => onDelete(s.id)}
							>
								<TrashIcon />
								<span class="sr-only">Delete</span>
							</Sidebar.MenuAction>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			{/if}
			{#if activeProject}
				<button
					type="button"
					class="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
					onclick={() => handleSelectProject(null)}
				>
					Show all chats
				</button>
			{/if}
		</Sidebar.GroupContent>
	</Sidebar.Group>
</Sidebar.Content>

<Sidebar.Footer>
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<div class="flex items-center gap-2 px-2 py-1.5">
				<AppLogo size="sm" />
				<span class="flex min-w-0 flex-col leading-tight">
					<span class="truncate text-sm font-semibold">Hakili</span>
					<span class="truncate text-xs text-muted-foreground">Offline legal prep</span>
				</span>
			</div>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Footer>
