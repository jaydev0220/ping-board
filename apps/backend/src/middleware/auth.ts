import type { RequestHandler } from 'express';
import { errors, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { AppError } from './error.js';

const getSecretKey = (): Uint8Array => new TextEncoder().encode(env.jwtSecret);

const getBearerToken = (authorizationHeader: string | undefined): string => {
	if (authorizationHeader === undefined) {
		throw new AppError(401, 'Authorization token missing');
	}

	const [scheme, token, ...rest] = authorizationHeader.split(' ');

	if (
		scheme !== 'Bearer' ||
		token === undefined ||
		token.length === 0 ||
		rest.length > 0
	) {
		throw new AppError(401, 'Invalid authorization header');
	}
	return token;
};

const getUserIdFromSub = (sub: unknown): number => {
	if (typeof sub !== 'string' || !/^\d+$/.test(sub)) {
		throw new AppError(401, 'Invalid authorization token');
	}

	const userId = Number(sub);

	if (!Number.isSafeInteger(userId) || userId <= 0) {
		throw new AppError(401, 'Invalid authorization token');
	}
	return userId;
};

export const verifyJwt: RequestHandler = async (req, _res, next) => {
	const token = getBearerToken(req.header('authorization'));

	try {
		const { payload } = await jwtVerify(token, getSecretKey(), {
			algorithms: ['HS256']
		});

		req.user = { id: getUserIdFromSub(payload.sub) };
		next();
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}
		if (error instanceof errors.JOSEError) {
			throw new AppError(401, 'Invalid authorization token');
		}

		throw error;
	}
};
