# PingBoard API

This document describes the current backend HTTP API for PingBoard. It is based on the route, schema, and middleware implementation in `apps/backend/src`.

## Base URL and Headers

- Base URL is environment-dependent:
  - Server binds to `http://<HOST>:<PORT>`
  - Defaults: `HOST=127.0.0.1`, `PORT=3001`
- Most request/response bodies use JSON.

Common headers:

```http
Content-Type: application/json
Authorization: Bearer <access-token>
```

Notes:

- `Authorization` is required only on protected endpoints (`/services/*`, `/status/*`).
- `POST /auth/refresh` uses the `refreshToken` cookie and does not require the Authorization header.
- `GET /health` is public and does not require authentication.

## Security and Authentication

### Authentication model

PingBoard uses JWT access tokens + refresh token cookies:

- `POST /auth/login`
  - Returns `accessToken` in JSON response body
  - Sets `refreshToken` as HTTP-only cookie
- `POST /auth/refresh`
  - Reads `refreshToken` cookie
  - Returns a new `accessToken`

### Authorization header format

Protected endpoints require:

```http
Authorization: Bearer <access-token>
```

JWT middleware (`verifyJwt`) rejects malformed or invalid tokens with:

- `401` `{"error":"Authorization token missing"}`
- `401` `{"error":"Invalid authorization header"}`
- `401` `{"error":"Invalid authorization token"}`

### Refresh token cookie

Cookie name: `refreshToken`

- `HttpOnly: true`
- `SameSite: strict` when `NODE_ENV=production`, otherwise `lax`
- `Secure: true` when `NODE_ENV=production`
- `Path: /auth/refresh`
- `Max-Age: 604800000` (7 days)

### CORS behavior

CORS is configured from `CORS_ALLOWED_ORIGINS` (comma-separated absolute URLs):

- Requests with no `Origin` header are allowed.
- Requests with allowlisted origins are allowed.
- Other origins are rejected with `403` and error `Origin not allowed`.
- In production, at least one allowed origin is required.

### Additional protections

- `helmet()` is enabled globally.
- Error responses are normalized by global error middleware.

## Auth Endpoints

Base path: `/auth`

### POST `/auth/register`

Create a user account.

Request body:

```json
{
	"username": "alice_01",
	"password": "StrongPass123!"
}
```

Validation:

- `username`: string, 3..20, regex `^[a-zA-Z0-9_]+$`
- `password`: string, min 12, must include uppercase/lowercase/number/symbol

Success:

- `201 Created`
- `{"message":"User registered successfully"}`

Errors:

- `400` validation error
- `400` `{"error":"Username already taken"}`
- `500` `{"error":"Internal server error"}`

Example:

```bash
curl -i -X POST http://127.0.0.1:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice_01","password":"StrongPass123!"}'
```

### POST `/auth/login`

Authenticate with username/password. Returns access token and sets refresh cookie.

Request body:

```json
{
	"username": "alice_01",
	"password": "StrongPass123!"
}
```

Success:

- `200 OK`
- Sets `refreshToken` cookie
- Body:

```json
{
	"user": { "id": 1, "username": "alice_01" },
	"accessToken": "<jwt>"
}
```

Errors:

- `400` validation error
- `401` `{"error":"Invalid credentials"}`
- `500` `{"error":"Internal server error"}`

Example:

```bash
curl -i -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"alice_01","password":"StrongPass123!"}'
```

### POST `/auth/refresh`

Exchange refresh cookie for a new access token.

**Token Rotation Behavior:**

- Each refresh token is **one-time-use only**
- The endpoint automatically rotates the refresh token:
  1. Validates the current `refreshToken` cookie
  2. Marks the old token as consumed (preventing reuse)
  3. Issues a **NEW** `refreshToken` cookie (httpOnly, secure)
  4. Returns a new access token in the response body

**Security Note:** Token rotation prevents replay attacks. If an old refresh token is used after rotation, it will be rejected with a `401` error.

Request:

- No JSON body required
- Requires `refreshToken` cookie

Success:

- `200 OK`
- Sets a NEW `refreshToken` cookie (httpOnly, SameSite depends on environment)

```json
{
	"user": { "id": 1, "username": "alice_01" },
	"accessToken": "<jwt>"
}
```

Errors:

- `401` `{"error":"Refresh token missing"}`
- `401` `{"error":"Invalid or expired refresh token"}` (includes consumed tokens)
- `500` `{"error":"Internal server error"}`

Example:

```bash
curl -i -X POST http://127.0.0.1:3001/auth/refresh \
  -b cookies.txt -c cookies.txt
```

**Note:** The `-c cookies.txt` flag saves the new refresh token cookie for subsequent requests.

## Services Endpoints

Base path: `/services`  
All endpoints require `Authorization: Bearer <access-token>`.

Validation conventions:

- `id` path param: coerced integer, `> 0`
- create body: strict object with `name`, `url`, optional `description`
- update body: strict object with optional `name`/`description` and at least one field present

### GET `/services`

List services for the authenticated user.

Success: `200 OK`

```json
{
	"services": [
		{
			"id": 1,
			"name": "API",
			"url": "https://api.example.com/health",
			"description": "Primary API",
			"is_active": 1,
			"created_at": 1735689600,
			"created_by": 42
		}
	]
}
```

