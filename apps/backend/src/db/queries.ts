import { db } from './client.js';

type BinaryInt = 0 | 1;

export interface ServiceRow {
	id: number;
	name: string;
	url: string;
	description: string | null;
	is_active: BinaryInt;
	created_at: number;
	created_by: number;
}

export interface CreateServiceData {
	name: string;
	url: string;
	description?: string;
}

export interface UpdateServiceData {
	name?: string;
	description?: string;
}

export interface StatusHistoryRow {
	is_up: BinaryInt;
	status_code: number | null;
	latency_ms: number | null;
	checked_at: number;
}

const selectServiceColumns = `
	SELECT id, name, url, description, is_active, created_at, created_by
	FROM services
`;
const getUserServicesStatement = db
	.prepare<[userId: number], ServiceRow>(
		`
			${selectServiceColumns}
			WHERE created_by = ?
			ORDER BY id ASC
		`
	);
const getServiceByIdStatement = db
	.prepare<[serviceId: number, userId: number], ServiceRow>(
		`
			${selectServiceColumns}
			WHERE id = ? AND created_by = ?
		`
	);
const createServiceStatement = db.prepare<
	[name: string, url: string, description: string | null, userId: number]
>(
	`
		INSERT INTO services (name, url, description, created_by)
		VALUES (?, ?, ?, ?)
	`
);
const updateServiceStatement = db.prepare<
	[
		name: string | null,
		description: string | null,
		serviceId: number,
		userId: number
	]
>(
	`
		UPDATE services
		SET
			name = COALESCE(?, name),
			description = COALESCE(?, description)
		WHERE id = ? AND created_by = ?
	`
);
const deleteServiceStatement = db.prepare<[serviceId: number, userId: number]>(
	`
		DELETE FROM services
		WHERE id = ? AND created_by = ?
	`
);
const getServiceStatusHistoryStatement = db.prepare<
	[serviceId: number, checkedAtCutoff: number],
	StatusHistoryRow
>(
	`
		SELECT is_up, status_code, latency_ms, checked_at
		FROM ping_logs
		WHERE service_id = ? AND checked_at >= ?
		ORDER BY checked_at DESC
	`
);
const normalizeDescription = (
	description: string | undefined
): string | null => description ?? null;

const rowIdToNumber = (rowId: number | bigint): number => {
	if (typeof rowId === 'bigint') {
		return Number(rowId);
	}
	return rowId;
};

export const getUserServices = (userId: number): ServiceRow[] =>
	getUserServicesStatement.all(userId);

export const getServiceById = (
	serviceId: number,
	userId: number
): ServiceRow | null => getServiceByIdStatement.get(serviceId, userId) ?? null;

export const createService = (
	userId: number,
	data: CreateServiceData
): ServiceRow => {
	const result = createServiceStatement.run(
		data.name,
		data.url,
		normalizeDescription(data.description),
		userId
	);
	const createdServiceId = rowIdToNumber(result.lastInsertRowid);
	const createdService =
		getServiceByIdStatement.get(createdServiceId, userId) ?? null;

	if (createdService === null) {
		throw new Error('Failed to load created service row');
	}
	return createdService;
};

export const updateService = (
	serviceId: number,
	userId: number,
	data: UpdateServiceData
): number =>
	updateServiceStatement.run(
		data.name ?? null,
		data.description ?? null,
		serviceId,
		userId
	).changes;

export const deleteService = (serviceId: number, userId: number): number =>
	deleteServiceStatement.run(serviceId, userId).changes;

export const getServiceStatusHistory = (
	serviceId: number,
	checkedAtCutoff: number
): StatusHistoryRow[] =>
	getServiceStatusHistoryStatement.all(serviceId, checkedAtCutoff);
