import { dev } from '$app/environment';
import { setRefreshTokenCookie } from '$lib/cookie-helper';
import {
	forwardContentHeaders,
	forwardCookieHeader,
	RELAY_API_BASE_URL,
	relayPayload
} from '$lib/relay';
import type { RequestHandler } from './$types';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const rawBody = await request.text();
	const headers = new Headers(forwardContentHeaders(request));
	headers.set('cookie', forwardCookieHeader(request).get('cookie') ?? '');
	headers.set('content-type', headers.get('content-type') ?? 'application/json');
	headers.set('accept', headers.get('accept') ?? 'application/json');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/auth/login`, {
		method: 'POST',
		headers,
		body: rawBody
	});

	const payload: unknown = await upstream.json();

	if (!isObject(payload)) {
		return relayPayload(payload, upstream.status);
	}

	const refreshToken = payload['refreshToken'];
	if (typeof refreshToken === 'string' && refreshToken.length > 0) {
		setRefreshTokenCookie(cookies, refreshToken, dev);
		delete payload['refreshToken'];
	}

	return relayPayload(payload, upstream.status);
};
