import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
process.chdir(root);

function jsonResponse(body, status) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

async function main() {
	const server = await createServer({
		root,
		server: { middlewareMode: true },
		appType: 'custom',
		logLevel: 'error'
	});

	try {
		const api = await server.ssrLoadModule('/src/lib/api.ts');
		const { setAccessToken, clearAccessToken, getServices } = api;

		let serviceCallCount = 0;
		let refreshCallCount = 0;

		globalThis.fetch = async (url) => {
			const target = String(url);
			if (target.endsWith('/services')) {
				serviceCallCount += 1;
				if (serviceCallCount === 1) {
					return jsonResponse({ error: 'Unauthorized' }, 401);
				}
				return jsonResponse({ services: [] }, 200);
			}

			if (target.endsWith('/auth/refresh')) {
				refreshCallCount += 1;
				return jsonResponse({ accessToken: 'token-after-refresh' }, 200);
			}

			throw new Error(`Unexpected URL in scenario 1: ${target}`);
		};

		setAccessToken('expired-token');
		await getServices();
		assert.equal(refreshCallCount, 1, 'scenario 1: should refresh once for a single 401');
		assert.equal(serviceCallCount, 2, 'scenario 1: should retry protected request exactly once');

		serviceCallCount = 0;
		refreshCallCount = 0;

		globalThis.fetch = async (url) => {
			const target = String(url);
			if (target.endsWith('/services')) {
				serviceCallCount += 1;
				if (serviceCallCount <= 2) {
					return jsonResponse({ error: 'Unauthorized' }, 401);
				}
				return jsonResponse({ services: [] }, 200);
			}

			if (target.endsWith('/auth/refresh')) {
				refreshCallCount += 1;
				return new Promise((resolve) => {
					setTimeout(() => resolve(jsonResponse({ accessToken: 'token-shared' }, 200)), 30);
				});
			}

			throw new Error(`Unexpected URL in scenario 2: ${target}`);
		};

		setAccessToken('expired-token-2');
		await Promise.all([getServices(), getServices()]);
		assert.equal(refreshCallCount, 1, 'scenario 2: concurrent 401s must share one refresh promise');
		assert.equal(
			serviceCallCount,
			4,
			'scenario 2: two initial 401s + two post-refresh retries expected'
		);

		clearAccessToken();
		console.log('frontend-401-smoke: PASS');
	} finally {
		await server.close();
	}
}

await main();
