<script lang="ts">
	import type { Service } from '$lib/types';

	let { service, show = $bindable(true) }: { service: Service; show: boolean } = $props();

	function handleCancel() {
		show = false;
	}

	function handleSave() {
		show = false;
	}
</script>

<div class="absolute top-0 left-0 z-9 flex h-dvh w-dvw items-center justify-center bg-black/20">
	<div
		class="flex w-11/12 max-w-sm flex-col gap-4 rounded-lg border border-border bg-elevated px-6 py-4 text-text"
	>
		<h2 class="text-center text-2xl font-bold">編輯服務</h2>

		<label class="flex flex-col gap-2">
			名稱
			<input
				type="text"
				value={service.name}
				class="h-10 rounded-lg border border-secondary px-2 py-1 text-lg transition-colors duration-300 ease-in-out
							focus:border-2 focus:outline-0"
			/>
		</label>
		<label class="flex flex-col gap-2">
			連結
			<input
				type="text"
				value={service.url}
				class="h-10 rounded-lg border border-secondary px-2 py-1 text-lg text-muted transition-colors duration-300
							ease-in-out focus:border-2 focus:outline-0"
				disabled
			/>
		</label>
		<label class="flex flex-col gap-2">
			描述
			<input
				type="text"
				value={service.description}
				class="h-10 rounded-lg border border-secondary px-2 py-1 text-lg transition-colors duration-300 ease-in-out
							focus:border-2 focus:outline-0"
			/>
		</label>

		<div class="mt-2 flex flex-row justify-between text-lg">
			<button
				class="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-1 transition-transform ease-in-out
							hover:scale-102"
				onclick={handleCancel}
			>
				取消
			</button>
			<button
				class="cursor-pointer rounded-lg border border-border bg-primary px-4 py-1 duration-300 ease-in-out hover:scale-102"
				onclick={handleSave}
			>
				保存
			</button>
		</div>
	</div>
</div>
