import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(backendDirectory, 'migrations');
const defaultSqliteFilename = path.resolve(
	process.env.SQLITE_PATH ?? './data/ping-board.sqlite3'
);

/**
 * @param {string} filename
 * @returns {import('knex').Knex.Config}
 */
export const createSqliteKnexConfig = (filename = defaultSqliteFilename) => ({
	client: 'better-sqlite3',
	useNullAsDefault: true,
	connection: {
		filename
	},
	migrations: {
		directory: migrationsDirectory,
		extension: 'ts'
	}
});

/**
 * @type {Record<'development' | 'test' | 'production', import('knex').Knex.Config>}
 */
const config = {
	development: createSqliteKnexConfig(),
	test: createSqliteKnexConfig(),
	production: createSqliteKnexConfig()
};

export default config;
