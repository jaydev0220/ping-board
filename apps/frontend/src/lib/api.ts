import { env } from '$env/dynamic/public';
import type {
	AuthCredentials,
	AuthResponse,
	CreateServiceInput,
	RegisterResponse,
	ServiceResponseEnvelope,
	ServiceStatusResponse,
	ServicesResponse,
	UpdateServiceInput
} from './types';

const API_BASE_URL = (env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/+$/, '');
let accessToken: string | null = null;

export interface ApiErrorPayload {
	error: string;
	details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
	status: number;
	details?: Record<string, unknown>;

	constructor(status: number, message: string, details?: Record<string, unknown>) {
		super(message);
		this.name = 'ApiClientError';
		this.status = status;
		this.details = details;
	}
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ApiRequestOptions<TBody> {
	method: HttpMethod;
	path: string;
	body?: TBody;
	requireAuth?: boolean;
	includeCredentials?: boolean;
}

export function setAccessToken(token: string): void {
	accessToken = token;
}

export function getAccessToken(): string | null {
	return accessToken;
}

export function clearAccessToken(): void {
	accessToken = null;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const payload = value as Partial<ApiErrorPayload>;
	return typeof payload.error === 'string';
}

function buildHeaders(requireAuth: boolean): Headers {
	const headers = new Headers({
		Accept: 'application/json'
	});

	if (requireAuth) {
		if (!accessToken) {
			throw new ApiClientError(401, 'Authorization token missing');
		}
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	return headers;
}

function toUrl(path: string): string {
	return `${API_BASE_URL}${path}`;
}

function assertPositiveId(id: number): void {
	if (!Number.isInteger(id) || id <= 0) {
		throw new TypeError('id must be a positive integer');
	}
}

async function parseJsonSafely(response: Response): Promise<unknown | null> {
	if (response.status === 204) {
		return null;
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.toLowerCase().includes('application/json')) {
		return null;
	}

	try {
		return await response.json();
	} catch {
		return null;
	}
}

function toApiClientError(status: number, payload: unknown): ApiClientError {
	if (isApiErrorPayload(payload)) {
		return new ApiClientError(status, payload.error, payload.details);
	}

	return new ApiClientError(status, 'Unexpected API error response');
}

async function request<TResponse, TBody = undefined>(
	options: ApiRequestOptions<TBody>
): Promise<TResponse> {
	const { method, path, body, requireAuth = false, includeCredentials = false } = options;
	const headers = buildHeaders(requireAuth);

	const init: RequestInit = {
		method,
		headers,
		credentials: includeCredentials ? 'include' : 'same-origin'
	};

	if (body !== undefined) {
		headers.set('Content-Type', 'application/json');
		init.body = JSON.stringify(body);
	}

	const response = await fetch(toUrl(path), init);
	const payload = await parseJsonSafely(response);

	if (!response.ok) {
		throw toApiClientError(response.status, payload);
	}

	return payload as TResponse;
}

export function register(input: AuthCredentials): Promise<RegisterResponse> {
	return request<RegisterResponse, AuthCredentials>({
		method: 'POST',
		path: '/auth/register',
		body: input
	});
}

export function login(input: AuthCredentials): Promise<AuthResponse> {
	return request<AuthResponse, AuthCredentials>({
		method: 'POST',
		path: '/auth/login',
		body: input,
		includeCredentials: true
	});
}

export function refresh(): Promise<AuthResponse> {
	return request<AuthResponse>({
		method: 'POST',
		path: '/auth/refresh',
		includeCredentials: true
	});
}

export function getServices(): Promise<ServicesResponse> {
	return request<ServicesResponse>({
		method: 'GET',
		path: '/services',
		requireAuth: true
	});
}

export function createService(input: CreateServiceInput): Promise<ServiceResponseEnvelope> {
	return request<ServiceResponseEnvelope, CreateServiceInput>({
		method: 'POST',
		path: '/services',
		body: input,
		requireAuth: true
	});
}

export function updateService(
	id: number,
	input: UpdateServiceInput
): Promise<ServiceResponseEnvelope> {
	assertPositiveId(id);
	return request<ServiceResponseEnvelope, UpdateServiceInput>({
		method: 'PATCH',
		path: `/services/${id}`,
		body: input,
		requireAuth: true
	});
}

export async function deleteService(id: number): Promise<void> {
	assertPositiveId(id);
	await request<null>({
		method: 'DELETE',
		path: `/services/${id}`,
		requireAuth: true
	});
}

export function getStatusHistory(id: number): Promise<ServiceStatusResponse> {
	assertPositiveId(id);
	return request<ServiceStatusResponse>({
		method: 'GET',
		path: `/status/${id}`,
		requireAuth: true
	});
}
