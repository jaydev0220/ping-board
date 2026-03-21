import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { verifyJwt } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { verifyRelayOrigin } from './middleware/verify-relay-origin.js';
import { authRouter } from './routes/auth.js';
import { servicesRouter } from './routes/services.js';
import { statusRouter } from './routes/status.js';

const createCorsOptions = (): CorsOptions => {
	const allowedOrigins = new Set(env.corsAllowedOrigins);
	return {
		origin(origin, callback) {
			if (origin === undefined || allowedOrigins.has(origin)) {
				callback(null, true);
				return;
			}

			callback(Object.assign(new Error('來源不被允許'), { status: 403 }));
		},
		credentials: true
	};
};

export const createApp = () => {
	const app = express();

	app.use(helmet());
	app.use(cors(createCorsOptions()));
	app.use(express.json());
	app.use(cookieParser());
	app.use('/auth', verifyRelayOrigin, authRouter);
	app.use('/services', verifyRelayOrigin, verifyJwt, servicesRouter);
	app.use('/status', verifyRelayOrigin, verifyJwt, statusRouter);
	app.get('/health', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});
	app.use(errorHandler);
	return app;
};