Errors: `401`, `500`

Notes:

- `description` can be `null` in responses.

Example:

```bash
curl -X GET http://127.0.0.1:3001/services \
  -H "Authorization: Bearer <access-token>"
```

### POST `/services`

Create a service for the authenticated user.

Request body:

```json
{
	"name": "Web App",
	"url": "https://app.example.com/health",
	"description": "Customer frontend"
}
```

Success: `201 Created`

```json
{
	"service": {
		"id": 7,
		"name": "Web App",
		"url": "https://app.example.com/health",
		"description": "Customer frontend",
		"is_active": 1,
		"created_at": 1735689600,
		"created_by": 42
	}
}
```

Errors: `400`, `401`, `500`

Example:

```bash
curl -X POST http://127.0.0.1:3001/services \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Web App","url":"https://app.example.com/health","description":"Customer frontend"}'
```

### PATCH `/services/:id`

Update a service owned by the authenticated user.

Request body (at least one field required):

```json
{
	"name": "Web App (Prod)",
	"description": "Production health endpoint"
}
```

Success: `200 OK`

```json
{
	"service": {
		"id": 7,
		"name": "Web App (Prod)",
		"url": "https://app.example.com/health",
		"description": "Production health endpoint",
		"is_active": 1,
		"created_at": 1735689600,
		"created_by": 42
	}
}
```

Errors:

- `400` validation error
- `401` auth error
- `404` `{"error":"Service not found"}`
- `500` internal error

Example:

```bash
curl -X PATCH http://127.0.0.1:3001/services/7 \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Web App (Prod)","description":"Production health endpoint"}'
```

### DELETE `/services/:id`

Delete a service owned by the authenticated user.

Success:

- `204 No Content`
- Empty body

Errors: `400`, `401`, `404`, `500`

Example:

```bash
curl -X DELETE http://127.0.0.1:3001/services/7 \
  -H "Authorization: Bearer <access-token>"
```

## Status Endpoint

### GET `/status/:id`

Returns status history for one service owned by the authenticated user.

- Protected by JWT middleware.
- Validates `:id` using `ServiceIdParamsSchema` (coerced integer `> 0`).
- Data window: last 90 days (`checked_at >= now - 90 days`).

Success: `200 OK`

```json
{
	"statusHistory": [
		{
			"is_up": 1,
			"status_code": 200,
			"latency_ms": 123,
			"checked_at": 1712345678
		}
	]
}
```

Errors: `400`, `401`, `404`, `500`

Notes:

- `status_code` can be `null`.
- `latency_ms` can be `null`.

Example:

```bash
curl -X GET http://127.0.0.1:3001/status/1 \
  -H "Authorization: Bearer <access-token>"
```

## Health Endpoint

### GET `/health`

Liveness endpoint exposed by the app.

Success: `200 OK`

```json
{
	"status": "ok"
}
```

Errors: `500` (unexpected server error only)

## Schema Reference

### Auth schemas

- `PasswordSchema`: string, min 12, regex-enforced complexity
- `RegisterSchema`:
  - `username`: string, 3..20, `^[a-zA-Z0-9_]+$`
  - `password`: `PasswordSchema`
- `LoginSchema`:
  - `username`: string, min 1
  - `password`: string, min 1

### Services schemas

- `ServiceIdParamsSchema`:
  - `id`: `z.coerce.number().int().positive()`
- `CreateServiceSchema` (strict):
  - `name`: trimmed string, 1..120
  - `url`: valid URL, max 2048
  - `description`: optional trimmed string, 1..500
- `UpdateServiceSchema` (strict):
  - optional `name`, `description`
  - refine rule: at least one field required (`At least one field must be provided`)

### Response item schemas

- `ServiceResponseSchema`:
  - `id`, `name`, `url`, `description`, `is_active`, `created_at`, `created_by`
- `StatusItemResponseSchema`:
  - `is_up`, `status_code`, `latency_ms`, `checked_at`

## Error Handling

### Response shape

Common error envelope:

```json
{
	"error": "<message>"
}
```

Validation errors return:

```json
{
	"error": "Validation error",
	"details": {
		"field": ["message"]
	}
}
```

### Status resolution

Global error middleware resolves status in this order:

1. `error.statusCode` if 400..599
2. `error.status` if 400..599
3. fallback `500`

For `5xx`, message is always sanitized to:

```json
{
	"error": "Internal server error"
}
```

### Current route status summary

- `POST /auth/register`: `201`, `400`, `500`
- `POST /auth/login`: `200`, `400`, `401`, `500`
- `POST /auth/refresh`: `200`, `401`, `500`
- `GET /services`: `200`, `401`, `500`
- `POST /services`: `201`, `400`, `401`, `500`
- `PATCH /services/:id`: `200`, `400`, `401`, `404`, `500`
- `DELETE /services/:id`: `204`, `400`, `401`, `404`, `500`
- `GET /status/:id`: `200`, `400`, `401`, `404`, `500`
- `GET /health`: `200`, `500`
- CORS rejection: `403` with `{"error":"Origin not allowed"}`
