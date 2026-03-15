export interface Service {
	name: string;
	url: string;
	description?: string;
}

export interface StatusHistoryRow {
	is_up: 0 | 1;
	status_code: number | null;
	latency_ms: number | null;
	checked_at: number;
}

export interface UptimeData {
	date: string;
	uptimePercentage: number;
	averageLatency: number;
}
