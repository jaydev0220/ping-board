import { dev } from '$app/environment';
import { setRefreshTokenCookie } from '$lib/cookie-helper';
import {
	forwardAuthorizationHeader,
	forwardContentHeaders,
	forwardCookieHeader,
	RELAY_API_BASE_URL,
	relayPayload
} from '$lib/relay';
import type { RequestHandler } from './$types';

type RegisterRelayPayload = Record<string, unknown> & {
	refreshToken?: unknown;
};

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const body = await request.json();
	const headers = new Headers(forwardContentHeaders(request));
	headers.set('authorization', forwardAuthorizationHeader(request).get('authorization') ?? '');
	headers.set('cookie', forwardCookieHeader(request).get('cookie') ?? '');
	headers.set('content-type', headers.get('content-type') ?? 'application/json');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/auth/register`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	const payload = (await upstream.json()) as RegisterRelayPayload;

	if (typeof payload.refreshToken === 'string') {
		setRefreshTokenCookie(cookies, payload.refreshToken, dev);
		delete payload.refreshToken;
	}

	return relayPayload(payload, upstream.status);
};
