<script lang="ts">
	type BadgeSize = 'sm' | 'md';

	interface BadgeCircleProps {
		className?: string;
		size?: BadgeSize;
	}

	const { className = '', size = 'sm' }: BadgeCircleProps = $props();

	const sizeClass = $derived(size === 'md' ? 'size-3' : 'size-2');
</script>

<span
	aria-hidden="true"
	class={`inline-block shrink-0 rounded-full ring-1 ring-black/15 ${sizeClass} ${className}`}
></span>
