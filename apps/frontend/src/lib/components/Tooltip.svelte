<script lang="ts">
	import BadgeCircle from './BadgeCircle.svelte';

	interface TooltipProps {
		visible: boolean;
		x: number;
		y: number;
		dateText: string;
		totalPings: number;
		incidents: number;
		uptimePercentage: number;
		badgeClass: string;
	}

	const HORIZONTAL_MARGIN = 12;
	const VERTICAL_OFFSET = 10;
	const EDGE_PADDING = 8;
	const FALLBACK_WIDTH = 220;
	const FALLBACK_HEIGHT = 116;

	let {
		visible,
		x,
		y,
		dateText,
		totalPings,
		incidents,
		uptimePercentage,
		badgeClass
	}: TooltipProps = $props();

	let tooltipEl = $state<HTMLDivElement | null>(null);
	let measuredWidth = $state(FALLBACK_WIDTH);
	let measuredHeight = $state(FALLBACK_HEIGHT);
	let viewportWidth = $state(1024);
	let viewportHeight = $state(768);

	$effect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const updateViewport = () => {
			viewportWidth = window.innerWidth;
			viewportHeight = window.innerHeight;
		};

		updateViewport();
		window.addEventListener('resize', updateViewport);

		return () => {
			window.removeEventListener('resize', updateViewport);
		};
	});

	$effect(() => {
		if (!visible || !tooltipEl) {
			return;
		}

		const rect = tooltipEl.getBoundingClientRect();
		measuredWidth = rect.width || FALLBACK_WIDTH;
		measuredHeight = rect.height || FALLBACK_HEIGHT;
	});

	const left = $derived.by(() => {
		const centerAlignedLeft = x - measuredWidth / 2;
		const maxLeft = Math.max(HORIZONTAL_MARGIN, viewportWidth - measuredWidth - HORIZONTAL_MARGIN);
		return Math.min(Math.max(centerAlignedLeft, HORIZONTAL_MARGIN), maxLeft);
	});

	const showAbove = $derived(y - measuredHeight - VERTICAL_OFFSET >= EDGE_PADDING);

	const top = $derived.by(() => {
		if (showAbove) {
			return Math.max(EDGE_PADDING, y - measuredHeight - VERTICAL_OFFSET);
		}

		const below = y + VERTICAL_OFFSET;
		const maxTop = Math.max(EDGE_PADDING, viewportHeight - measuredHeight - EDGE_PADDING);
		return Math.min(below, maxTop);
	});

	const uptimeText = $derived(`${uptimePercentage.toFixed(2)}%`);
</script>

{#if visible}
	<div
		bind:this={tooltipEl}
		class="pointer-events-none fixed z-50 w-50 rounded-lg border border-border/70 bg-surface/95 px-3 py-2 text-sm text-text shadow-lg shadow-black/30 backdrop-blur-[1px]"
		style={`left: ${left}px; top: ${top}px;`}
		role="tooltip"
	>
		<div class="mb-2 flex items-center gap-2 border-b border-border/50 pb-1.5">
			<BadgeCircle className={badgeClass} />
			<span class="font-medium text-text">{dateText}</span>
		</div>

		<dl class="space-y-1.5">
			<div class="flex items-center justify-between gap-3">
				<dt class="text-muted">總檢查次數</dt>
				<dd class="font-semibold">{totalPings.toLocaleString('zh-TW')}</dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-muted">服務中斷次數</dt>
				<dd class="font-semibold">{incidents.toLocaleString('zh-TW')}</dd>
			</div>
			<div class="flex items-center justify-between gap-3">
				<dt class="text-muted">可用性</dt>
				<dd class="font-semibold">{uptimeText}</dd>
			</div>
		</dl>
	</div>
{/if}
