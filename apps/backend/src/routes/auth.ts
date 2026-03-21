import { Router } from 'express';
import z from 'zod';
import { LoginSchema, RegisterSchema } from '../schemas/auth.js';
import {
	loginUser,
	refreshAccessToken,
	registerUser
} from '../services/auth.js';

export const authRouter = Router();

// POST /auth/register
authRouter.post('/register', async (req, res) => {
	const parsed = RegisterSchema.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			error: '無效的註冊資料',
			details: z.flattenError(parsed.error).fieldErrors
		});
		return;
	}

	await registerUser(parsed.data);
	res.status(201).json({ message: '註冊成功' });
});
// POST /auth/login
authRouter.post('/login', async (req, res) => {
	const parsed = LoginSchema.safeParse(req.body);

	if (!parsed.success) {
		res.status(400).json({
			error: '無效的登入資料',
			details: z.flattenError(parsed.error).fieldErrors
		});
		return;
	}

	const { user, accessToken, refreshToken } = await loginUser(parsed.data);

	res.status(200).json({
		user: { id: user.id, username: user.username },
		accessToken,
		refreshToken
	});
});
// POST /auth/refresh
authRouter.post('/refresh', async (req, res) => {
	const raw = req.cookies?.refreshToken as string | undefined;

	if (!raw) {
		res.status(401).json({ error: '缺少重新整理權杖' });
		return;
	}

	const { user, accessToken, refreshToken } = await refreshAccessToken(raw);

	res.status(200).json({
		user: { id: user.id, username: user.username },
		accessToken,
		refreshToken
	});
});
