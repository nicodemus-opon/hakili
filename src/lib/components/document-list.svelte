<script lang="ts">
	import FileTextIcon from 'phosphor-svelte/lib/FileTextIcon';
	import XIcon from 'phosphor-svelte/lib/XIcon';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import * as Attachment from '#lib/components/ui/attachment/index.js';
	import type { UploadedDoc } from '#lib/filepond.ts';

	let { docs = $bindable<UploadedDoc[]>([]) }: { docs?: UploadedDoc[] } = $props();

	let error = $state<string | null>(null);

	async function removeDoc(id: string): Promise<void> {
		error = null;
		const prev = docs;
		docs = docs.filter((d) => d.id !== id);
		try {
			await fetch(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
		} catch (e) {
			docs = prev;
			error = e instanceof Error ? e.message : String(e);
		}
	}
</script>

{#if docs.length}
	<div class="flex flex-col gap-2" aria-live="polite">
		{#each docs as d (d.id)}
			<Attachment.Root size="sm">
				<Attachment.Media>
					<FileTextIcon />
				</Attachment.Media>
				<Attachment.Content>
					<Attachment.Title>{d.filename}</Attachment.Title>
				</Attachment.Content>
				<Attachment.Actions>
					<Attachment.Action aria-label="Remove {d.filename}" onclick={() => removeDoc(d.id)}>
						<XIcon />
					</Attachment.Action>
				</Attachment.Actions>
			</Attachment.Root>
		{/each}
	</div>
{/if}
{#if error}
	<Alert variant="destructive">
		<AlertDescription>{error}</AlertDescription>
	</Alert>
{/if}
