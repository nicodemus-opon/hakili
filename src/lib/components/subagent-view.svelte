<script lang="ts">
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
	import CircleDashedIcon from 'phosphor-svelte/lib/CircleDashedIcon';
	import RobotIcon from 'phosphor-svelte/lib/RobotIcon';
	import WrenchIcon from 'phosphor-svelte/lib/WrenchIcon';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import { humanizeLabel } from '#lib/humanize.ts';
	import type { SubagentRun } from '#lib/server/agent/planner/types.ts';

	let {
		runs
	}: {
		runs: SubagentRun[];
	} = $props();
</script>

{#if runs.length > 0}
	<Trace.Root>
		{#each runs as run (run.id)}
			<Trace.Collapsible open={run.status === 'running' || run.status === 'error'}>
				<Trace.CollapsibleTrigger>
					<Trace.Line
						status={run.status === 'running'
							? 'running'
							: run.status === 'error'
								? 'error'
								: undefined}
					>
						<Trace.Icon>
							{#if run.status === 'done'}
								<CheckCircleIcon />
							{:else if run.status === 'error'}
								<CircleDashedIcon />
							{:else if run.status === 'running'}
								<Spinner />
							{:else}
								<RobotIcon />
							{/if}
						</Trace.Icon>
						<Trace.Title>
							{run.status === 'done'
								? 'Ran'
								: run.status === 'running'
									? 'Running'
									: 'Failed to run'} the {run.name} subagent
						</Trace.Title>
						{#if run.durationMs !== undefined}
							<Trace.Description>{(run.durationMs / 1000).toFixed(1)}s</Trace.Description>
						{/if}
					</Trace.Line>
				</Trace.CollapsibleTrigger>
				<Trace.CollapsibleContent>
					<div class="flex flex-col gap-3">
						<div class="flex flex-wrap gap-1.5">
							<Badge variant="secondary">{humanizeLabel(run.name)}</Badge>
							{#each [...new Set(run.tools.map((t) => t.tool))] as tool (tool)}
								<Badge variant="outline">{humanizeLabel(tool)}</Badge>
							{/each}
						</div>
						<p class="text-sm text-muted-foreground">{run.task}</p>
						<Trace.Root>
							{#each run.tools as t, i (t.tool + t.title + i)}
								<Trace.Line
									status={t.status === 'running'
										? 'running'
										: t.status === 'error'
											? 'error'
											: t.status === 'skipped'
												? 'pending'
												: undefined}
								>
									<Trace.Icon>
										{#if t.status === 'done'}
											<CheckCircleIcon />
										{:else if t.status === 'skipped'}
											<CircleDashedIcon />
										{:else if t.status === 'running'}
											<Spinner />
										{:else}
											<WrenchIcon />
										{/if}
									</Trace.Icon>
									<Trace.Title
										>{t.status === 'done' ? 'Ran' : t.status === 'skipped' ? 'Skipped' : 'Failed'}
										{humanizeLabel(t.title)}</Trace.Title
									>
								</Trace.Line>
							{/each}
						</Trace.Root>
						{#if run.result}
							<p class="text-sm">{run.result}</p>
						{/if}
					</div>
				</Trace.CollapsibleContent>
			</Trace.Collapsible>
		{/each}
	</Trace.Root>
{/if}
