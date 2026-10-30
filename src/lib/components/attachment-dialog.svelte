<script lang="ts">
	import PaperclipIcon from 'phosphor-svelte/lib/PaperclipIcon';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '#lib/components/ui/dialog/index.js';
	import DocumentUploader from '#lib/components/document-uploader.svelte';
	import type { UploadedDoc } from '#lib/filepond.ts';

	let { docs = $bindable<UploadedDoc[]>([]) }: { docs?: UploadedDoc[] } = $props();

	let open = $state(false);
</script>

<Dialog bind:open>
	<DialogTrigger>
		{#snippet child({ props }: { props: Record<string, unknown> })}
			<Button {...props} variant="ghost" size="sm">
				<PaperclipIcon />
				Attach documents
			</Button>
		{/snippet}
	</DialogTrigger>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>Supporting documents</DialogTitle>
			<DialogDescription>Up to 5 files · 10 MB each. They stay on this device.</DialogDescription>
		</DialogHeader>
		<DocumentUploader bind:docs onUploaded={() => (open = false)} />
	</DialogContent>
</Dialog>
