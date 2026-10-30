<script lang="ts">
	import { renderMarkdown } from '#lib/markdown.ts';

	let { source }: { source: string } = $props();

	const html = $derived(renderMarkdown(source ?? ''));
</script>

<div class="flex flex-col gap-4" data-testid="plan-markdown">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- html is produced by renderMarkdown which escapes raw HTML -->
	{@html html}
</div>
