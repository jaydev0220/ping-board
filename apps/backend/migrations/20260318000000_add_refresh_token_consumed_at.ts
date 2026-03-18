import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.raw(`
		ALTER TABLE refresh_tokens ADD COLUMN consumed_at INTEGER
	`);
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.raw(`
		ALTER TABLE refresh_tokens DROP COLUMN consumed_at
	`);
}
