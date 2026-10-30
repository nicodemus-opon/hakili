<script lang="ts">
	import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon';
	import FileTextIcon from 'phosphor-svelte/lib/FileTextIcon';
	import PaperclipIcon from 'phosphor-svelte/lib/PaperclipIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import ChatCircleIcon from 'phosphor-svelte/lib/ChatCircleIcon';
	import PencilLineIcon from 'phosphor-svelte/lib/PencilLineIcon';
	import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '#lib/components/ui/dialog/index.js';
	import DocumentUploader from '#lib/components/document-uploader.svelte';
	import { MAX_DOCS, type UploadedDoc } from '#lib/filepond.ts';

	import { AGENTS, type AgentId } from '#lib/agents.ts';

	let {
		value = $bindable(''),
		placeholder = 'Type your answer',
		ariaLabel = 'Your answer',
		disabled = false,
		sendDisabled = false,
		sendLabel = 'Send answer',
		/** New docs-backed attachments. Rendered as Attachment chips; uploading via the paperclip dialog. */
		docs = $bindable<UploadedDoc[]>([]),
		showAttach = true,
		// Deprecated legacy props — kept for type compatibility. `docs` supersedes `attachments`.
		showAttachToggle = false,
		attachPressed = false,
		attachments = [],
		element = $bindable<HTMLTextAreaElement | null>(null),
		agentId = $bindable<AgentId>('ask'),
		projectHint = null,
		onSubmit,
		onToggleAttach,
		onRemoveAttachment
	}: {
		value?: string;
		placeholder?: string;
		ariaLabel?: string;
		disabled?: boolean;
		sendDisabled?: boolean;
		sendLabel?: string;
		docs?: UploadedDoc[];
		showAttach?: boolean;
		showAttachToggle?: boolean;
		attachPressed?: boolean;
		attachments?: Array<{ id: string; filename: string }>;
		element?: HTMLTextAreaElement | null;
		agentId?: AgentId;
		/** Optional one-line project context shown above the input. */
		projectHint?: string | null;
		onSubmit: () => void;
		onToggleAttach?: () => void;
		onRemoveAttachment?: (id: string) => void;
	} = $props();

	let form = $state<HTMLFormElement | null>(null);
	let agentOpen = $state(false);
	let attachOpen = $state(false);

	const agentList = [AGENTS.ask, AGENTS.check, AGENTS.draft] as const;
	const activeAgent = $derived(AGENTS[agentId] ?? AGENTS.ask);
	const showAttachButton = $derived(showAttach || showAttachToggle);
	const visibleAttachments = $derived(docs.length > 0 ? docs : attachments);

	async function removeDoc(id: string): Promise<void> {
		onRemoveAttachment?.(id);
		if (!docs.some((d) => d.id === id)) return;
		const prev = docs;
		docs = docs.filter((d) => d.id !== id);
		try {
			await fetch(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
		} catch {
			docs = prev;
		}
	}

	function pickAgent(id: AgentId) {
		agentId = id;
		agentOpen = false;
		element?.focus();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (!sendDisabled) onSubmit();
		}
	}
</script>

<form
	bind:this={form}
	onsubmit={(e) => {
		e.preventDefault();
		onSubmit();
	}}
>
	<InputGroup.Root>
		{#if projectHint}
			<InputGroup.Addon align="block-start">
				<span class="truncate text-xs text-muted-foreground">{projectHint}</span>
			</InputGroup.Addon>
		{/if}
		{#if visibleAttachments.length > 0}
			<InputGroup.Addon align="block-start" class="flex-wrap">
				{#each visibleAttachments as a (a.id)}
					<Attachment.Root size="sm">
						<Attachment.Media>
							<FileTextIcon />
						</Attachment.Media>
						<Attachment.Content>
							<Attachment.Title>{a.filename}</Attachment.Title>
						</Attachment.Content>
						<Attachment.Actions>
							<Attachment.Action
								aria-label="Remove {a.filename}"
								onclick={() => void removeDoc(a.id)}
							>
								<XIcon />
							</Attachment.Action>
						</Attachment.Actions>
					</Attachment.Root>
				{/each}
			</InputGroup.Addon>
		{/if}
		<InputGroup.Textarea
			bind:value
			bind:ref={element}
			{placeholder}
			aria-label={ariaLabel}
			onkeydown={handleKey}
			class="min-h-10"
			{disabled}
		/>
		<InputGroup.Addon align="block-end">
			<div class="flex items-center">
				{#if showAttachButton}
					<Dialog
						bind:open={attachOpen}
						onOpenChange={(open) => {
							if (open) onToggleAttach?.();
						}}
					>
						<DialogTrigger>
							{#snippet child({ props })}
								<InputGroup.Button
									{...props}
									size="icon-sm"
									variant="ghost"
									aria-label="Attach documents"
									aria-pressed={attachPressed}
								>
									<PaperclipIcon />
								</InputGroup.Button>
							{/snippet}
						</DialogTrigger>
						<DialogContent class="sm:max-w-lg">
							<DialogHeader>
								<DialogTitle>Supporting documents</DialogTitle>
								<DialogDescription>
									Up to {MAX_DOCS} files · 10 MB each. They stay on this device.
								</DialogDescription>
							</DialogHeader>
							<DocumentUploader bind:docs onUploaded={() => (attachOpen = false)} />
						</DialogContent>
					</Dialog>
				{/if}
				<Popover.Root bind:open={agentOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<InputGroup.Button
								{...props}
								size="sm"
								variant="ghost"
								aria-label="Choose agent: {activeAgent.label}"
								{disabled}
							>
								{#if agentId === 'check'}
									<FileTextIcon />
								{:else if agentId === 'draft'}
									<PencilLineIcon />
								{:else}
									<ChatCircleIcon />
								{/if}
								<span>{activeAgent.shortLabel}</span>
								<CaretDownIcon />
							</InputGroup.Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content align="start" side="top" class="w-72">
						<div class="flex flex-col gap-1">
							{#each agentList as a (a.id)}
								<button
									type="button"
									class={'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted' +
										(a.id === agentId ? ' bg-muted font-medium' : '')}
									aria-label={'Use ' + a.label}
									onclick={() => pickAgent(a.id)}
								>
									{#if a.id === 'check'}
										<FileTextIcon />
									{:else if a.id === 'draft'}
										<PencilLineIcon />
									{:else}
										<ChatCircleIcon />
									{/if}
									<span>{a.label}</span>
									{#if a.id === agentId}
										<span class="ml-auto">
											<CheckIcon />
										</span>
									{/if}
								</button>
							{/each}
						</div></Popover.Content
					>
				</Popover.Root>
			</div>
			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<InputGroup.Button
							{...props}
							type="submit"
							size="icon-sm"
							variant="default"
							class="ml-auto"
							disabled={sendDisabled}
							aria-label={sendLabel}
						>
							<ArrowUpIcon />
						</InputGroup.Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>{sendLabel}</Tooltip.Content>
			</Tooltip.Root>
		</InputGroup.Addon>
	</InputGroup.Root>
</form>
