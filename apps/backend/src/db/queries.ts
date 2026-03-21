import { db } from './client.js';

type BinaryInt = 0 | 1;

export interface ServiceRow {
	id: number;
	name: string;
	url: string;
	description: string | null;
	is_active: BinaryInt;
	created_at: number;
	first_created_by: number | null;
}

export interface ServiceOwnerRow {
	service_id: number;
	user_id: number;
	created_at: number;
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
	SELECT id, name, url, description, is_active, created_at, first_created_by
	FROM services
`;
// Get services owned by a specific user (via junction table)
const getUserServicesStatement = db.prepare<[userId: number], ServiceRow>(
	`
		SELECT s.id, s.name, s.url, s.description, s.is_active, s.created_at, s.first_created_by
		FROM services s
		INNER JOIN service_owners so ON s.id = so.service_id
		WHERE so.user_id = ?
		ORDER BY s.id ASC
	`
);
// Count services owned by a user (for quota enforcement)
const getUserServiceCountStatement = db.prepare<
	[userId: number],
	{ count: number }
>(
	`
		SELECT COUNT(*) AS count
		FROM service_owners
		WHERE user_id = ?
	`
);
const getUserServiceQuotaStatement = db.prepare<
	[userId: number],
	{ service_quota: number }
>(
	`
		SELECT service_quota
		FROM users
		WHERE id = ?
	`
);
const getServiceByIdStatement = db.prepare<
	[serviceId: number, userId: number],
	ServiceRow
>(
	`
		SELECT s.id, s.name, s.url, s.description, s.is_active, s.created_at, s.first_created_by
		FROM services s
		INNER JOIN service_owners so ON s.id = so.service_id
		WHERE s.id = ? AND so.user_id = ?
	`
);
// Get a service by URL (for checking if URL already exists)
const getServiceByUrlStatement = db.prepare<[url: string], ServiceRow>(
	`
		${selectServiceColumns}
		WHERE url = ?
	`
);
// Check if user owns a specific service
const checkServiceOwnershipStatement = db.prepare<
	[serviceId: number, userId: number],
	{ service_id: number }
>(
	`
		SELECT service_id
		FROM service_owners
		WHERE service_id = ? AND user_id = ?
	`
);
// Count total owners of a service
const countServiceOwnersStatement = db.prepare<
	[serviceId: number],
	{ count: number }
>(
	`
		SELECT COUNT(*) AS count
		FROM service_owners
		WHERE service_id = ?
	`
);
const createServiceStatement = db.prepare<
	[name: string, url: string, description: string | null, userId: number]
>(
	`
		INSERT INTO services (name, url, description, first_created_by)
		VALUES (?, ?, ?, ?)
	`
);
// Add ownership record
const addServiceOwnerStatement = db.prepare<[serviceId: number, userId: number]>(
	`
		INSERT INTO service_owners (service_id, user_id)
		VALUES (?, ?)
	`
);
// Remove ownership record
const removeServiceOwnerStatement = db.prepare<
	[serviceId: number, userId: number]
>(
	`
		DELETE FROM service_owners
		WHERE service_id = ? AND user_id = ?
	`
);
const updateServiceStatement = db.prepare<
	[
		name: string | null,
		description: string | null,
		serviceId: number
	]
>(
	`
		UPDATE services
		SET
			name = COALESCE(?, name),
			description = COALESCE(?, description)
		WHERE id = ?
	`
);
// Delete service entirely (when no owners remain)
const deleteServiceStatement = db.prepare<[serviceId: number]>(
	`
		DELETE FROM services
		WHERE id = ?
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
const normalizeDescription = (description: string | undefined): string | null =>
	description ?? null;

const rowIdToNumber = (rowId: number | bigint): number => {
	if (typeof rowId === 'bigint') {
		return Number(rowId);
	}
	return rowId;
};

export const getUserServices = (userId: number): ServiceRow[] =>
	getUserServicesStatement.all(userId);

export const getUserServiceCount = (userId: number): number =>
	getUserServiceCountStatement.get(userId)?.count ?? 0;

export const getUserServiceQuota = (userId: number): number => {
	const serviceQuota = getUserServiceQuotaStatement.get(userId)?.service_quota;

	if (
		typeof serviceQuota !== 'number' ||
		!Number.isSafeInteger(serviceQuota) ||
		serviceQuota < 0
	) {
		return 2;
	}
	return serviceQuota;
};

export const getServiceById = (
	serviceId: number,
	userId: number
): ServiceRow | null => getServiceByIdStatement.get(serviceId, userId) ?? null;

export const getServiceByUrl = (url: string): ServiceRow | null =>
	getServiceByUrlStatement.get(url) ?? null;

export const isServiceOwner = (serviceId: number, userId: number): boolean =>
	checkServiceOwnershipStatement.get(serviceId, userId) !== undefined;

export const countServiceOwners = (serviceId: number): number =>
	countServiceOwnersStatement.get(serviceId)?.count ?? 0;

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

	// Add ownership record
	addServiceOwnerStatement.run(createdServiceId, userId);

	const createdService =
		getServiceByIdStatement.get(createdServiceId, userId) ?? null;

	if (createdService === null) {
		throw new Error('Failed to load created service row');
	}
	return createdService;
};

export const addServiceOwner = (serviceId: number, userId: number): void => {
	addServiceOwnerStatement.run(serviceId, userId);
};

export const updateService = (
	serviceId: number,
	userId: number,
	data: UpdateServiceData
): number => {
	// First verify ownership
	if (!isServiceOwner(serviceId, userId)) {
		return 0;
	}
	return updateServiceStatement.run(
		data.name ?? null,
		data.description ?? null,
		serviceId
	).changes;
};

export const removeServiceOwner = (
	serviceId: number,
	userId: number
): { removed: boolean; serviceDeleted: boolean } => {
	// Remove ownership record
	const result = removeServiceOwnerStatement.run(serviceId, userId);

	if (result.changes === 0) {
		return { removed: false, serviceDeleted: false };
	}

	// Check if any owners remain
	const remainingOwners = countServiceOwners(serviceId);

	if (remainingOwners === 0) {
		// No owners left — delete the service (ping_logs cascade delete)
		deleteServiceStatement.run(serviceId);
		return { removed: true, serviceDeleted: true };
	}
	return { removed: true, serviceDeleted: false };
};

export const getServiceStatusHistory = (
	serviceId: number,
	checkedAtCutoff: number
): StatusHistoryRow[] =>
	getServiceStatusHistoryStatement.all(serviceId, checkedAtCutoff);
