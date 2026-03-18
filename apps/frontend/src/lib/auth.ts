import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { ApiClientError } from './api';
import { clearAccessToken, refresh, setAccessToken } from './api';

/**
 * Module-level promise to ensure only one refresh is in-flight at a time.
 * Multiple concurrent 401 errors will await the same refresh operation.
 */
let refreshPromise: Promise<string> | null = null;

/**
 * Attempts to refresh the access token and retry the original request.
 *
 * Single-flight lock: If multiple callers need a refresh simultaneously,
 * they all wait for the same refresh Promise.
 *
 * @param originalRequest - The request that failed with 401, to be retried after refresh
 * @returns The result of the retried request
 * @throws If refresh fails or the retry also returns 401
 *
 * @example
 * ```ts
 * try {
 *   return await getServices();
 * } catch (err) {
 *   if (err instanceof ApiClientError && err.status === 401) {
 *     return await tryRefreshAndRetry(() => getServices());
 *   }
 *   throw err;
 * }
 * ```
 */
export async function tryRefreshAndRetry<T>(originalRequest: () => Promise<T>): Promise<T> {
	// If no refresh is in-flight, start one
	if (!refreshPromise) {
		refreshPromise = (async () => {
			try {
				const authResponse = await refresh();
				return authResponse.accessToken;
			} catch (err) {
				// Refresh failed — clear token and redirect to login
				clearAccessToken();
				await goto(resolve('/login'));
				throw err;
			} finally {
				// Clear the in-flight promise regardless of success/failure
				refreshPromise = null;
			}
		})();
	}

	// Wait for the shared refresh to complete
	const newToken = await refreshPromise;

	// Update the access token
	setAccessToken(newToken);

	// Retry the original request
	try {
		return await originalRequest();
	} catch (err) {
		// If retry also fails with 401, token is invalid — redirect to login
		if (err instanceof ApiClientError && err.status === 401) {
			clearAccessToken();
			await goto(resolve('/login'));
		}
		throw err;
	}
}
