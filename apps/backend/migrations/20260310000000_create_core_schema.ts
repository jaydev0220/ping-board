import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.raw(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL,
			pwd_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);
	await knex.schema.raw(`
		CREATE TABLE services (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			url TEXT NOT NULL UNIQUE,
			description TEXT,
			is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
		)
	`);
	await knex.schema.raw(`
		CREATE TABLE ping_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
			is_up INTEGER NOT NULL CHECK (is_up IN (0, 1)),
			status_code INTEGER,
			latency_ms INTEGER,
			checked_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);
	await knex.schema.raw(`
		CREATE INDEX idx_ping_logs_service_checked
		ON ping_logs(service_id, checked_at DESC)
	`);
	await knex.schema.raw(`
		CREATE INDEX idx_ping_logs_checked_at
		ON ping_logs(checked_at DESC)
	`);
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.raw('DROP INDEX IF EXISTS idx_ping_logs_checked_at');
	await knex.schema.raw('DROP INDEX IF EXISTS idx_ping_logs_service_checked');
	await knex.schema.raw('DROP TABLE IF EXISTS ping_logs');
	await knex.schema.raw('DROP TABLE IF EXISTS services');
	await knex.schema.raw('DROP TABLE IF EXISTS users');
}
