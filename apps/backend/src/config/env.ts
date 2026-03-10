import path from 'node:path';

import { z } from 'zod';

const rawEnvSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
	HOST: z.string().trim().min(1).default('127.0.0.1'),
	PORT: z.coerce.number().int().min(1).max(65535).default(3001),
	SQLITE_PATH: z.string().trim().min(1).default('./data/ping-board.sqlite3'),
	CORS_ALLOWED_ORIGINS: z.string().trim().default('http://localhost:5173')
});

const envSchema = rawEnvSchema.transform((input, ctx) => {
	const corsAllowedOrigins = input.CORS_ALLOWED_ORIGINS.split(',')
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);

	for (const origin of corsAllowedOrigins) {
		if (!z.url().safeParse(origin).success) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['CORS_ALLOWED_ORIGINS'],
				message: `Invalid origin "${origin}". Expected a comma-separated list of absolute URLs.`
			});
		}
	}

	if (input.NODE_ENV === 'production' && corsAllowedOrigins.length === 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['CORS_ALLOWED_ORIGINS'],
			message: 'At least one allowed origin is required when NODE_ENV=production.'
		});
	}

	if (ctx.issues.length > 0) {
		return z.NEVER;
	}

	const sqlitePath = path.resolve(input.SQLITE_PATH);

	return {
		nodeEnv: input.NODE_ENV,
		host: input.HOST,
		port: input.PORT,
		sqlitePath,
		corsAllowedOrigins
	};
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
	const details = parsedEnv.error.issues
		.map((issue) => {
			const pathLabel = issue.path.length > 0 ? issue.path.join('.') : 'env';

			return `- ${pathLabel}: ${issue.message}`;
		})
		.join('\n');

	throw new Error(`Invalid backend environment configuration:\n${details}`);
}

export const env = parsedEnv.data;

export type Env = typeof env;
