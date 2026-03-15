<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';

	let { children } = $props();
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
	<meta property="og:url" content="https://www.hsieh-dev.us.ci{page.url.pathname}" />
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
	<link rel="canonical" href="https://www.hsieh-dev.us.ci{page.url.pathname}" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC&family=Space+Grotesk:wght@700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
