import { Router, type Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error.js';
import {
	CreateServiceSchema,
	ServiceIdParamsSchema,
	UpdateServiceSchema
} from '../schemas/services.js';
import {
	createService,
	deleteService,
	getServiceById,
	getUserServices,
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
		throw new AppError(401, '無效的 Access Token');
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

	const changes = deleteService(parsedParams.data.id, userId);

	if (changes === 0) {
		throw new AppError(404, '找不到該服務');
	}

	res.status(204).send();
});
