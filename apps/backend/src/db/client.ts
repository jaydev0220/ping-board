import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/env.js';

const ensureSqliteDirectory = (filename: string): void => {
	if (filename === ':memory:') {
		return;
	}

	mkdirSync(path.dirname(filename), { recursive: true });
};

const createDatabase = () => {
	ensureSqliteDirectory(env.sqlitePath);

	const database = new Database(env.sqlitePath);

	database.pragma('journal_mode = WAL');
	database.pragma('foreign_keys = ON');
	database.pragma('busy_timeout = 5000');
	database.pragma('synchronous = NORMAL');
	return database;
};

const globalForDatabase = globalThis as typeof globalThis & {
	__pingBoardDatabase?: ReturnType<typeof createDatabase>;
};

export const db = globalForDatabase.__pingBoardDatabase ?? createDatabase();

if (globalForDatabase.__pingBoardDatabase === undefined) {
	globalForDatabase.__pingBoardDatabase = db;
}

export default db;
