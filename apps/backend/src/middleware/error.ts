import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
	readonly statusCode: number;
	constructor(statusCode: number, message: string) {
		super(message);
		this.name = 'AppError';
		this.statusCode = statusCode;
	}
}

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
		statusCode >= 500 ? '伺服器內部錯誤' : error.message || '請求失敗';

	res.status(statusCode).json({
		error: message
	});
};
