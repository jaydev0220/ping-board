<script lang="ts">
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import { clearAccessToken, refresh, setAccessToken } from '$lib/api';
	import './layout.css';

	let { children } = $props<{ children: Snippet }>();
	let authState = $state<'initializing' | 'authenticated' | 'anonymous'>('initializing');
	const canonicalUrl = $derived(`https://www.hsieh-dev.us.ci${page.url.pathname}`);
	const skeletonBarIndexes = Array.from({ length: 90 }, (_, index) => index);

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
	<div class="relative flex h-dvh w-dvw flex-col items-center" aria-busy="true">
		<header
			class="mb-8 flex h-18 w-full items-center justify-center bg-surface font-header text-4xl font-bold"
		>
			<div class="h-10 w-56 animate-pulse rounded bg-border"></div>
		</header>

		<div class="flex w-full flex-col items-center gap-6 px-4">
			<div class="flex w-full max-w-5xl items-center justify-end gap-6 px-6 py-2">
				<div class="h-7 w-36 animate-pulse rounded bg-border text-muted"></div>
				<div class="h-8 w-24 animate-pulse rounded-lg bg-primary/60"></div>
			</div>

			{#each [0, 1] as cardIndex (cardIndex)}
				<div class="w-full max-w-5xl rounded-lg border-2 border-border bg-surface p-4">
					<div class="mb-4 flex items-start justify-between gap-4">
						<div class="space-y-2">
							<div class="h-6 w-52 animate-pulse rounded bg-border"></div>
							<div class="h-4 w-80 max-w-[70vw] animate-pulse rounded bg-border/80"></div>
						</div>
						<div class="flex items-center gap-2">
							<div class="size-8 animate-pulse rounded-md border border-border bg-border/70"></div>
							<div class="size-8 animate-pulse rounded-md border border-border bg-border/70"></div>
						</div>
					</div>

					<div class="space-y-3">
						<div class="h-4 w-32 animate-pulse rounded bg-border/80"></div>
						<div class="flex w-full gap-0.5 overflow-hidden">
							{#each skeletonBarIndexes as index (index)}
								<div
									class={`h-9 flex-1 animate-pulse rounded-[2px] ${
										index % 17 === 0 ? 'bg-destructive/40' : 'bg-primary/35'
									}`}
								></div>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="absolute right-6 bottom-6">
			<div
				class="flex h-15 w-15 animate-pulse items-center justify-center rounded-full bg-primary/60"
			>
				<div class="h-6 w-6 rounded bg-surface/80"></div>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
