import {
	forwardAuthorizationHeader,
	RELAY_API_BASE_URL,
	relayJson,
	relayPayload
} from '$lib/relay';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, fetch }) => {
	const headers = new Headers(forwardAuthorizationHeader(request));
	headers.set('authorization', headers.get('authorization') ?? '');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/services`, {
		method: 'GET',
		headers
	});

	return relayJson(upstream);
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = await request.json();
	const headers = new Headers(forwardAuthorizationHeader(request));
	headers.set('authorization', headers.get('authorization') ?? '');
	headers.set('content-type', 'application/json');

	const upstream = await fetch(`${RELAY_API_BASE_URL}/services`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	const payload: unknown = await upstream.json();
	return relayPayload(payload, upstream.status);
};
