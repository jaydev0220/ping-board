<script lang="ts">
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import { clearAccessToken, refresh, setAccessToken } from '$lib/api';
	import './layout.css';

	let { children } = $props<{ children: Snippet }>();
	let authState = $state<'initializing' | 'authenticated' | 'anonymous'>('initializing');
	const canonicalUrl = $derived(`https://www.hsieh-dev.us.ci${page.url.pathname}`);

	async function initializeAuth(): Promise<void> {
		try {
			const response = await refresh();
			setAccessToken(response.accessToken);
			authState = 'authenticated';
		} catch {
			clearAccessToken();
			authState = 'anonymous';
		}
	}

	// Export auth state via context for child routes
	setContext('auth', {
		get state() {
			return authState;
		}
	});

	$effect(() => {
		void initializeAuth();
	});
</script>

<svelte:head>
	<meta name="author" content="謝孟哲" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://cdn.hsieh-dev.us.ci/icons/favicon.webp" />
	<meta property="og:image:type" content="image/webp" />
	<meta
		property="og:image:alt"
		content="A white rounded square icon featuring the black Chinese character '哲' in the center, with blue L-shaped corner borders at the top-left and bottom-right."
	/>
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content="zh_TW" />
	<meta property="og:locale_alternate" content="en_US" />
	<meta property="og:site_name" content="謝孟哲 - 全端工程師" />
	<link rel="icon" href="https://cdn.hsieh-dev.us.ci/icons/favicon.svg" type="image/svg+xml" />
	<link
		rel="icon"
		href="https://cdn.hsieh-dev.us.ci/icons/favicon.ico"
		type="image/x-icon"
		sizes="any"
	/>
	<link rel="canonical" href={canonicalUrl} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC&family=Space+Grotesk:wght@700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if authState === 'initializing'}
	<div class="grid min-h-dvh place-items-center bg-slate-950/95 px-6">
		<div
			class="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur"
		>
			<div class="mb-6 flex items-center gap-3">
				<div class="size-3 animate-pulse rounded-full bg-cyan-400"></div>
				<div class="h-4 w-40 animate-pulse rounded bg-white/15"></div>
			</div>

			<div class="space-y-3">
				<div class="h-3 w-full animate-pulse rounded bg-white/10"></div>
				<div class="h-3 w-11/12 animate-pulse rounded bg-white/10"></div>
				<div class="h-3 w-4/5 animate-pulse rounded bg-white/10"></div>
			</div>

			<div class="mt-6 flex items-center gap-2 text-sm text-white/70">
				<span
					class="inline-block size-4 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300"
				></span>
				<span>Initializing session...</span>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
