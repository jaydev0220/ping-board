<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiClientError, getAccessToken, register } from '$lib/api';

	let showPwd = $state(false);
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	function switchPwdDisplay() {
		showPwd = !showPwd;
	}

	function toErrorMessage(error: unknown): string {
		if (error instanceof ApiClientError) {
			return error.message;
		}

		if (error instanceof Error && error.message) {
			return error.message;
		}

		return '發生未預期錯誤，請稍後再試。';
	}

	async function handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		errorMessage = null;
		successMessage = null;

		const normalizedUsername = username.trim();
		if (!normalizedUsername || !password || !confirmPassword) {
			errorMessage = '請完整填寫所有欄位。';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = '兩次輸入的密碼不一致。';
			return;
		}

		isSubmitting = true;

		try {
			const response = await register({
				username: normalizedUsername,
				password
			});
			successMessage = response.message;
			await goto(resolve('/login'));
		} catch (error: unknown) {
			errorMessage = toErrorMessage(error);
		} finally {
			isSubmitting = false;
		}
	}

	onMount(() => {
		if (getAccessToken()) {
			void goto(resolve('/'));
		}
	});
</script>

<div class="flex h-dvh w-dvw flex-col items-center justify-center">
	<h1 class="mb-6 font-header text-4xl font-bold">Register</h1>
	<form class="flex w-11/12 max-w-md flex-col gap-3 p-4" onsubmit={handleSubmit}>
		<label class="flex flex-col gap-1 text-lg font-bold">
			使用者名稱
			<input
				type="text"
				name="username"
				autocomplete="username"
				bind:value={username}
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
		</label>
		<label class="relative flex flex-col gap-1 text-lg font-bold">
			密碼
			<input
				type={showPwd ? 'text' : 'password'}
				name="password"
				autocomplete="new-password"
				bind:value={password}
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
			<button
				type="button"
				class="absolute top-10.5 right-3 cursor-pointer"
				onclick={switchPwdDisplay}
				aria-label={showPwd ? '隱藏密碼' : '顯示密碼'}
			>
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
				autocomplete="new-password"
				bind:value={confirmPassword}
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
			<button
				type="button"
				class="absolute top-10.5 right-3 cursor-pointer"
				onclick={switchPwdDisplay}
				aria-label={showPwd ? '隱藏密碼' : '顯示密碼'}
			>
				{#if showPwd}
					<Eye size={20} />
				{:else}
					<EyeOff size={20} />
				{/if}
			</button>
		</label>
		{#if errorMessage}
			<p
				class="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{errorMessage}
			</p>
		{/if}
		{#if successMessage}
			<p class="rounded-md border border-healthy/50 bg-healthy/10 px-3 py-2 text-sm text-healthy">
				{successMessage}
			</p>
		{/if}
		<button
			type="submit"
			disabled={isSubmitting}
			class="mt-2 h-10 cursor-pointer rounded-lg border border-border bg-primary text-xl font-bold transition-transform
						duration-300 ease-in-out hover:scale-102 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{isSubmitting ? '註冊中…' : '註冊'}
		</button>
	</form>
	<span class="text-sm text-muted">
		已經有帳號了？
		<a href={resolve('/login')} class="text-blue-500 underline decoration-blue-500">馬上登入</a>
	</span>
</div>
