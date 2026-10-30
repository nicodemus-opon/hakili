<script lang="ts">
	import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
	import CircleIcon from 'phosphor-svelte/lib/CircleIcon';
	import CircleDashedIcon from 'phosphor-svelte/lib/CircleDashedIcon';
	import MapTrifoldIcon from 'phosphor-svelte/lib/MapTrifoldIcon';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';
	import { humanizeLabel } from '#lib/humanize.ts';
	import type { ExecutionPlan, PlanStepStatus } from '#lib/server/agent/planner/types.ts';

	let {
		plan,
		stepStatus = {},
		busy = false
	}: {
		plan: ExecutionPlan;
		stepStatus?: Record<string, PlanStepStatus>;
		busy?: boolean;
	} = $props();

	const done = $derived(
		plan.steps.filter((s) => (stepStatus[s.id] ?? 'pending') === 'done').length
	);
	const running = $derived(busy && done < plan.steps.length);

	function statusOf(id: string): PlanStepStatus {
		return stepStatus[id] ?? 'pending';
	}
</script>

<Trace.Root>
	<Trace.Collapsible>
		<Trace.CollapsibleTrigger>
			<Trace.Line status={running ? 'running' : undefined}>
				<Trace.Icon>
					<MapTrifoldIcon />
				</Trace.Icon>
				<Trace.Title>{humanizeLabel(plan.title)}</Trace.Title>
				<Trace.Description>
					{done} of {plan.steps.length} done
				</Trace.Description>
			</Trace.Line>
		</Trace.CollapsibleTrigger>
		<Trace.CollapsibleContent>
			<Trace.Root>
				{#each plan.steps as s (s.id)}
					{@const st = statusOf(s.id)}
					<Trace.Line
						status={st === 'done' || st === 'skipped'
							? undefined
							: st === 'running' || (busy && st === 'pending')
								? 'running'
								: st === 'error'
									? 'error'
									: 'pending'}
					>
						<Trace.Icon>
							{#if st === 'done'}
								<CheckCircleIcon />
							{:else if st === 'skipped' || st === 'error'}
								<CircleDashedIcon />
							{:else if st === 'running' || (busy && st === 'pending')}
								<Spinner />
							{:else}
								<CircleIcon />
							{/if}
						</Trace.Icon>
						<Trace.Title>{humanizeLabel(s.label)}</Trace.Title>
						{#if st === 'skipped'}
							<Trace.Description>skipped</Trace.Description>
						{/if}
					</Trace.Line>
				{/each}
			</Trace.Root>
		</Trace.CollapsibleContent>
	</Trace.Collapsible>
</Trace.Root>
