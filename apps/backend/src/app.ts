import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';

const createCorsOptions = (): CorsOptions => {
	const allowedOrigins = new Set(env.corsAllowedOrigins);

	return {
		origin(origin, callback) {
			if (origin === undefined || allowedOrigins.has(origin)) {
				callback(null, true);
				return;
			}

			callback(Object.assign(new Error('Origin not allowed'), { status: 403 }));
		}
	};
};

export const createApp = () => {
	const app = express();

	app.use(helmet());
	app.use(cors(createCorsOptions()));
	app.use(express.json());

	app.get('/health', (_req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use(errorHandler);

	return app;
};
