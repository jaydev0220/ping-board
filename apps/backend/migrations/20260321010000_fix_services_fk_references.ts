import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.raw(`
		ALTER TABLE ping_logs RENAME TO ping_logs_old
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
		INSERT INTO ping_logs (id, service_id, is_up, status_code, latency_ms, checked_at)
		SELECT id, service_id, is_up, status_code, latency_ms, checked_at
		FROM ping_logs_old
	`);
	await knex.schema.raw('DROP TABLE ping_logs_old');
	await knex.schema.raw(`
		CREATE INDEX idx_ping_logs_service_checked
		ON ping_logs(service_id, checked_at DESC)
	`);
	await knex.schema.raw(`
		CREATE INDEX idx_ping_logs_checked_at
		ON ping_logs(checked_at DESC)
	`);
	await knex.schema.raw(`
		ALTER TABLE service_owners RENAME TO service_owners_old
	`);
	await knex.schema.raw(`
		CREATE TABLE service_owners (
			service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			PRIMARY KEY (service_id, user_id)
		)
	`);
	await knex.schema.raw(`
		INSERT INTO service_owners (service_id, user_id, created_at)
		SELECT service_id, user_id, created_at
		FROM service_owners_old
	`);
	await knex.schema.raw('DROP TABLE service_owners_old');
	await knex.schema.raw(`
		CREATE INDEX idx_service_owners_user_id
		ON service_owners(user_id)
	`);
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.raw('DROP INDEX IF EXISTS idx_service_owners_user_id');
	await knex.schema.raw(`
		ALTER TABLE service_owners RENAME TO service_owners_new
	`);
	await knex.schema.raw(`
		CREATE TABLE service_owners (
			service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			PRIMARY KEY (service_id, user_id)
		)
	`);
	await knex.schema.raw(`
		INSERT INTO service_owners (service_id, user_id, created_at)
		SELECT service_id, user_id, created_at
		FROM service_owners_new
	`);
	await knex.schema.raw('DROP TABLE service_owners_new');
	await knex.schema.raw('DROP INDEX IF EXISTS idx_ping_logs_checked_at');
	await knex.schema.raw('DROP INDEX IF EXISTS idx_ping_logs_service_checked');
	await knex.schema.raw(`
		ALTER TABLE ping_logs RENAME TO ping_logs_new
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
		INSERT INTO ping_logs (id, service_id, is_up, status_code, latency_ms, checked_at)
		SELECT id, service_id, is_up, status_code, latency_ms, checked_at
		FROM ping_logs_new
	`);
	await knex.schema.raw('DROP TABLE ping_logs_new');
	await knex.schema.raw(`
		CREATE INDEX idx_ping_logs_service_checked
		ON ping_logs(service_id, checked_at DESC)
	`);
	await knex.schema.raw(`
		CREATE INDEX idx_ping_logs_checked_at
		ON ping_logs(checked_at DESC)
	`);
}
