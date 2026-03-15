<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import UptimeBar from '$lib/components/UptimeBar.svelte';
	import type { Service } from '$lib/types';

	const services: Service[] = [
		{
			name: '服務1',
			url: 'https://example.com',
			description: 'This is an example of description.'
		},
		{
			name: '服務2',
			url: 'https://www.example.com',
			description: 'This is an example of loooooooooooooooong description.'
		}
	];
</script>

<div class="relative flex h-dvh w-dvw flex-col items-center">
	<header
		class="mb-8 flex h-18 w-full items-center justify-center bg-surface font-header text-4xl font-bold"
	>
		Ping Board
	</header>
	<div class="flex w-full flex-col items-center gap-6 px-4">
		{#each services as service (service.url)}
			<UptimeBar {service} />
		{/each}
	</div>

	<div class="absolute right-6 bottom-6">
		<button
			class="flex h-15 w-15 cursor-pointer items-center justify-center rounded-full bg-primary transition-transform duration-300
						ease-in-out hover:scale-110"
		>
			<Plus size={34} />
		</button>
	</div>
</div>
