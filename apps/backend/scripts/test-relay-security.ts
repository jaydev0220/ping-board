const BASE_URL = 'http://127.0.0.1:3001';
const MISSING_SECRET_ERROR = '未授權的中繼請求';
const RELAY_SECRET = process.env.RELAY_SECRET ?? 'dev-relay-secret-change-me';

interface ErrorResponse {
	error: string;
	details?: unknown;
}

const assert = (condition: unknown, message: string): asserts condition => {
	if (!condition) {
		throw new Error(message);
	}
};

const getJson = async <T>(response: Response): Promise<T> => {
	return (await response.json()) as T;
};

const checkServerConnection = async (): Promise<void> => {
	const response = await fetch(`${BASE_URL}/health`, {
		method: 'GET',
		signal: AbortSignal.timeout(5000)
	});

	assert(response.ok, `Health check failed with status ${response.status}`);
};

const assertRelayProtection = async (
	path: string,
	method: 'GET' | 'POST',
	body?: Record<string, unknown>
): Promise<void> => {
	const response = await fetch(`${BASE_URL}${path}`, {
		method,
		headers: {
			...(body ? { 'Content-Type': 'application/json' } : {})
		},
		body: body ? JSON.stringify(body) : undefined
	});
	const payload = await getJson<ErrorResponse>(response);

	assert(
		response.status === 403,
		`${method} ${path} expected 403, got ${response.status}`
	);
	assert(
		payload.error === MISSING_SECRET_ERROR,
		`${method} ${path} expected "${MISSING_SECRET_ERROR}", got "${payload.error}"`
	);
};

const assertAuthorizedRegister = async (): Promise<void> => {
	const username = `relay_ok_${Date.now()}`.slice(0, 20);
	const response = await fetch(`${BASE_URL}/auth/register`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Relay-Secret': RELAY_SECRET
		},
		body: JSON.stringify({
			username,
			password: 'RelayTest123!@#'
		})
	});
	const payload = await getJson<Record<string, unknown>>(response);

	assert(
		response.status === 201,
		`authorized register expected 201, got ${response.status}: ${JSON.stringify(payload)}`
	);
};

const run = async (): Promise<void> => {
	console.log('🧪 Testing relay secret enforcement');
	console.log('====================================\n');
	console.log('1. Check backend server connection...');
	await checkServerConnection();
	console.log('   ✅ Backend is reachable');	console.log('\n2. Verify auth routes reject missing relay header...');
	await assertRelayProtection('/auth/register', 'POST', {
		username: 'relay_test_user',
		password: 'RelayTest123!@#'
	});
	await assertRelayProtection('/auth/login', 'POST', {
		username: 'relay_test_user',
		password: 'RelayTest123!@#'
	});
	await assertRelayProtection('/auth/refresh', 'POST');
	console.log('   ✅ Auth routes are protected');	console.log('\n3. Verify protected data routes reject missing relay header...');
	await assertRelayProtection('/services', 'GET');
	await assertRelayProtection('/status/1', 'GET');
	console.log('   ✅ Data routes are protected');	console.log('\n4. Verify valid relay header is accepted...');
	await assertAuthorizedRegister();
	console.log('   ✅ Valid relay secret accepted');	console.log('\n====================================');
	console.log('✅ Relay security test passed!');
	console.log('====================================');
};

try {
	await run();
} catch (error) {
	console.error('\n❌ Relay security test failed:');
	console.error(error);
	process.exit(1);
}
