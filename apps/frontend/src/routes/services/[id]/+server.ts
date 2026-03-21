import { forwardAuthorizationHeader, RELAY_API_BASE_URL, relayJsonOrNoContent } from '$lib/relay';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, fetch }) => {
	const body = await request.json();
	const headers = new Headers(forwardAuthorizationHeader(request));
	headers.set('authorization', headers.get('authorization') ?? '');
	headers.set('content-type', 'application/json');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/services/${encodeURIComponent(params.id)}`, {
		method: 'PATCH',
		headers,
		body: JSON.stringify(body)
	});

	return relayJsonOrNoContent(upstream);
};

export const DELETE: RequestHandler = async ({ params, request, fetch }) => {
	const headers = new Headers(forwardAuthorizationHeader(request));
	headers.set('authorization', headers.get('authorization') ?? '');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/services/${encodeURIComponent(params.id)}`, {
		method: 'DELETE',
		headers
	});

	return relayJsonOrNoContent(upstream);
};
