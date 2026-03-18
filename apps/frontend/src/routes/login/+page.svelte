<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext } from 'svelte';
	import { ApiClientError, login, setAccessToken } from '$lib/api';

	type AuthContext = {
		readonly state: 'initializing' | 'authenticated' | 'anonymous';
	};

	const auth = getContext<AuthContext>('auth');

	let showPwd = $state(false);
	let username = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	const passwordInputType = $derived(showPwd ? 'text' : 'password');
	const passwordToggleLabel = $derived(showPwd ? '隱藏密碼' : '顯示密碼');

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

		const normalizedUsername = username.trim();
		if (!normalizedUsername || !password) {
			errorMessage = '請輸入使用者名稱與密碼。';
			return;
		}

		isSubmitting = true;

		try {
			const response = await login({
				username: normalizedUsername,
				password
			});
			setAccessToken(response.accessToken);
			await goto(resolve('/'));
		} catch (error: unknown) {
			errorMessage = toErrorMessage(error);
		} finally {
			isSubmitting = false;
		}
	}

	$effect(() => {
		if (auth.state === 'authenticated') {
			void goto(resolve('/'));
		}
	});
</script>

{#snippet visibilityIcon(isVisible: boolean)}
	{#if isVisible}
		<Eye size={20} />
	{:else}
		<EyeOff size={20} />
	{/if}
{/snippet}

<div class="flex h-dvh w-dvw flex-col items-center justify-center">
	<h1 class="mb-6 font-header text-4xl font-bold">Login</h1>
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
				type={passwordInputType}
				name="password"
				autocomplete="current-password"
				bind:value={password}
				class="h-10 rounded-md border border-border px-2 py-1 text-lg font-normal transition-colors duration-300 ease-in-out
							focus:border-2 focus:border-secondary focus:outline-0"
			/>
			<button
				type="button"
				class="absolute top-10.5 right-3 cursor-pointer"
				onclick={switchPwdDisplay}
				aria-label={passwordToggleLabel}
			>
				{@render visibilityIcon(showPwd)}
			</button>
		</label>
		{#if errorMessage}
			<p
				class="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{errorMessage}
			</p>
		{/if}
		<button
			type="submit"
			disabled={isSubmitting}
			class="mt-2 h-10 cursor-pointer rounded-lg border border-border bg-primary text-xl font-bold transition-transform
						duration-300 ease-in-out hover:scale-102 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{isSubmitting ? '登入中…' : '登入'}
		</button>
	</form>
	<span class="text-sm text-muted">
		還沒有帳號？
		<a href={resolve('/register')} class="text-blue-500 underline decoration-blue-500">點此註冊</a>
	</span>
</div>
