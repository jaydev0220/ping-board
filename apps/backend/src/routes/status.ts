import { Router, type Response } from 'express';
import { AppError } from '../middleware/error.js';
import {
	getServiceById,
	getServiceStatusHistory
} from '../db/queries.js';
import { ServiceIdParamsSchema } from '../schemas/services.js';

const STATUS_HISTORY_WINDOW_DAYS = 90;
const SECONDS_PER_DAY = 24 * 60 * 60;

export const statusRouter = Router();

const getAuthenticatedUserId = (userId: number | undefined): number => {
	if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) {
		throw new AppError(401, 'Invalid authorization token');
	}
	return userId;
};

const sendValidationError = (
	res: Response,
	fieldErrors: Record<string, string[] | undefined>
) => {
	res.status(400).json({
		error: 'Validation error',
		details: fieldErrors
	});
};

const getStatusHistoryCutoffUnixSeconds = (): number =>
	Math.floor(Date.now() / 1000) - STATUS_HISTORY_WINDOW_DAYS * SECONDS_PER_DAY;

statusRouter.get('/:id', async (req, res) => {
	const userId = getAuthenticatedUserId(req.user?.id);
	const parsedParams = ServiceIdParamsSchema.safeParse(req.params);

	if (!parsedParams.success) {
		sendValidationError(res, parsedParams.error.flatten().fieldErrors);
		return;
	}

	const service = getServiceById(parsedParams.data.id, userId);

	if (service === null) {
		throw new AppError(404, 'Service not found');
	}

	const statusHistory = getServiceStatusHistory(
		parsedParams.data.id,
		getStatusHistoryCutoffUnixSeconds()
	);

	res.status(200).json({ statusHistory });
});
