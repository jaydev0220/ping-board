<script lang="ts">
	const {
		visible,
		message,
		type = 'error'
	} = $props<{
		visible: boolean;
		message: string;
		type?: 'error' | 'info' | 'success';
	}>();

	const toneClasses = $derived(
		type === 'error'
			? 'border-destructive/60 bg-destructive/10 text-destructive'
			: type === 'success'
				? 'border-healthy/50 bg-healthy/10 text-healthy'
				: 'border-border bg-elevated text-text'
	);

	const ariaLive = $derived(type === 'error' ? 'assertive' : 'polite');
	const ariaAtomic = true;
</script>

<div
	class={`pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center transition-opacity duration-200 md:inset-x-0 ${
		visible ? 'opacity-100' : 'opacity-0'
	}`}
	aria-live={ariaLive}
	aria-atomic={ariaAtomic}
>
	{#if visible && message}
		<div
			class={`pointer-events-auto w-full max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${toneClasses}`}
			role={type === 'error' ? 'alert' : 'status'}
		>
			{message}
		</div>
	{/if}
</div>
