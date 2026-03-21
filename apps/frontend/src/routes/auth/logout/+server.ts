import { dev } from '$app/environment';
import { deleteRefreshTokenCookie } from '$lib/cookie-helper';
import {
	forwardAuthorizationHeader,
	forwardCookieHeader,
	RELAY_API_BASE_URL,
	relayPayload
} from '$lib/relay';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const headers = new Headers(forwardAuthorizationHeader(request));
	headers.set('authorization', headers.get('authorization') ?? '');
	headers.set('cookie', forwardCookieHeader(request).get('cookie') ?? '');
	headers.set('accept', request.headers.get('accept') ?? 'application/json');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/auth/logout`, {
		method: 'POST',
		headers
	});
	const payload: unknown = await upstream.json();

	deleteRefreshTokenCookie(cookies, dev);
	return relayPayload(payload, upstream.status);
};
