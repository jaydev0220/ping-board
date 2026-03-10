---
name: backend
description: >
  PingBoard backend patterns. Use this skill whenever writing or modifying any
  backend code in apps/backend — including Express routes, cron ping logic,
  Zod validation schemas, middleware, error handling, or security configuration.
  Trigger on: API endpoint, routes, cron job, validator, middleware,
  pinger, CORS, helmet, or any apps/backend file.
---

# PingBoard Backend Skill

## Project Structure

```
apps/backend/
├── src/
│   ├── app.ts              # Express app factory — helmet/cors/routes/error handler
│   ├── server.ts           # Entry point — runMigration(), createApp(), listen()
│   ├── config/
│   │   └── env.ts          # Zod-validated env (parse on import, throws at startup)
│   ├── db/
│   │   ├── client.ts       # better-sqlite3 singleton with WAL pragmas
│   │   └── migrate.ts      # Runs knex migrations then destroys knex connection
│   ├── jobs/
│   │   └── pinger.ts       # node-cron scheduler + fetch-based ping logic
│   ├── routes/
│   │   ├── auth.ts     		# User authentication endpoints
│   │   ├── services.ts     # CRUD for registered services
│   │   └── status.ts       # Uptime data endpoint
│   ├── middleware/
│   │   ├── validate.ts     # Zod validation middleware factory
│   │   └── error.ts        # Centralized Express error handler
│   └── types/
│       └── express.d.ts    # Augment Request with validated body types
├── migrations/             # knex migration files
└── knexfile.js             # knex config
```

Read the relevant source file before modifying. Do not reproduce an entire file when only a function needs changing.

## Critical Patterns (non-obvious)

### Express 5 — Async Error Propagation

Express 5 natively catches thrown errors and rejected promises in async handlers. **Do not** install `express-async-errors` or wrap routes in try/catch.

```ts
// ✅ Errors thrown here are forwarded to the error handler automatically
router.post("/services", validate(CreateServiceSchema), async (req, res) => {
	const result = db
		.prepare("INSERT INTO services (name, url) VALUES (?, ?)")
		.run(req.body.name, req.body.url);
	res.status(201).json({ data: { id: result.lastInsertRowid } });
});

// ✅ Error handler must have exactly 4 args — Express identifies it by arity
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	const status = err instanceof AppError ? err.statusCode : 500;
	res
		.status(status)
		.json({ error: status < 500 ? err.message : "Internal server error" });
	// ↑ Never forward stack traces or DB error messages to the client
});
```

### Zod 4 — New Shorthands

```ts
// Zod 4 adds top-level shorthands — use these instead of z.string().xxx():
z.url(); // replaces z.string().url()
z.email(); // replaces z.string().email()
z.uuid(); // replaces z.string().uuid()

// z.coerce still works the same for query/param type coercion:
const ParamSchema = z.object({ id: z.coerce.number().int().positive() });
```

### Pinger — Timeout via AbortController

Node 24 `fetch` has no `timeout` option. Use `AbortController`:

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), env.PING_TIMEOUT_MS);
try {
	const res = await fetch(url, { method: "HEAD", signal: controller.signal });
	clearTimeout(timer);
} catch {
	// AbortError, DNS failure, connection refused — all treated as isUp = false
}
```

## Security Checklist

Before committing any route or middleware:

- [ ] All inputs validated with Zod before touching DB
- [ ] DB queries use parameterized `?` placeholders — never string interpolation
- [ ] Error responses never expose stack traces or DB details
- [ ] `helmet()` is the first middleware in `app.ts`
- [ ] CORS `origin` is an explicit allowlist, not `*` in production
- [ ] No secrets in source — all from `env.ts` (Zod-validated at startup)
