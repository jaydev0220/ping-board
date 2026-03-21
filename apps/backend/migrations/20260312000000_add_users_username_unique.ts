import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.raw('PRAGMA foreign_keys = OFF');

	try {
		await knex.schema.raw(`
			CREATE TABLE users_new (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL UNIQUE,
				pwd_hash TEXT NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		await knex.schema.raw(`INSERT INTO users_new SELECT * FROM users`);
		await knex.schema.raw(`DROP TABLE users`);
		await knex.schema.raw(`ALTER TABLE users_new RENAME TO users`);
	} finally {
		await knex.schema.raw('PRAGMA foreign_keys = ON');
	}
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.raw('PRAGMA foreign_keys = OFF');

	try {
		await knex.schema.raw(`
			CREATE TABLE users_new (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL,
				pwd_hash TEXT NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		await knex.schema.raw(`INSERT INTO users_new SELECT * FROM users`);
		await knex.schema.raw(`DROP TABLE users`);
		await knex.schema.raw(`ALTER TABLE users_new RENAME TO users`);
	} finally {
		await knex.schema.raw('PRAGMA foreign_keys = ON');
	}
}
