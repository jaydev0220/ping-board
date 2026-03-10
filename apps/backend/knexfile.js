/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
export default {
	development: {
		client: 'better-sqlite3',
		useNullAsDefault: true,
		connection: { filename: './dev.sqlite3' },
		migrations: {
			directory: './migrations',
			extension: 'ts'
		}
	},
	production: {
		client: 'better-sqlite3',
		useNullAsDefault: true,
		connection: { filename: './prod.sqlite3' },
		migrations: {
			directory: './migrations',
			extension: 'ts'
		}
	}
};
