<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';

	let showPwd = $state(false);

	function switchPwdDisplay() {
		showPwd = !showPwd;
	}
</script>

<div class="flex h-dvh w-dvw items-center justify-center">
	<div class="flex w-11/12 max-w-md flex-col gap-3 p-4">
		<label class="flex flex-col gap-1 text-lg font-bold">
			使用者名稱
			<input
				type="text"
				name="username"
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
		</label>
		<label class="relative flex flex-col gap-1 text-lg font-bold">
			密碼
			<input
				type={showPwd ? 'text' : 'password'}
				name="password"
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
			<button class="absolute top-10.5 right-3 cursor-pointer" onclick={switchPwdDisplay}>
				{#if showPwd}
					<Eye size={20} />
				{:else}
					<EyeOff size={20} />
				{/if}
			</button>
		</label>
		<label class="relative flex flex-col gap-1 text-lg font-bold">
			確認密碼
			<input
				type={showPwd ? 'text' : 'password'}
				name="confirm-password"
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
			<button class="absolute top-10.5 right-3 cursor-pointer" onclick={switchPwdDisplay}>
				{#if showPwd}
					<Eye size={20} />
				{:else}
					<EyeOff size={20} />
				{/if}
			</button>
		</label>
		<button
			class="mt-2 h-10 cursor-pointer rounded-lg border border-border bg-primary text-xl font-bold transition-transform
						duration-300 ease-in-out hover:scale-102"
		>
			註冊
		</button>
	</div>
</div>
