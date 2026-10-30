<script lang="ts">
	import logo from '#lib/assets/logo.svg';

	let {
		size = 'md',
		class: className = ''
	}: {
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	} = $props();

	const sizes = {
		sm: 'size-7',
		md: 'size-8',
		lg: 'size-12'
	} as const;
</script>

<img
	src={logo}
	alt="Hakili logo"
	width="128"
	height="128"
	class="{sizes[size]} rounded-lg {className}"
/>
