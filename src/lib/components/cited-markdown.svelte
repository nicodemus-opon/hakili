<script lang="ts">
	import { parseBlocks, renderInlineSource, splitInlineCitations } from '#lib/markdown.ts';
	import InlineCitation from '#lib/components/inline-citation.svelte';

	let {
		source,
		passages
	}: {
		source: string;
		passages: Array<{ title: string; citation: string; url: string }>;
	} = $props();

	const blocks = $derived(parseBlocks(source ?? ''));
</script>

{#snippet inlineText(value: string)}
	{#each splitInlineCitations(value) as tok, i (i)}
		{#if tok.type === 'cite'}
			{@const cited = tok.n >= 1 && tok.n <= passages.length ? passages[tok.n - 1] : null}
			{#if cited}
				<InlineCitation
					title={cited.title}
					citation={cited.citation}
					url={cited.url}
					index={tok.n}
				/>
			{:else}
				[{tok.n}]
			{/if}
		{:else}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- produced by renderInlineSource which escapes raw HTML -->
			{@html renderInlineSource(tok.value)}
		{/if}
	{/each}
{/snippet}

<div class="flex flex-col gap-4" data-testid="plan-markdown">
	{#each blocks as b, bi (bi)}
		{#if b.type === 'heading'}
			{@const text = (b.lines ?? [''])[0]}
			{#if (b.level ?? 2) === 1}
				<h1 class="mt-5 mb-1.5 text-lg font-semibold tracking-tight first:mt-0">
					{@render inlineText(text)}
				</h1>
			{:else if (b.level ?? 2) === 2}
				<h2 class="mt-5 mb-1.5 text-base font-semibold tracking-tight first:mt-0">
					{@render inlineText(text)}
				</h2>
			{:else}
				<h3 class="mt-4 mb-1 text-sm font-semibold first:mt-0">
					{@render inlineText(text)}
				</h3>
			{/if}
		{:else if b.type === 'ul'}
			<ul class="list-disc space-y-1 pl-6 text-sm">
				{#each b.items ?? [] as it, ii (ii)}
					<li class="leading-relaxed">{@render inlineText(it)}</li>
				{/each}
			</ul>
		{:else if b.type === 'ol'}
			<ol class="list-decimal space-y-1 pl-6 text-sm">
				{#each b.items ?? [] as it, ii (ii)}
					<li class="leading-relaxed">{@render inlineText(it)}</li>
				{/each}
			</ol>
		{:else if b.type === 'quote'}
			<blockquote class="border-l-2 border-border pl-4 text-sm text-muted-foreground">
				{#each b.lines ?? [] as l, li (li)}
					{@render inlineText(l)}{#if li < (b.lines ?? []).length - 1}<br />{/if}
				{/each}
			</blockquote>
		{:else if b.type === 'hr'}
			<hr class="my-4 border-border" />
		{:else}
			<p class="text-sm leading-relaxed">
				{#each b.lines ?? [] as l, li (li)}
					{@render inlineText(l)}{#if li < (b.lines ?? []).length - 1}<br />{/if}
				{/each}
			</p>
		{/if}
	{/each}
</div>
