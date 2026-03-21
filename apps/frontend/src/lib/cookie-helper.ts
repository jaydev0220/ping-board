import type { Cookies } from '@sveltejs/kit';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

const REFRESH_TOKEN_COOKIE_PATH = '/auth/refresh';
const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

type RefreshTokenCookieOptions = Parameters<Cookies['set']>[2];

function getRefreshTokenCookieBaseOptions(
	isDev: boolean
): Omit<RefreshTokenCookieOptions, 'maxAge'> {
	return {
		path: REFRESH_TOKEN_COOKIE_PATH,
		httpOnly: true,
		secure: !isDev,
		sameSite: 'strict'
	};
}

export function getRefreshTokenCookieSetOptions(isDev: boolean): RefreshTokenCookieOptions {
	return {
		...getRefreshTokenCookieBaseOptions(isDev),
		maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE
	};
}

export function getRefreshTokenCookieDeleteOptions(isDev: boolean): RefreshTokenCookieOptions {
	return getRefreshTokenCookieBaseOptions(isDev);
}

export function setRefreshTokenCookie(
	cookies: Cookies,
	refreshToken: string,
	isDev: boolean
): void {
	cookies.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenCookieSetOptions(isDev));
}

export function deleteRefreshTokenCookie(cookies: Cookies, isDev: boolean): void {
	cookies.delete(REFRESH_TOKEN_COOKIE_NAME, getRefreshTokenCookieDeleteOptions(isDev));
}
