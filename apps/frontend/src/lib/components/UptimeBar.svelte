<script lang="ts">
	import { SquarePen, Trash2 } from '@lucide/svelte';
	import { getUptimeData } from '$lib/api';
	import ServiceEditModal from '$lib/components/ServiceEditModal.svelte';
	import type { Service } from '$lib/types';
	import ServiceDeleteConfirmationModal from './ServiceDeleteConfirmationModal.svelte';

	let { service }: { service: Service } = $props();
	// svelte-ignore state_referenced_locally
	const uptimeData = getUptimeData(service);
	const paddedData = $derived.by(() => {
		const result = [...uptimeData];
		const missing = 90 - uptimeData.length;

		if (missing > 0) {
			for (let i = 0; i < missing; i++) {
				result.unshift({
					date: 'Unknown',
					uptimePercentage: 0,
					averageLatency: 0
				});
			}
		}
		return result.slice(-90);
	});
	let showEditModal = $state(false);
	let showDelteConfirmation = $state(false);

	function handleEdit() {
		showEditModal = true;
	}

	function handleDelete() {
		showDelteConfirmation = true;
	}
</script>

<div class="relative z-1 h-fit w-full max-w-5xl rounded-lg border-2 border-border bg-surface p-4">
	<div class="mb-2 flex h-fit w-full flex-col">
		<h2 class="w-full justify-baseline text-2xl font-bold">{service.name}</h2>
		<span class="w-full truncate text-muted">{service.description}</span>
	</div>
	<div class="absolute top-2 right-2 flex gap-3">
		<button
			class="cursor-pointer rounded-lg p-2 outline-1 outline-border transition-colors duration-400 ease-in-out hover:bg-elevated"
			onclick={handleEdit}
		>
			<SquarePen size={20} />
		</button>
		<button
			class="cursor-pointer rounded-lg p-2 outline-1 outline-border transition-colors duration-400 ease-in-out hover:bg-elevated
						hover:text-destructive"
			onclick={handleDelete}
		>
			<Trash2 size={20} />
		</button>
	</div>
	<div class=" box-content flex h-8 w-full items-end gap-0.75 overflow-x-auto pb-2">
		{#each paddedData as { date, uptimePercentage }, i (i)}
			<div
				class="min-w-1.5 flex-1 rounded-md
				{date === 'Unknown'
					? 'bg-nodata'
					: uptimePercentage < 95
						? 'bg-outage'
						: uptimePercentage < 99.9
							? 'bg-degraded'
							: 'bg-healthy'}
				{date === 'Unknown' ? 'h-2' : 'h-full'}"
			></div>
		{/each}
	</div>
</div>

{#if showEditModal}
	<ServiceEditModal {service} bind:show={showEditModal} />
{/if}

{#if showDelteConfirmation}
	<ServiceDeleteConfirmationModal {service} bind:show={showDelteConfirmation} />
{/if}
