<script lang="ts">
	import * as HoverCard from '#lib/components/ui/hover-card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { shortSourceLabel } from '#lib/citations.ts';

	let {
		title,
		citation,
		url,
		index
	}: {
		title: string;
		citation: string;
		url: string;
		index: number;
	} = $props();

	function hostnameFor(raw: string): string | null {
		try {
			const parsed = new URL(raw);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
			return parsed.hostname.replace(/^www\./, '') || null;
		} catch {
			return null;
		}
	}

	const host = $derived(hostnameFor(url));
	const label = $derived(shortSourceLabel(title, index, host ?? ''));
	const safeHref = $derived(host ? url : null);
</script>

<HoverCard.Root openDelay={10} closeDelay={100}>
	<HoverCard.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="secondary" size="xs">
				{label}
			</Button>
		{/snippet}
	</HoverCard.Trigger>
	<HoverCard.Content>
		<div class="flex w-64 flex-col gap-1">
			<div class="font-medium">{title}</div>
			<p class="text-muted-foreground">{citation}</p>
			{#if safeHref}
				<!-- eslint-disable svelte/no-navigation-without-resolve -- external legal source -->
				<a
					href={safeHref}
					target="_blank"
					rel="noreferrer"
					class="text-xs text-muted-foreground underline-offset-4 hover:underline"
				>
					{host}
					<span class="sr-only"> (opens in a new tab)</span>
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		</div>
	</HoverCard.Content>
</HoverCard.Root>
