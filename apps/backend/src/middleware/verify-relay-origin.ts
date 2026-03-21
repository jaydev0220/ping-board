import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from './error.js';

const RELAY_SECRET_HEADER = 'x-relay-secret';const hasExpectedRelaySecret = (headerValue: string | undefined): boolean =>
	typeof headerValue === 'string' &&
	headerValue.length > 0 &&
	env.relaySecret.length > 0 &&
	headerValue === env.relaySecret;

export const verifyRelayOrigin: RequestHandler = (req, _res, next) => {
	if (!hasExpectedRelaySecret(req.header(RELAY_SECRET_HEADER))) {
		throw new AppError(403, '未授權的中繼請求');
	}

	next();
};
