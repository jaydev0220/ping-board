import type { NextFunction, Request, Response } from 'express';

type ErrorWithStatus = Error & {
	status?: number;
	statusCode?: number;
};

const isHttpStatusCode = (value: number) => value >= 400 && value <= 599;

const getStatusCode = (error: ErrorWithStatus) => {
	if (
		typeof error.statusCode === 'number' &&
		isHttpStatusCode(error.statusCode)
	) {
		return error.statusCode;
	}
	if (typeof error.status === 'number' && isHttpStatusCode(error.status)) {
		return error.status;
	}
	return 500;
};

export const errorHandler = (
	error: ErrorWithStatus,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	void _next;

	const statusCode = getStatusCode(error);
	const message =
		statusCode >= 500
			? 'Internal server error'
			: error.message || 'Request failed';

	res.status(statusCode).json({
		error: message
	});
};
