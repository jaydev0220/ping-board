import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const BASE_URL = 'http://127.0.0.1:3001';// Get the sqlite path relative to the backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.resolve(__dirname, '../data/ping-board.sqlite3');

function extractRefreshToken(setCookieHeader: string): string {
	const parts = setCookieHeader.split(';')[0].split('=');
	return parts[1] || '';
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

async function testTokenRotation() {
	// Generate unique user
	const username = `test_${Date.now()}`;
	const password = 'TestPass123!@#';
	
	console.log('🧪 Testing Auth Token Rotation');
	console.log('================================\n');	// Step 1: Register
	console.log('1. Register new user...');

	const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});
	
	if (!registerResponse.ok) {
		const error = await registerResponse.json();

		throw new Error(`Registration failed: ${JSON.stringify(error)}`);
	}
	
	const registerData = await registerResponse.json();

	console.log(`   ✅ Registered user: ${username}`);
	console.log(`   📝 Response: ${registerData.message}`);	// Step 2: Login
	console.log('\n2. Login to get initial refresh token...');

	const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});
	
	if (!loginResponse.ok) {
		const error = await loginResponse.json();

		throw new Error(`Login failed: ${JSON.stringify(error)}`);
	}
	
	const loginData = await loginResponse.json();
	const loginSetCookie = loginResponse.headers.get('set-cookie');
	
	if (!loginSetCookie) {
		throw new Error('No Set-Cookie header in login response');
	}
	
	const originalToken = extractRefreshToken(loginSetCookie);

	console.log(`   ✅ Logged in successfully`);
	console.log(`   📝 Access token: ${loginData.accessToken.substring(0, 20)}...`);
	console.log(`   🍪 Refresh token: ${originalToken.substring(0, 20)}...`);
	console.log(`   🔍 Full Set-Cookie: ${loginSetCookie.substring(0, 100)}...`);	// Wait 1 second to ensure new token has different timestamp
	console.log('   ⏳ Waiting 1 second for timestamp difference...');
	await new Promise(resolve => setTimeout(resolve, 1000));	// Step 3: First refresh - should return NEW token
	console.log('\n3. First refresh (consume original token)...');

	const firstRefreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Cookie': `refreshToken=${originalToken}`
		}
	});
	
	if (!firstRefreshResponse.ok) {
		const error = await firstRefreshResponse.json();

		throw new Error(`First refresh failed: ${JSON.stringify(error)}`);
	}
	
	const firstRefreshData = await firstRefreshResponse.json();
	const firstRefreshSetCookie = firstRefreshResponse.headers.get('set-cookie');
	
	if (!firstRefreshSetCookie) {
		throw new Error('No Set-Cookie header in first refresh response');
	}
	
	const newToken = extractRefreshToken(firstRefreshSetCookie);

	console.log(`   ✅ First refresh succeeded`);
	console.log(`   📝 New access token: ${firstRefreshData.accessToken.substring(0, 20)}...`);
	console.log(`   🍪 New refresh token: ${newToken.substring(0, 20)}...`);
	console.log(`   🔍 Full Set-Cookie: ${firstRefreshSetCookie.substring(0, 100)}...`);
	console.log(`   🔄 Token rotated: ${originalToken !== newToken ? 'YES' : 'NO'}`);
	
	if (originalToken === newToken) {
		throw new Error('Token was not rotated! Old and new tokens are the same.');
	}
	
	// Step 4: Verify new token works
	console.log('\n4. Verify new token works...');

	const secondRefreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Cookie': `refreshToken=${newToken}`
		}
	});
	
	if (!secondRefreshResponse.ok) {
		const error = await secondRefreshResponse.json();

		throw new Error(`Second refresh failed: ${JSON.stringify(error)}`);
	}
	
	const secondRefreshData = await secondRefreshResponse.json();

	console.log(`   ✅ Second refresh succeeded`);
	console.log(`   📝 New access token: ${secondRefreshData.accessToken.substring(0, 20)}...`);	// Step 5: Verify old token is rejected (consumed)
	console.log('\n5. Verify old token is consumed (should fail)...');

	const oldTokenRefreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Cookie': `refreshToken=${originalToken}`
		}
	});
	
	if (oldTokenRefreshResponse.ok) {
		throw new Error('Old token should have been rejected but was accepted!');
	}	if (oldTokenRefreshResponse.status !== 401) {
		throw new Error(`Expected 401 status but got ${oldTokenRefreshResponse.status}`);
	}
	
	console.log(`   ✅ Old token rejected with 401 status`);

	const oldTokenError = await oldTokenRefreshResponse.json();

	console.log(`   📝 Error message: ${oldTokenError.error}`);	// Step 6: Check database - old token should be marked as consumed
	console.log('\n6. Check database for consumed_at timestamp...');

	const db = new Database(sqlitePath);
	
	try {
		const originalTokenHash = hashToken(originalToken);		const stmt = db.prepare(`
			SELECT id, token_hash, consumed_at, created_at, expires_at
			FROM refresh_tokens
			WHERE token_hash = ?
		`);		const row = stmt.get(originalTokenHash) as {
			id: number;
			token_hash: string;
			consumed_at: number | null;
			created_at: number;
			expires_at: number;
		} | undefined;
		
		if (!row) {
			throw new Error('Original token not found in database');
		}		if (row.consumed_at === null) {
			throw new Error('Token consumed_at is NULL! Token should be marked as consumed.');
		}
		
		const consumedDate = new Date(row.consumed_at * 1000);

		console.log(`   ✅ Token marked as consumed`);
		console.log(`   📝 Consumed at: ${consumedDate.toISOString()}`);
		console.log(`   📝 Token ID: ${row.id}`);
		console.log(`   📝 Token hash: ${row.token_hash.substring(0, 20)}...`);
		
	} finally {
		db.close();
	}
	
	console.log('\n================================');
	console.log('✅ All checks passed!');
	console.log('================================\n');
	console.log('Summary:');
	console.log('  ✓ Token rotation works correctly');
	console.log('  ✓ New tokens can be used');
	console.log('  ✓ Old tokens are rejected');
	console.log('  ✓ Database records consumption time');
}

// Main execution
try {
	await testTokenRotation();
} catch (error) {
	console.error('\n❌ Test failed:');
	console.error(error);
	process.exit(1);
}
