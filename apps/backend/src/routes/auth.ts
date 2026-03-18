import { Router } from 'express';
import { env } from '../config/env.js';
import { LoginSchema, RegisterSchema } from '../schemas/auth.js';
import {
	loginUser,
	refreshAccessToken,
	registerUser
} from '../services/auth.js';
import type { CookieOptions } from 'express';

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS: CookieOptions = {
	httpOnly: true,
	secure: env.nodeEnv === 'production',
	sameSite: 'strict',
	path: '/auth/refresh',
	maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

export const authRouter = Router();

// POST /auth/register
authRouter.post('/register', async (req, res) => {
	const parsed = RegisterSchema.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			error: 'Validation error',
			details: parsed.error.flatten().fieldErrors
		});
		return;
	}

	await registerUser(parsed.data);
	res.status(201).json({ message: 'User registered successfully' });
});
// POST /auth/login
authRouter.post('/login', async (req, res) => {
	const parsed = LoginSchema.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			error: 'Validation error',
			details: parsed.error.flatten().fieldErrors
		});
		return;
	}

	const { user, accessToken, refreshToken } = await loginUser(parsed.data);

	res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
	res
		.status(200)
		.json({ user: { id: user.id, username: user.username }, accessToken });
});
// POST /auth/refresh
authRouter.post('/refresh', async (req, res) => {
	const raw = req.cookies?.refreshToken as string | undefined;

	if (!raw) {
		res.status(401).json({ error: 'Refresh token missing' });
		return;
	}

	const { user, accessToken, refreshToken } = await refreshAccessToken(raw);

	res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
	res
		.status(200)
		.json({ user: { id: user.id, username: user.username }, accessToken });
});
