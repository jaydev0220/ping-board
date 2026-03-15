<script lang="ts">
	import type { Service } from '$lib/types';

	let { service, show = $bindable(true) }: { service: Service; show: boolean } = $props();

	function handleCancel() {
		show = false;
	}

	function handleDelete() {
		show = false;
	}
</script>

<div class="absolute top-0 left-0 z-9 flex h-dvh w-dvw items-center justify-center bg-black/20">
	<div
		class="flex w-11/12 max-w-xs flex-col gap-4 rounded-lg border border-border bg-elevated p-6 text-text"
	>
		<h2 class="text-center text-2xl font-bold">確定移除服務？</h2>

		<p class="text-muted">確定要移除 "{service.name}" 嗎？</p>

		<div class="mt-2 flex flex-row justify-between text-lg">
			<button
				class="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-1"
				onclick={handleCancel}
			>
				取消
			</button>
			<button
				class="cursor-pointer rounded-lg border border-destructive px-4 py-1 text-destructive transition-colors duration-300 ease-in-out
              hover:border-border hover:bg-destructive hover:text-text"
				onclick={handleDelete}
			>
				確定
			</button>
		</div>
	</div>
</div>
