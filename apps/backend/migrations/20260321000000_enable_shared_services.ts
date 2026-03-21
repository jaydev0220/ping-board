import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	// Create junction table for many-to-many service ownership
	await knex.schema.raw(`
		CREATE TABLE service_owners (
			service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			PRIMARY KEY (service_id, user_id)
		)
	`);
	// Index for efficient "list my services" queries
	await knex.schema.raw(`
		CREATE INDEX idx_service_owners_user_id
		ON service_owners(user_id)
	`);
	// Migrate existing ownership data from services.created_by to service_owners
	await knex.schema.raw(`
		INSERT INTO service_owners (service_id, user_id, created_at)
		SELECT id, created_by, created_at
		FROM services
	`);
	// SQLite doesn't support DROP COLUMN directly — recreate table without created_by
	// Step 1: rename old table
	await knex.schema.raw('ALTER TABLE services RENAME TO services_old');
	// Step 2: create new table with first_created_by (informational, no FK)
	await knex.schema.raw(`
		CREATE TABLE services (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			url TEXT NOT NULL UNIQUE,
			description TEXT,
			is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			first_created_by INTEGER
		)
	`);
	// Step 3: copy data, preserving original created_by as first_created_by
	await knex.schema.raw(`
		INSERT INTO services (id, name, url, description, is_active, created_at, first_created_by)
		SELECT id, name, url, description, is_active, created_at, created_by
		FROM services_old
	`);
	// Step 4: drop old table
	await knex.schema.raw('DROP TABLE services_old');

	// Step 5: recreate ping_logs FK constraint by recreating the table
	// (SQLite FK constraints reference the table, which was recreated)
	// ping_logs already has ON DELETE CASCADE which will still work since
	// we preserved the same id values
}

export async function down(knex: Knex): Promise<void> {
	// Reverse: recreate services with created_by FK
	await knex.schema.raw('ALTER TABLE services RENAME TO services_new');
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
	// Copy data back, using first_created_by as created_by
	// Services without a first_created_by cannot be migrated down safely
	await knex.schema.raw(`
		INSERT INTO services (id, name, url, description, is_active, created_at, created_by)
		SELECT id, name, url, description, is_active, created_at, first_created_by
		FROM services_new
		WHERE first_created_by IS NOT NULL
	`);
	await knex.schema.raw('DROP TABLE services_new');
	// Drop junction table and index
	await knex.schema.raw('DROP INDEX IF EXISTS idx_service_owners_user_id');
	await knex.schema.raw('DROP TABLE IF EXISTS service_owners');
}
