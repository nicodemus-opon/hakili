<script lang="ts">
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Trace from '#lib/components/ui/trace/index.js';

	let { title = 'Thinking…' }: { title?: string } = $props();
</script>

<Trace.Root aria-live="polite">
	<Trace.Line status="running">
		<Trace.Icon>
			<Spinner />
		</Trace.Icon>
		<Trace.Title>{title}</Trace.Title>
	</Trace.Line>
</Trace.Root>
