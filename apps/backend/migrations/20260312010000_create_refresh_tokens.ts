import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.raw(`
		CREATE TABLE refresh_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token_hash TEXT NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);
	await knex.schema.raw(`
		CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id)
	`);
	await knex.schema.raw(`
		CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)
	`);
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.raw('DROP INDEX IF EXISTS idx_refresh_tokens_expires_at');
	await knex.schema.raw('DROP INDEX IF EXISTS idx_refresh_tokens_user_id');
	await knex.schema.raw('DROP TABLE IF EXISTS refresh_tokens');
}
