<script lang="ts">
	import { ApiClientError } from '$lib/api';
	import type { Service } from '$lib/types';

	interface ServiceDeleteConfirmationModalProps {
		service: Service;
		show?: boolean;
		onConfirm: () => Promise<void>;
	}

	let {
		service,
		show = $bindable(true),
		onConfirm
	}: ServiceDeleteConfirmationModalProps = $props();
	let isDeleting = $state(false);
	let errorMessage = $state<string | null>(null);

	const confirmLabel = $derived(isDeleting ? '刪除中...' : '確定');

	const toErrorMessage = (error: unknown): string => {
		if (error instanceof ApiClientError) {
			return error.message;
		}
		if (error instanceof Error) {
			return error.message;
		}
		return 'Failed to delete service.';
	};

	$effect(() => {
		if (show) {
			errorMessage = null;
		}
	});

	function handleCancel() {
		if (isDeleting) {
			return;
		}

		errorMessage = null;
		show = false;
	}

	async function handleDelete() {
		if (isDeleting) {
			return;
		}

		errorMessage = null;
		isDeleting = true;
		try {
			await onConfirm();
			show = false;
		} catch (error) {
			errorMessage = toErrorMessage(error);
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="absolute top-0 left-0 z-9 flex h-dvh w-dvw items-center justify-center bg-black/20">
	<div
		class="flex w-11/12 max-w-xs flex-col gap-4 rounded-lg border border-border bg-elevated p-6 text-text"
	>
		<h2 class="text-center text-2xl font-bold">確定移除服務？</h2>

		<p class="text-muted">確定要移除 "{service.name}" 嗎？</p>

		{#if errorMessage}
			<p
				class="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{errorMessage}
			</p>
		{/if}

		<div class="mt-2 flex flex-row justify-between text-lg">
			<button
				class="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-1"
				onclick={handleCancel}
				disabled={isDeleting}
			>
				取消
			</button>
			<button
				class="cursor-pointer rounded-lg border border-destructive px-4 py-1 text-destructive transition-colors duration-300 ease-in-out
              hover:border-border hover:bg-destructive hover:text-text"
				onclick={handleDelete}
				disabled={isDeleting}
			>
				{confirmLabel}
			</button>
		</div>
	</div>
</div>
