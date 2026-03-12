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
	console.log(`Status: ${status}`);
	console.log('Response:');
	console.log(formatJsonResponse(data));

	if (setCookieHeader) {
		const token = extractRefreshToken(setCookieHeader);

		lastExtractedToken = token;
		console.log(
			`\nSet-Cookie extracted: refreshToken=${token.substring(0, 20)}...`
		);
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
		console.error(`❌ Server connection error: Cannot connect to ${BASE_URL}`);
		console.error(
			`   Make sure the server is running on http://127.0.0.1:3001`
		);
		return false;
	}
};

const testRegister = async (): Promise<void> => {
	console.log('\n--- POST /auth/register ---');

	const username = await prompt('Enter username: ');
	const password = await prompt('Enter password: ');

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
		console.error(`\n❌ Request failed: ${String(error)}`);
	}
};

const testLogin = async (): Promise<void> => {
	console.log('\n--- POST /auth/login ---');

	const username = await prompt('Enter username: ');
	const password = await prompt('Enter password: ');

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
		console.error(`\n❌ Request failed: ${String(error)}`);
	}
};

const testRefresh = async (): Promise<void> => {
	console.log('\n--- POST /auth/refresh ---');

	if (lastExtractedToken) {
		console.log(
			`Last extracted token: ${lastExtractedToken.substring(0, 20)}...`
		);
	}

	const tokenInput = await prompt(
		"Enter refresh token (or 'auto' to use last extracted): "
	);
	const token = tokenInput === 'auto' ? lastExtractedToken : tokenInput;

	if (!token) {
		console.error(
			'❌ No refresh token provided and no token extracted from previous requests.'
		);
		return;
	}

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
		console.error(`\n❌ Request failed: ${String(error)}`);
	}
};

const showMenu = (): void => {
	console.log('\n=== Auth Endpoint Tester ===');
	console.log('1. POST /auth/register');
	console.log('2. POST /auth/login');
	console.log('3. POST /auth/refresh');
	console.log('4. Exit');
};

const main = async (): Promise<void> => {
	console.log('Checking server connection...');

	const isConnected = await checkServerConnection();

	if (!isConnected) {
		rl.close();
		process.exit(1);
	}

	console.log('✅ Server connection OK\n');

	let running = true;

	while (running) {
		showMenu();

		const option = await prompt('\nSelect option (1-4): ');

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
				console.log('\nGoodbye!');
				break;
			default:
				console.log('❌ Invalid option. Please select 1-4.');
		}
	}

	rl.close();
	process.exit(0);
};

// Run the interactive menu
await main();
