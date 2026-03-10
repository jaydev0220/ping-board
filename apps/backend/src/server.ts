import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';

const startServer = async () => {
	await runMigrations();

	const app = createApp();

	app.listen(env.port, env.host, () => {
		console.log(`Backend listening on http://${env.host}:${env.port}`);
	});
};

try {
	await startServer();
} catch (error) {
	console.error('Backend startup failed');

	if (error instanceof Error) {
		console.error(error.message);
	} else {
		console.error('Unknown startup error');
	}

	process.exit(1);
}
