<script lang="ts">
	import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon';
	import ArrowUpRightIcon from 'phosphor-svelte/lib/ArrowUpRightIcon';
	import CopyIcon from 'phosphor-svelte/lib/CopyIcon';
	import CheckIcon from 'phosphor-svelte/lib/CheckIcon';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		passages
	}: {
		passages: Array<{ title: string; citation: string; url: string }>;
	} = $props();

	const deduped = $derived(
		passages.filter((p, i, all) => all.findIndex((o) => o.url === p.url) === i)
	);

	let copiedUrl = $state<string | null>(null);

	async function copyCitation(p: { title: string; citation: string }) {
		try {
			await navigator.clipboard.writeText(`${p.title} — ${p.citation}`);
			copiedUrl = p.citation;
			setTimeout(() => {
				copiedUrl = null;
			}, 1500);
		} catch {
			/* ignore */
		}
	}
</script>

<Trace.Root>
	<Trace.Collapsible>
		<Trace.CollapsibleTrigger>
			<Trace.Line>
				<Trace.Icon>
					<GlobeIcon />
				</Trace.Icon>
				<Trace.Title
					>Used {deduped.length} {deduped.length === 1 ? 'source' : 'sources'}</Trace.Title
				>
			</Trace.Line>
		</Trace.CollapsibleTrigger>
		<Trace.CollapsibleContent>
			<Trace.Root>
				{#each deduped as p (p.url)}
					<Trace.Line>
						<Trace.Icon>
							<GlobeIcon />
						</Trace.Icon>
						<Trace.Title>
							{p.title} — {p.citation}
						</Trace.Title>
						<Trace.Description>
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external legal source -->
							<a href={p.url} target="_blank" rel="noreferrer" class="underline underline-offset-2">
								Open source
								<span class="sr-only"> (opens in a new tab)</span>
							</a>
						</Trace.Description>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => void copyCitation(p)}
							aria-label="Copy citation"
						>
							{#if copiedUrl === p.citation}
								<CheckIcon />
								Copied
							{:else}
								<CopyIcon />
								Copy
							{/if}
						</Button>
						<Trace.Icon>
							<ArrowUpRightIcon />
						</Trace.Icon>
					</Trace.Line>
				{/each}
			</Trace.Root>
		</Trace.CollapsibleContent>
	</Trace.Collapsible>
</Trace.Root>
