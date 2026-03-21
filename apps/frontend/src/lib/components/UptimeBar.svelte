<script lang="ts">
	import { SquarePen, Trash2 } from '@lucide/svelte';
	import ServiceEditModal from '$lib/components/ServiceEditModal.svelte';
	import ServiceDeleteConfirmationModal from '$lib/components/ServiceDeleteConfirmationModal.svelte';
	import type { Service, UpdateServiceInput, UptimeData } from '$lib/types';

	interface UptimeBarProps {
		serviceId: number;
		service: Service;
		uptimeData?: UptimeData[];
		onUpdateService: (id: number, input: UpdateServiceInput) => Promise<void>;
		onDeleteService: (id: number) => Promise<void>;
	}

	const MAX_DAYS = 90;
	const UNKNOWN_DAY: UptimeData = {
		date: 'Unknown',
		uptimePercentage: 0,
		averageLatency: 0
	};

	let {
		serviceId,
		service,
		uptimeData = [],
		onUpdateService,
		onDeleteService
	}: UptimeBarProps = $props();

	const paddedData = $derived.by(() => {
		const missing = Math.max(0, MAX_DAYS - uptimeData.length);
		const leadingDays = Array.from({ length: missing }, () => UNKNOWN_DAY);
		return [...leadingDays, ...uptimeData].slice(-MAX_DAYS);
	});

	const serviceDescription = $derived(service.description?.trim() || 'No description');
	let showEditModal = $state(false);
	let showDeleteConfirmation = $state(false);

	const getBarColorClass = (date: string, uptimePercentage: number): string => {
		if (date === 'Unknown') {
			return 'bg-nodata';
		}
		if (uptimePercentage < 95) {
			return 'bg-outage';
		}
		if (uptimePercentage < 99.9) {
			return 'bg-degraded';
		}
		return 'bg-healthy';
	};

	const getBarHeightClass = (date: string): string => {
		return date === 'Unknown' ? 'h-2' : 'h-full';
	};

	const getBarAnimationClass = (date: string): string => {
		return date === 'Unknown'
			? ''
			: 'transition-transform duration-300 hover:-translate-y-0.75 hover:outline-2 hover:outline-nodata/50';
	};

	function handleEdit() {
		showEditModal = true;
	}

	function handleDelete() {
		showDeleteConfirmation = true;
	}
</script>

<div class="relative z-1 h-fit w-full max-w-5xl rounded-lg border-2 border-border bg-surface p-4">
	<div class="mb-2 flex h-fit w-full flex-col">
		<h2 class="w-full justify-baseline text-2xl font-bold">{service.name}</h2>
		<span class="w-full truncate text-muted">{serviceDescription}</span>
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
	<div class="flex h-12 w-full items-end gap-0.75 overflow-x-auto px-0.5 py-2">
		{#snippet segment(day: UptimeData)}
			<div
				class="min-w-1.5 flex-1 rounded-md
				{getBarColorClass(day.date, day.uptimePercentage)}
				{getBarHeightClass(day.date)}
				{getBarAnimationClass(day.date)}"
			></div>
		{/snippet}

		{#each paddedData as day, i (i)}
			{@render segment(day)}
		{/each}
	</div>
</div>

{#if showEditModal}
	<ServiceEditModal
		mode="edit"
		{service}
		bind:show={showEditModal}
		onUpdate={(input) => onUpdateService(serviceId, input)}
	/>
{/if}

{#if showDeleteConfirmation}
	<ServiceDeleteConfirmationModal
		{service}
		bind:show={showDeleteConfirmation}
		onConfirm={() => onDeleteService(serviceId)}
	/>
{/if}
