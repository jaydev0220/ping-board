import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.raw(`
ALTER TABLE users ADD COLUMN service_quota INTEGER NOT NULL DEFAULT 2
`);
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.raw(`
CREATE TABLE users_new (
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT NOT NULL UNIQUE,
pwd_hash TEXT NOT NULL,
created_at INTEGER NOT NULL DEFAULT (unixepoch())
)
`);
	await knex.schema.raw(`
INSERT INTO users_new (id, username, pwd_hash, created_at)
SELECT id, username, pwd_hash, created_at FROM users
`);
	await knex.schema.raw(`DROP TABLE users`);
	await knex.schema.raw(`ALTER TABLE users_new RENAME TO users`);
}
