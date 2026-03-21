import { Router, type Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import {
	CreateServiceSchema,
	ServiceIdParamsSchema,
	UpdateServiceSchema
} from '../schemas/services.js';
import {
	addServiceOwner,
	createService,
	getServiceById,
	getServiceByUrl,
	getUserServiceCount,
	getUserServiceQuota,
	getUserServices,
	isServiceOwner,
	removeServiceOwner,
	updateService,
	type CreateServiceData,
	type UpdateServiceData
} from '../db/queries.js';

export const servicesRouter = Router();

const getAuthenticatedUserId = (userId: number | undefined): number => {
	if (
		typeof userId !== 'number' ||
		!Number.isSafeInteger(userId) ||
		userId <= 0
	) {
		throw new AppError(401, '無效的存取權杖');
	}
	return userId;
};

const sendValidationError = (
	res: Response,
	fieldErrors: Record<string, string[] | undefined>
) => {
	res.status(400).json({
		error: '無效的資料',
		details: fieldErrors
	});
};

servicesRouter.get('/', async (req, res) => {
	const userId = getAuthenticatedUserId(req.user?.id);
	const services = getUserServices(userId);

	res.status(200).json({ services });
});
servicesRouter.post('/', async (req, res) => {
	const userId = getAuthenticatedUserId(req.user?.id);
	const parsedBody = CreateServiceSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, z.flattenError(parsedBody.error).fieldErrors);
		return;
	}

	const userServiceCount = getUserServiceCount(userId);
	const userServiceQuota = getUserServiceQuota(userId);

	if (userServiceCount >= userServiceQuota) {
		throw new AppError(400, `已達到服務上限（最多 ${userServiceQuota} 個）`);
	}

	// Check if service URL already exists
	const existingService = getServiceByUrl(parsedBody.data.url);

	if (existingService !== null) {
		// Service URL exists — check if user already owns it
		if (isServiceOwner(existingService.id, userId)) {
			throw new AppError(409, '您已訂閱此服務');
		}

		// Add ownership to existing service
		addServiceOwner(existingService.id, userId);

		// Re-fetch service via ownership join to confirm
		const service = getServiceById(existingService.id, userId);

		if (service === null) {
			throw new Error('無法載入服務資料');
		}

		res.status(200).json({ service });
		return;
	}

	// Service URL doesn't exist — create new service
	const createPayload: CreateServiceData =
		parsedBody.data.description === undefined
			? { name: parsedBody.data.name, url: parsedBody.data.url }
			: {
					name: parsedBody.data.name,
					url: parsedBody.data.url,
					description: parsedBody.data.description
				};
	const service = createService(userId, createPayload);

	res.status(201).json({ service });
});
servicesRouter.patch('/:id', async (req, res) => {
	const userId = getAuthenticatedUserId(req.user?.id);
	const parsedParams = ServiceIdParamsSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, z.flattenError(parsedParams.error).fieldErrors);
		return;
	}

	const parsedBody = UpdateServiceSchema.safeParse(req.body);

	if (!parsedBody.success) {
		sendValidationError(res, z.flattenError(parsedBody.error).fieldErrors);
		return;
	}

	const updatePayload: UpdateServiceData = {};

	if (parsedBody.data.name !== undefined) {
		updatePayload.name = parsedBody.data.name;
	}
	if (parsedBody.data.description !== undefined) {
		updatePayload.description = parsedBody.data.description;
	}

	const changes = updateService(parsedParams.data.id, userId, updatePayload);

	if (changes === 0) {
		throw new AppError(404, '找不到該服務');
	}

	const updatedService = getServiceById(parsedParams.data.id, userId);

	if (updatedService === null) {
		throw new Error('無法載入該服務資料');
	}

	res.status(200).json({ service: updatedService });
});
servicesRouter.delete('/:id', async (req, res) => {
	const userId = getAuthenticatedUserId(req.user?.id);
	const parsedParams = ServiceIdParamsSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, z.flattenError(parsedParams.error).fieldErrors);
		return;
	}

	const { removed } = removeServiceOwner(parsedParams.data.id, userId);

	if (!removed) {
		throw new AppError(404, '找不到該服務');
	}

	res.status(204).send();
});
