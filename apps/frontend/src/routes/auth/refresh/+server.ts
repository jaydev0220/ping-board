import { dev } from '$app/environment';
import { setRefreshTokenCookie } from '$lib/cookie-helper';
import { forwardCookieHeader, RELAY_API_BASE_URL, relayPayload } from '$lib/relay';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const headers = new Headers(forwardCookieHeader(request));
	headers.set('cookie', headers.get('cookie') ?? '');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/auth/refresh`, {
		method: 'POST',
		headers
	});

	const payload = await upstream.json();

	if (payload && typeof payload === 'object' && 'refreshToken' in payload) {
		const refreshToken = payload['refreshToken'];
		if (typeof refreshToken === 'string' && refreshToken.length > 0) {
			setRefreshTokenCookie(cookies, refreshToken, dev);
		}
		delete payload['refreshToken'];
	}

	return relayPayload(payload, upstream.status);
};
