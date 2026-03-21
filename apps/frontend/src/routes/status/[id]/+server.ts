import { forwardAuthorizationHeader, RELAY_API_BASE_URL, relayJson } from '$lib/relay';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request, fetch }) => {
	const headers = new Headers(forwardAuthorizationHeader(request));
	headers.set('authorization', headers.get('authorization') ?? '');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/status/${encodeURIComponent(params.id)}`, {
		method: 'GET',
		headers
	});

	return relayJson(upstream);
};
