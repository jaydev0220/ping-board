import { mkdirSync } from 'node:fs';
import path from 'node:path';

import knex, { type Knex } from 'knex';

import { env } from '../config/env.js';

const ensureSqliteDirectory = (filename: string): void => {
	if (filename === ':memory:') {
		return;
	}

	mkdirSync(path.dirname(filename), { recursive: true });
};

const createMigrationConfig = (filename: string): Knex.Config => ({
	client: 'better-sqlite3',
	useNullAsDefault: true,
	connection: {
		filename
	},
	migrations: {
		directory: path.resolve(import.meta.dirname, '../../migrations'),
		extension: 'ts'
	}
});

const applySqlitePragmas = async (database: Knex): Promise<void> => {
	await database.raw('PRAGMA journal_mode = WAL');
	await database.raw('PRAGMA foreign_keys = ON');
	await database.raw('PRAGMA busy_timeout = 5000');
	await database.raw('PRAGMA synchronous = NORMAL');
};

export const runMigrations = async (): Promise<void> => {
	ensureSqliteDirectory(env.sqlitePath);

	const migrationConnection = knex(createMigrationConfig(env.sqlitePath));

	try {
		await applySqlitePragmas(migrationConnection);
		await migrationConnection.migrate.latest();
	} finally {
		await migrationConnection.destroy();
	}
};

export const migrate = runMigrations;
