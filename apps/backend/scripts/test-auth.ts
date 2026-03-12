import * as readline from 'node:readline';

const BASE_URL = 'http://127.0.0.1:3001';
// State management
let lastExtractedToken: string | null = null;
// Initialize readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const prompt = (question: string): Promise<string> => {
	return new Promise((resolve) => {
		rl.question(question, resolve);
	});
};

const getTimestamp = (): string => {
	return new Date().toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
};

const extractRefreshToken = (setCookieHeader: string): string => {
	const parts = setCookieHeader.split(';')[0].split('=');
	return parts[1] || '';
};

const formatJsonResponse = (obj: unknown): string => {
	return JSON.stringify(obj, null, 2);
};

const displayResponse = (
	status: number,
	data: unknown,
	setCookieHeader?: string | null
): void => {
	console.log(`HTTP 狀態碼: ${status}`);
	console.log('回覆資料:');
	console.log(formatJsonResponse(data));

	if (setCookieHeader) {
		const token = extractRefreshToken(setCookieHeader);

		lastExtractedToken = token;
		console.log(`\n設置 Cookie: refreshToken=${token.substring(0, 20)}...`);
	}
};

const checkServerConnection = async (): Promise<boolean> => {
	try {
		const response = await fetch(`${BASE_URL}/health`, {
			method: 'GET',
			signal: AbortSignal.timeout(5000)
		});

		if (!response.ok) {
			throw new Error(`Health check failed with status ${response.status}`);
		}
		return true;
	} catch {
		console.error(`❌ 無法連線至 ${BASE_URL}`);
		return false;
	}
};

const testRegister = async (): Promise<void> => {
	console.log('\n--- POST /auth/register ---');

	const username = await prompt('使用者名稱: ');
	const password = await prompt('密碼: ');

	try {
		const response = await fetch(`${BASE_URL}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await response.json();
		const setCookieHeader = response.headers.get('set-cookie');

		console.log();
		console.log(`[${getTimestamp()}] POST /auth/register`);
		displayResponse(response.status, data, setCookieHeader);
	} catch (error) {
		console.error(`\n❌ 請求失敗: ${String(error)}`);
	}
};

const testLogin = async (): Promise<void> => {
	console.log('\n--- POST /auth/login ---');

	const username = await prompt('使用者名稱: ');
	const password = await prompt('密碼: ');

	try {
		const response = await fetch(`${BASE_URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		});
		const data = await response.json();
		const setCookieHeader = response.headers.get('set-cookie');

		console.log();
		console.log(`[${getTimestamp()}] POST /auth/login`);
		displayResponse(response.status, data, setCookieHeader);
	} catch (error) {
		console.error(`\n❌ 請求失敗: ${String(error)}`);
	}
};

const testRefresh = async (): Promise<void> => {
	console.log('\n--- POST /auth/refresh ---');

	if (!lastExtractedToken) {
		console.log('尚未登入');
		return;
	}

	const token = lastExtractedToken;

	try {
		const response = await fetch(`${BASE_URL}/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `refreshToken=${token}`
			}
		});
		const data = await response.json();
		const setCookieHeader = response.headers.get('set-cookie');

		console.log();
		console.log(`[${getTimestamp()}] POST /auth/refresh`);
		displayResponse(response.status, data, setCookieHeader);
	} catch (error) {
		console.error(`\n❌ 請求失敗: ${String(error)}`);
	}
};

const showMenu = (): void => {
	console.log('\n=== 身分驗證端點測試 ===');
	console.log('1. POST /auth/register (註冊)');
	console.log('2. POST /auth/login (登入)');
	console.log('3. POST /auth/refresh (刷新通行證)');
	console.log('4. 離開');
};

const main = async (): Promise<void> => {
	const isConnected = await checkServerConnection();

	if (!isConnected) {
		rl.close();
		process.exit(1);
	}

	let running = true;

	while (running) {
		showMenu();

		const option = await prompt('\n選擇操作 (1-4): ');

		switch (option.trim()) {
			case '1':
				await testRegister();
				break;
			case '2':
				await testLogin();
				break;
			case '3':
				await testRefresh();
				break;
			case '4':
				running = false;
				break;
			default:
				break;
		}
	}

	rl.close();
	process.exit(0);
};

// Run the interactive menu
await main();
