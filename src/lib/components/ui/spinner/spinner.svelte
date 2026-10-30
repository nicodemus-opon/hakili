<script lang="ts">
	import CircleNotchIcon from 'phosphor-svelte/lib/CircleNotchIcon';
	import { cn } from '#lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		class: className,
		role = 'status',
		'aria-label': ariaLabel = 'Loading',
		...restProps
	}: ComponentProps<typeof CircleNotchIcon> = $props();
</script>

<CircleNotchIcon
	{role}
	aria-label={ariaLabel}
	class={cn('size-4 animate-spin', className)}
	{...restProps}
/>
