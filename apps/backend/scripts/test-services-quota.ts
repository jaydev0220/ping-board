const BASE_URL = 'http://127.0.0.1:3001';
const EXPECTED_QUOTA_ERROR = '已達到服務上限（最多 2 個）';

interface LoginSuccessResponse {
	accessToken: string;
	user: {
		id: number;
		username: string;
	};
}

interface ServiceResponse {
	service: {
		id: number;
		name: string;
		url: string;
		description: string | null;
		is_active: 0 | 1;
		created_at: number;
		created_by: number;
	};
}

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

const createUniqueCredentials = () => {
	const seed = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)
		.toString(36)
		.padStart(2, '0')}`;
	return {
		username: `qt_${seed}`.slice(0, 20),
		password: 'QuotaTest123!@#'
	};
};

const checkServerConnection = async (): Promise<void> => {
	const response = await fetch(`${BASE_URL}/health`, {
		method: 'GET',
		signal: AbortSignal.timeout(5000)
	});

	assert(response.ok, `Health check failed with status ${response.status}`);
};

const registerUser = async (
	username: string,
	password: string
): Promise<void> => {
	const response = await fetch(`${BASE_URL}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});

	if (!response.ok) {
		const error = await getJson<ErrorResponse>(response);

		throw new Error(`註冊失敗: ${JSON.stringify(error)}`);
	}
};

const loginUser = async (
	username: string,
	password: string
): Promise<{ accessToken: string; setCookie: string }> => {
	const response = await fetch(`${BASE_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});

	if (!response.ok) {
		const error = await getJson<ErrorResponse>(response);

		throw new Error(`登入失敗: ${JSON.stringify(error)}`);
	}

	const data = await getJson<LoginSuccessResponse>(response);
	const setCookie = response.headers.get('set-cookie');

	assert(
		typeof data.accessToken === 'string' && data.accessToken.length > 0,
		'登入回應缺少 accessToken'
	);
	assert(setCookie !== null && setCookie.length > 0, '登入回應缺少 Set-Cookie');
	return { accessToken: data.accessToken, setCookie };
};

const createService = async (
	accessToken: string,
	sequence: number
): Promise<Response> => {
	return fetch(`${BASE_URL}/services`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`
		},
		body: JSON.stringify({
			name: `Quota Service ${sequence}`,
			url: `https://quota-service-${sequence}.example.com/health`,
			description: `Quota 測試服務 ${sequence}`
		})
	});
};

const run = async (): Promise<void> => {
	console.log('🧪 Testing POST /services quota limit');
	console.log('====================================\n');
	console.log('1. Check backend server connection...');
	await checkServerConnection();
	console.log('   ✅ Backend is reachable');

	const { username, password } = createUniqueCredentials();

	console.log('\n2. Register and login user...');
	await registerUser(username, password);

	const { accessToken } = await loginUser(username, password);

	console.log(`   ✅ Registered and logged in: ${username}`);
	console.log('\n3. Create first service (should succeed)...');

	const firstResponse = await createService(accessToken, 1);
	const firstData = await getJson<ServiceResponse | ErrorResponse>(
		firstResponse
	);

	assert(
		firstResponse.status === 201,
		`第一個服務建立失敗，狀態碼: ${firstResponse.status}`
	);
	assert('service' in firstData, '第一個服務建立回應格式不正確');
	console.log('   ✅ First service created');
	console.log('\n4. Create second service (should succeed)...');

	const secondResponse = await createService(accessToken, 2);
	const secondData = await getJson<ServiceResponse | ErrorResponse>(
		secondResponse
	);

	assert(
		secondResponse.status === 201,
		`第二個服務建立失敗，狀態碼: ${secondResponse.status}`
	);
	assert('service' in secondData, '第二個服務建立回應格式不正確');
	console.log('   ✅ Second service created');
	console.log('\n5. Create third service (should fail with quota error)...');

	const thirdResponse = await createService(accessToken, 3);
	const thirdData = await getJson<ErrorResponse>(thirdResponse);

	assert(
		thirdResponse.status === 400,
		`第三個服務預期 400，但得到 ${thirdResponse.status}`
	);
	assert(
		thirdData.error === EXPECTED_QUOTA_ERROR,
		`第三個服務錯誤訊息不符。預期: "${EXPECTED_QUOTA_ERROR}"，實際: "${thirdData.error}"`
	);
	console.log(
		`   ✅ Third service rejected with expected error: ${thirdData.error}`
	);
	console.log('\n====================================');
	console.log('✅ Services quota test passed!');
	console.log('====================================');
};

try {
	await run();
} catch (error) {
	console.error('\n❌ Services quota test failed:');
	console.error(error);
	process.exit(1);
}
