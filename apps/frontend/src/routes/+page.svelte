<script lang="ts">
	import { LogOut, Plus } from '@lucide/svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext } from 'svelte';
	import {
		ApiClientError,
		getAccessToken,
		createService,
		deleteService,
		getServices,
		getStatusHistory,
		logout,
		refresh,
		setAccessToken,
		updateService
	} from '$lib/api';
	import ServiceEditModal from '$lib/components/ServiceEditModal.svelte';
	import UptimeBar from '$lib/components/UptimeBar.svelte';
	import type {
		CreateServiceInput,
		Service,
		ServiceResponse,
		StatusHistoryRow,
		UpdateServiceInput,
		UptimeData
	} from '$lib/types';

	interface ServiceCardData {
		id: number;
		service: Service;
		uptimeData: UptimeData[];
	}

	type AuthState = 'initializing' | 'authenticated' | 'anonymous';
	interface AuthContext {
		readonly state: AuthState;
	}

	const DAY_IN_SECONDS = 24 * 60 * 60;
	const STATUS_WINDOW_DAYS = 90;
	const auth = getContext<AuthContext>('auth');

	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let mutationErrorMessage = $state<string | null>(null);
	let showCreateModal = $state(false);
	let services = $state<ServiceCardData[]>([]);
	const serviceUsageLabel = $derived(`已用空間: ${services.length} / 2`);

	const transformStatusHistoryToUptimeData = (
		statusHistory: StatusHistoryRow[],
		nowUnixSeconds: number
	): UptimeData[] => {
		const cutoff = nowUnixSeconds - STATUS_WINDOW_DAYS * DAY_IN_SECONDS;
		const rowsInWindow = statusHistory
			.filter((row) => row.checked_at >= cutoff)
			.sort((left, right) => left.checked_at - right.checked_at);
		const groupedByDate: Record<
			string,
			{
				totalChecks: number;
				upChecks: number;
				latencyTotal: number;
				latencyCount: number;
				incidents: number;
				lastIsUp: 0 | 1 | null;
			}
		> = {};

		for (const row of rowsInWindow) {
			const dayKey = new Date(row.checked_at * 1000).toISOString().slice(0, 10);
			const daySummary = groupedByDate[dayKey] ?? {
				totalChecks: 0,
				upChecks: 0,
				latencyTotal: 0,
				latencyCount: 0,
				incidents: 0,
				lastIsUp: null
			};

			daySummary.totalChecks += 1;

			if (row.is_up === 1) {
				daySummary.upChecks += 1;
			} else if (daySummary.lastIsUp !== 0) {
				daySummary.incidents += 1;
			}

			if (typeof row.latency_ms === 'number') {
				daySummary.latencyTotal += row.latency_ms;
				daySummary.latencyCount += 1;
			}

			daySummary.lastIsUp = row.is_up;
			groupedByDate[dayKey] = daySummary;
		}

		return Object.entries(groupedByDate)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([date, summary]) => {
				const uptimePercentage = (summary.upChecks / summary.totalChecks) * 100;
				const averageLatency =
					summary.latencyCount > 0 ? summary.latencyTotal / summary.latencyCount : 0;

				return {
					date,
					uptimePercentage: Math.round(uptimePercentage * 100) / 100,
					averageLatency: Math.round(averageLatency),
					totalPings: summary.totalChecks,
					incidents: summary.incidents
				};
			});
	};

	const toServiceViewModel = (service: ServiceResponse): Service => ({
		name: service.name,
		url: service.url,
		description: service.description ?? undefined
	});

	const toErrorMessage = (error: unknown): string => {
		if (error instanceof ApiClientError) {
			return error.message;
		}
		if (error instanceof Error) {
			return error.message;
		}
		return 'Failed to load dashboard data.';
	};

	const ensureAccessToken = async (): Promise<boolean> => {
		if (getAccessToken()) {
			return true;
		}

		if (auth.state === 'anonymous') {
			return false;
		}

		const response = await refresh();
		setAccessToken(response.accessToken);
		return true;
	};

	const loadDashboardData = async (): Promise<void> => {
		isLoading = true;
		errorMessage = null;

		try {
			const hasAccessToken = await ensureAccessToken();
			if (!hasAccessToken) {
				services = [];
				return;
			}
			const nowUnixSeconds = Math.floor(Date.now() / 1000);
			const { services: serviceRows } = await getServices();
			const statusHistories = await Promise.all(
				serviceRows.map((service) => getStatusHistory(service.id))
			);

			services = serviceRows.map((service, index) => ({
				id: service.id,
				service: toServiceViewModel(service),
				uptimeData: transformStatusHistoryToUptimeData(
					statusHistories[index].statusHistory,
					nowUnixSeconds
				)
			}));
		} catch (error) {
			services = [];
			errorMessage = toErrorMessage(error);
		} finally {
			isLoading = false;
		}
	};

	const handleCreateService = async (input: CreateServiceInput): Promise<void> => {
		mutationErrorMessage = null;
		try {
			const hasAccessToken = await ensureAccessToken();
			if (!hasAccessToken) {
				return;
			}
			await createService(input);
			await loadDashboardData();
		} catch (error) {
			mutationErrorMessage = toErrorMessage(error);
			throw error;
		}
	};

	const handleUpdateService = async (id: number, input: UpdateServiceInput): Promise<void> => {
		mutationErrorMessage = null;
		try {
			const hasAccessToken = await ensureAccessToken();
			if (!hasAccessToken) {
				return;
			}
			await updateService(id, input);
			await loadDashboardData();
		} catch (error) {
			mutationErrorMessage = toErrorMessage(error);
			throw error;
		}
	};

	const handleDeleteService = async (id: number): Promise<void> => {
		mutationErrorMessage = null;
		try {
			const hasAccessToken = await ensureAccessToken();
			if (!hasAccessToken) {
				return;
			}
			await deleteService(id);
			await loadDashboardData();
		} catch (error) {
			mutationErrorMessage = toErrorMessage(error);
			throw error;
		}
	};

	const openCreateModal = (): void => {
		mutationErrorMessage = null;
		showCreateModal = true;
	};

	const handleLogout = async (): Promise<void> => {
		try {
			await logout();
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			void goto(resolve('/login'));
		}
	};

	$effect(() => {
		if (!browser) {
			return;
		}

		void loadDashboardData();
	});

	$effect(() => {
		if (!browser) {
			return;
		}

		if (!getAccessToken()) {
			void goto(resolve('/login'));
		}
	});
