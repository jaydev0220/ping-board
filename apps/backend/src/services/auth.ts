import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'node:crypto';
import { db } from '../db/client.js';
import { env } from '../config/env.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.js';
import { AppError } from '../middleware/error.js';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

export interface AuthUser {
	id: number;
	username: string;
}

// ─── Internal DB row shapes ──────────────────────────────────────────────────

interface UserRow {
	id: number;
	username: string;
	pwd_hash: string;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function hashToken(raw: string): string {
	return createHash('sha256').update(raw).digest('hex');
}

function parseTtlToSeconds(ttl: string): number {
	const match = /^(\d+)([dhm])$/.exec(ttl);

	if (!match) throw new Error(`Invalid TTL format: ${ttl}`);

	const value = parseInt(match[1]!, 10);
	const unit = match[2]!;
	const multipliers: Record<string, number> = { d: 86400, h: 3600, m: 60 };
	return value * multipliers[unit]!;
}

function getSecretKey(): Uint8Array {
	return new TextEncoder().encode(env.jwtSecret);
}

async function createAccessToken(
	userId: number,
	username: string
): Promise<string> {
	return new SignJWT({ sub: String(userId), username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(env.accessTokenTtl)
		.sign(getSecretKey());
}

async function createRefreshToken(userId: number): Promise<string> {
	return new SignJWT({ sub: String(userId) })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(env.refreshTokenTtl)
		.sign(getSecretKey());
}

function storeRefreshToken(userId: number, rawToken: string): void {
	const nowSecs = Math.floor(Date.now() / 1000);
	const expiresAt = nowSecs + parseTtlToSeconds(env.refreshTokenTtl);
	const tokenHash = hashToken(rawToken);

	// Prune expired tokens for this user before inserting
	db.prepare(
		'DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at <= ?'
	).run(userId, nowSecs);
	db.prepare(
		'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
	).run(userId, tokenHash, expiresAt);
}

// ─── Public Functions ────────────────────────────────────────────────────────

export async function registerUser(input: RegisterInput): Promise<void> {
	const existing = db
		.prepare<
			[string],
			{ id: number }
		>('SELECT id FROM users WHERE username = ?')
		.get(input.username);

	if (existing !== undefined) {
		throw new AppError(400, 'Username already taken');
	}

	const pwdHash = await argon2.hash(input.password);

	db.prepare('INSERT INTO users (username, pwd_hash) VALUES (?, ?)').run(
		input.username,
		pwdHash
	);
}

export async function loginUser(
	input: LoginInput
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
	const row = db
		.prepare<
			[string],
			UserRow
		>('SELECT id, username, pwd_hash FROM users WHERE username = ?')
		.get(input.username);

	if (row === undefined) {
		throw new AppError(401, 'Invalid credentials');
	}

	const passwordValid = await argon2.verify(row.pwd_hash, input.password);

	if (!passwordValid) {
		throw new AppError(401, 'Invalid credentials');
	}

	const user: AuthUser = { id: row.id, username: row.username };
	const [accessToken, refreshToken] = await Promise.all([
		createAccessToken(row.id, row.username),
		createRefreshToken(row.id)
	]);

	storeRefreshToken(row.id, refreshToken);
	return { user, accessToken, refreshToken };
}

export async function refreshAccessToken(
	rawRefreshToken: string
): Promise<{ user: AuthUser; accessToken: string }> {
	// Verify JWT signature and expiry first
	let sub: string;

	try {
		const { payload } = await jwtVerify(rawRefreshToken, getSecretKey(), {
			algorithms: ['HS256']
		});

		if (typeof payload.sub !== 'string') {
			throw new AppError(401, 'Invalid or expired refresh token');
		}

		sub = payload.sub;
	} catch (err) {
		if (err instanceof AppError) throw err;
		throw new AppError(401, 'Invalid or expired refresh token');
	}

	const userId = parseInt(sub, 10);

	if (!Number.isFinite(userId)) {
		throw new AppError(401, 'Invalid or expired refresh token');
	}

	// Look up hashed token in DB, guard against replay of expired tokens
	const nowSecs = Math.floor(Date.now() / 1000);
	const tokenHash = hashToken(rawRefreshToken);
	const tokenRow = db
		.prepare<
			[string, number],
			{ id: number }
		>('SELECT id FROM refresh_tokens WHERE token_hash = ? AND expires_at > ?')
		.get(tokenHash, nowSecs);

	if (tokenRow === undefined) {
		throw new AppError(401, 'Invalid or expired refresh token');
	}

	// Look up user (guards against cascade-deleted user)
	const userRow = db
		.prepare<
			[number],
			{ id: number; username: string }
		>('SELECT id, username FROM users WHERE id = ?')
		.get(userId);

	if (userRow === undefined) {
		throw new AppError(401, 'Invalid or expired refresh token');
	}

	const user: AuthUser = { id: userRow.id, username: userRow.username };
	const accessToken = await createAccessToken(userRow.id, userRow.username);
	return { user, accessToken };
}
