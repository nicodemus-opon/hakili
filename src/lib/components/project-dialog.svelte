<script lang="ts">
	import FileTextIcon from 'phosphor-svelte/lib/FileTextIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import DocumentUploader from '#lib/components/document-uploader.svelte';
	import { MAX_DOCS, type UploadedDoc } from '#lib/filepond.ts';

	let {
		open = $bindable(false),
		title = 'New project',
		description = 'Group related chats. Instructions and files apply to every chat in this project.',
		name = $bindable(''),
		instructions = $bindable(''),
		docs = $bindable<UploadedDoc[]>([]),
		saveLabel = 'Create project',
		showDelete = false,
		onSave,
		onDelete
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		name?: string;
		instructions?: string;
		docs?: UploadedDoc[];
		saveLabel?: string;
		showDelete?: boolean;
		onSave: () => void;
		onDelete?: () => void;
	} = $props();

	let error = $state<string | null>(null);

	function removeDoc(id: string) {
		const prev = docs;
		docs = docs.filter((d) => d.id !== id);
		fetch(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {
			docs = prev;
		});
	}

	function save() {
		if (!name.trim()) {
			error = 'Give the project a name.';
			return;
		}
		error = null;
		onSave();
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>{title}</DialogTitle>
			<DialogDescription>{description}</DialogDescription>
		</DialogHeader>
		<div class="flex flex-col gap-4">
			<Field.Field>
				<Field.Label for="project-name">Name</Field.Label>
				<Input
					id="project-name"
					bind:value={name}
					placeholder="e.g. Employment dispute — Achieng"
					maxlength={80}
				/>
			</Field.Field>
			<Field.Field>
				<Field.Label for="project-instructions">Instructions</Field.Label>
				<Textarea
					id="project-instructions"
					bind:value={instructions}
					placeholder="e.g. Client prefers Kiswahili summaries. Always cite the Employment Act first."
					rows={4}
					maxlength={4000}
				/>
				<Field.Description>Sent with every chat in this project.</Field.Description>
			</Field.Field>
			<Field.Field>
				<Field.Label>Knowledge files</Field.Label>
				{#if docs.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each docs as d (d.id)}
							<Attachment.Root size="sm">
								<Attachment.Media>
									<FileTextIcon />
								</Attachment.Media>
								<Attachment.Content>
									<Attachment.Title>{d.filename}</Attachment.Title>
								</Attachment.Content>
								<Attachment.Actions>
									<Attachment.Action
										aria-label="Remove {d.filename}"
										onclick={() => removeDoc(d.id)}
									>
										<XIcon />
									</Attachment.Action>
								</Attachment.Actions>
							</Attachment.Root>
						{/each}
					</div>
				{/if}
				<DocumentUploader bind:docs />
				<Field.Description>Up to {MAX_DOCS} files · 10 MB each.</Field.Description>
			</Field.Field>
			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>
		<DialogFooter>
			{#if showDelete}
				<div class="mr-auto">
					<Button variant="ghost" onclick={() => onDelete?.()}>Delete project</Button>
				</div>
			{/if}
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={save}>{saveLabel}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