</script>

<svelte:head>
	<meta
		name="description"
		content="Monitor your services with Ping Board. Track uptime, latency, and status history over 90 days. Reliable URL monitoring and status page management."
	/>
	<meta
		property="og:description"
		content="Monitor your services with Ping Board. Track uptime, latency, and status history over 90 days. Reliable URL monitoring and status page management."
	/>
	<title>Dashboard | Ping Board</title>
	<script type="application/ld+json">
		{
			"@context": "https://schema.org/",
			"@type": "WebSite",
			"name": "Dashboard | Ping Board",
			"url": "https://ping-board.hsieh-dev.us.ci/"
		}
	</script>
</svelte:head>

{#snippet statusPanel(message: string, tone: 'default' | 'destructive' = 'default')}
	<div
		class={`w-full max-w-5xl rounded-lg border-2 bg-surface p-8 text-center ${
			tone === 'destructive' ? 'border-destructive text-destructive' : 'border-border text-muted'
		}`}
		role={tone === 'destructive' ? 'alert' : undefined}
	>
		{message}
	</div>
{/snippet}

<div class="relative flex h-dvh w-dvw flex-col items-center">
	<header
		class="relative mb-8 flex h-18 w-full items-center justify-center bg-surface px-6 font-header text-4xl font-bold"
	>
		<span>Ping Board</span>
		<button
			class="absolute right-3 flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-base
						font-normal text-muted transition-colors hover:border-destructive hover:text-destructive"
			onclick={handleLogout}
			aria-label="Log out"
		>
			<LogOut size={18} />
			<div class="max-[32rem]:hidden">登出</div>
		</button>
	</header>
	<div class="flex w-full flex-col items-center gap-6 px-4">
		{#if mutationErrorMessage}
			<div
				class="w-full max-w-5xl rounded-lg border-2 border-destructive bg-surface p-4 text-center text-destructive"
				role="alert"
			>
				{mutationErrorMessage}
			</div>
		{/if}

		<div class="flex w-full max-w-5xl items-center justify-end gap-6 px-6 py-2">
			<div class="text-lg">{serviceUsageLabel}</div>
			<button
				class="flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1"
				onclick={openCreateModal}
				aria-label="Add service"
			>
				<Plus size={18} />
				新增服務
			</button>
		</div>

		{#if isLoading}
			{@render statusPanel('Loading services...')}
		{:else if errorMessage}
			{@render statusPanel(errorMessage, 'destructive')}
		{:else if services.length > 0}
			{#each services as item (item.id)}
				<UptimeBar
					serviceId={item.id}
					service={item.service}
					uptimeData={item.uptimeData}
					onUpdateService={handleUpdateService}
					onDeleteService={handleDeleteService}
				/>
			{/each}
		{:else}
			{@render statusPanel('No services available yet.')}
		{/if}
	</div>

	<div class="absolute right-6 bottom-6">
		<button
			class="flex h-15 w-15 cursor-pointer items-center justify-center rounded-full bg-primary transition-transform duration-300
						ease-in-out hover:scale-110"
			onclick={openCreateModal}
			aria-label="Add service"
		>
			<Plus size={34} />
		</button>
	</div>
</div>

{#if showCreateModal}
	<ServiceEditModal
		mode="create"
		service={{ name: '', url: '', description: '' }}
		bind:show={showCreateModal}
		onCreate={handleCreateService}
	/>
{/if}
