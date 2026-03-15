import type { Service, StatusHistoryRow } from './types';

function getStatusHistory(_service: Service): StatusHistoryRow[] {
	const history: StatusHistoryRow[] = [];
	const days = Math.random() * 90 + 1;
	const now = Date.now();
	const startTime = now - days * 24 * 60 * 60 * 1000;

	for (let i = 0; i < days; i++) {
		for (let j = 0; j < 288; j++) {
			const checked_at = startTime + (i * 288 + j) * 5 * 60 * 1000;
			const is_up = Math.random() > 0.001 ? 1 : 0;

			history.push({
				is_up,
				status_code: is_up ? 200 : 500,
				latency_ms: is_up ? Math.floor(Math.random() * 500 + 20) : null,
				checked_at
			});
		}
	}

	return history.sort((a, b) => b.checked_at - a.checked_at);
}

export function getUptimeData(service: Service) {
	const grouped = new Map<string, { upCount: number; total: number; totalLatency: number }>();
	const statusHistory = getStatusHistory(service);

	for (let i = 0; i < statusHistory.length; i++) {
		const history = statusHistory[i];
		const date = new Date(history.checked_at).toISOString().slice(0, 10);

		if (!grouped.has(date)) {
			grouped.set(date, { upCount: 0, total: 0, totalLatency: 0 });
		}

		const entry = grouped.get(date)!;
		entry.total++;

		if (history.is_up) {
			entry.upCount++;
			entry.totalLatency += history.latency_ms ?? 0;
		}
	}

	return Array.from(grouped.entries()).map(([date, { upCount, total, totalLatency }]) => ({
		date,
		uptimePercentage: (upCount / total) * 100,
		averageLatency: upCount > 0 ? totalLatency / upCount : 0
	}));
}
