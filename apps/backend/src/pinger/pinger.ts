import { performance } from 'node:perf_hooks';

const HEAD_FALLBACK_STATUS_CODES = new Set([405, 501]);
const HTTP_UPPER_BOUND_STATUS_CODE = 399;
const HTTP_LOWER_BOUND_STATUS_CODE = 200;
const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);

export type PingMethod = 'GET' | 'HEAD';

export type PingErrorCode = 'INVALID_URL' | 'NETWORK_ERROR' | 'TIMEOUT';

export type PingError = {
	code: PingErrorCode;
	message: string;
	cause: string | null;
};

export type PingResult = {
	url: string;
	checkedAt: Date;
	method: PingMethod;
	isUp: boolean;
	statusCode: number | null;
	latencyMs: number;
	error: PingError | null;
};

export type PingerHttpClientOptions = {
	timeoutMs: number;
};

export type PingerHttpClient = {
	ping: (url: string) => Promise<PingResult>;
};

type RequestAttemptResult = {
	method: PingMethod;
	isUp: boolean;
	statusCode: number | null;
	latencyMs: number;
	error: PingError | null;
	shouldFallbackToGet: boolean;
};

const isUpStatusCode = (statusCode: number) =>
	statusCode >= HTTP_LOWER_BOUND_STATUS_CODE &&
	statusCode <= HTTP_UPPER_BOUND_STATUS_CODE;
const getLatencyMs = (startedAt: number) =>
	Math.max(0, Math.round(performance.now() - startedAt));
const isAbortError = (error: unknown): error is Error & { name: string } =>
	error instanceof Error && error.name === 'AbortError';

const getErrorCause = (error: unknown) => {
	if (error instanceof Error) {
		return error.message;
	}
	return null;
};

const createPingError = (
	code: PingErrorCode,
	message: string,
	error: unknown
): PingError => ({
	code,
	message,
	cause: getErrorCause(error)
});

const normalizeUrl = (url: string) => {
	try {
		const normalizedUrl = new URL(url);

		if (!SUPPORTED_PROTOCOLS.has(normalizedUrl.protocol)) {
			return {
				ok: false as const,
				error: createPingError(
					'INVALID_URL',
					'Only http and https URLs are supported.',
					null
				)
			};
		}
		return {
			ok: true as const,
			url: normalizedUrl.toString()
		};
	} catch (error) {
		return {
			ok: false as const,
			error: createPingError('INVALID_URL', 'Invalid URL.', error)
		};
	}
};

const assertTimeoutMs = (timeoutMs: number) => {
	if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
		throw new TypeError('Pinger timeoutMs must be a positive integer.');
	}
};

const performRequestAttempt = async (
	url: string,
	method: PingMethod,
	timeoutMs: number
): Promise<RequestAttemptResult> => {
	const startedAt = performance.now();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method,
			redirect: 'manual',
			signal: controller.signal
		});
		const statusCode = response.status;
		return {
			method,
			isUp: isUpStatusCode(statusCode),
			statusCode,
			latencyMs: getLatencyMs(startedAt),
			error: null,
			shouldFallbackToGet:
				method === 'HEAD' && HEAD_FALLBACK_STATUS_CODES.has(statusCode)
		};
	} catch (error) {
		const pingError = isAbortError(error)
			? createPingError(
					'TIMEOUT',
					`Ping request timed out after ${timeoutMs}ms.`,
					error
				)
			: createPingError('NETWORK_ERROR', 'Ping request failed.', error);
		return {
			method,
			isUp: false,
			statusCode: null,
			latencyMs: getLatencyMs(startedAt),
			error: pingError,
			shouldFallbackToGet: false
		};
	} finally {
		clearTimeout(timeout);
	}
};

const createPingResult = (
	url: string,
	checkedAt: Date,
	attempt: RequestAttemptResult
): PingResult => ({
	url,
	checkedAt,
	method: attempt.method,
	isUp: attempt.isUp,
	statusCode: attempt.statusCode,
	latencyMs: attempt.latencyMs,
	error: attempt.error
});

export const createPingerHttpClient = ({
	timeoutMs
}: PingerHttpClientOptions): PingerHttpClient => {
	assertTimeoutMs(timeoutMs);
	return {
		ping: async (url: string) => {
			const checkedAt = new Date();
			const normalizedUrl = normalizeUrl(url);

			if (!normalizedUrl.ok) {
				return {
					url,
					checkedAt,
					method: 'HEAD',
					isUp: false,
					statusCode: null,
					latencyMs: 0,
					error: normalizedUrl.error
				};
			}

			const headAttempt = await performRequestAttempt(
				normalizedUrl.url,
				'HEAD',
				timeoutMs
			);

			if (!headAttempt.shouldFallbackToGet) {
				return createPingResult(normalizedUrl.url, checkedAt, headAttempt);
			}

			const getAttempt = await performRequestAttempt(
				normalizedUrl.url,
				'GET',
				timeoutMs
			);
			return createPingResult(normalizedUrl.url, checkedAt, getAttempt);
		}
	};
};
