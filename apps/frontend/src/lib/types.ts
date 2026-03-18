export type BinaryInt = 0 | 1;

export interface Service {
	name: string;
	url: string;
	description?: string;
}

export interface ServiceResponse {
	id: number;
	name: string;
	url: string;
	description: string | null;
	is_active: BinaryInt;
	created_at: number;
	created_by: number;
}

export interface AuthCredentials {
	username: string;
	password: string;
}

export interface AuthUser {
	id: number;
	username: string;
}

export interface RegisterResponse {
	message: string;
}

export interface AuthResponse {
	user: AuthUser;
	accessToken: string;
	refreshToken?: string; // Optional: for future token rotation in response body
}

export interface CreateServiceInput {
	name: string;
	url: string;
	description?: string;
}

export interface UpdateServiceInput {
	name?: string;
	description?: string;
}

export interface ServicesResponse {
	services: ServiceResponse[];
}

export interface ServiceResponseEnvelope {
	service: ServiceResponse;
}

export interface StatusHistoryRow {
	is_up: BinaryInt;
	status_code: number | null;
	latency_ms: number | null;
	checked_at: number;
}

export interface ServiceStatusResponse {
	statusHistory: StatusHistoryRow[];
}

export interface UptimeData {
	date: string;
	uptimePercentage: number;
	averageLatency: number;
}
