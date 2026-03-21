import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

const DEFAULT_API_BASE_URL = 'http://localhost:3001';

type RelayHeaderName = 'authorization' | 'cookie' | 'content-type' | 'accept';

const hasHeaderValue = (value: string | null): value is string =>
	value !== null && value.length > 0;

export const RELAY_API_BASE_URL = (env.PRIVATE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
	/\/+$/,
	''
);
const RELAY_SECRET_HEADER = 'x-relay-secret';

const getRelaySecret = (): string => {
	const relaySecret = env.PRIVATE_RELAY_SECRET;

	if (typeof relaySecret !== 'string' || relaySecret.length === 0) {
		throw new Error('Missing PRIVATE_RELAY_SECRET');
	}
	return relaySecret;
};

export const withRelaySecretHeader = (headers: Headers): Headers => {
	headers.set(RELAY_SECRET_HEADER, getRelaySecret());
	return headers;
};

export function forwardRelayHeaders(
	request: Request,
	headerNames: readonly RelayHeaderName[]
): Headers {
	const forwarded = new Headers();

	for (const headerName of headerNames) {
		const headerValue = request.headers.get(headerName);
		if (hasHeaderValue(headerValue)) {
			forwarded.set(headerName, headerValue);
		}
	}

	return forwarded;
}

export const forwardAuthorizationHeader = (request: Request): Headers =>
	forwardRelayHeaders(request, ['authorization']);

export const forwardCookieHeader = (request: Request): Headers =>
	forwardRelayHeaders(request, ['cookie']);

export const forwardContentHeaders = (request: Request): Headers =>
	forwardRelayHeaders(request, ['content-type', 'accept']);

export async function relayJson(upstream: Response): Promise<Response> {
	const payload: unknown = await upstream.json();
	return json(payload, { status: upstream.status });
}

export function relayPayload(payload: unknown, status: number): Response {
	return json(payload, { status });
}

export async function relayJsonOrNoContent(upstream: Response): Promise<Response> {
	if (upstream.status === 204) {
		return new Response(null, { status: upstream.status });
	}

	return relayJson(upstream);
}
