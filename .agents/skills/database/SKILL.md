---
name: database
description: >
  PingBoard database patterns. Use this skill whenever writing or modifying
  database-related code — including SQLite schema design, knex migrations,
  better-sqlite3 query patterns, uptime calculation queries, or database
  client setup. Trigger on: migration, schema, table, query, SQLite, knex,
  better-sqlite3, uptime calculation, ping_logs, services table, or any
  db/ directory file.
---

# PingBoard Database Skill

## Project Structure

```
apps/backend/
├── src/db/
│   ├── client.ts       # better-sqlite3 singleton — WAL pragmas, FK enforcement
│   └── migrate.ts      # Runs knex.migrate.latest() at startup, then destroys knex
├── migrations/         # knex migration files
└── knexfile.js         # client: 'better-sqlite3', useNullAsDefault: true

packages/shared/src/
└── types/status.ts     # DaySummary, ServiceWithHistory — consumed by API + frontend
```

Read the relevant file before modifying. New columns = new migration file, never edit existing ones.

---

## Schema (reference)

```sql
CREATE TABLE users (
  id  INT PRIMARY KEY AUTOINCREMENT,
  username    TEXT  NOT NULL,
  pwd_hash    TEXT  NOT NULL,
  created_at  INT   NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE services (
  id          INT   PRIMARY KEY AUTOINCREMENT,
  name        TEXT  NOT NULL,
  url         TEXT  NOT NULL UNIQUE,
  description TEXT,
  is_active   INT   NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at  INT   NOT NULL DEFAULT (unixepoch()),
  created_by  INT   NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ping_logs (
  id          INT PRIMARY KEY AUTOINCREMENT,
  service_id  INT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_up       INT NOT NULL CHECK(is_up IN (0, 1)),
  status_code INT,          -- NULL on timeout/network error
  latency_ms  INT,          -- NULL when is_up = 0
  checked_at  INT NOT NULL DEFAULT (unixepoch())
);

-- Both indexes are required — omitting them makes the 90-day query orders of magnitude slower
CREATE INDEX idx_ping_logs_service_checked ON ping_logs(service_id, checked_at DESC);
CREATE INDEX idx_ping_logs_checked_at ON ping_logs(checked_at DESC);
```

---

## Critical Patterns (non-obvious)

### SQLite Pragmas — Apply on Every Connection

SQLite defaults are unsafe or slow for this use case. `client.ts` must set these before any query:

| Pragma         | Value    | Why                                                     |
| -------------- | -------- | ------------------------------------------------------- |
| `journal_mode` | `WAL`    | Concurrent reads during writes (RPi multi-process safe) |
| `foreign_keys` | `ON`     | Off by default — required for ON DELETE CASCADE to work |
| `busy_timeout` | `5000`   | Prevents instant SQLITE_BUSY errors under contention    |
| `synchronous`  | `NORMAL` | Safe with WAL; `FULL` is unnecessary overhead           |

```ts
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");
```

### 90-Day History Query (complex — copy precisely)

The recursive CTE generates a full 90-day calendar so days with zero pings still appear:

```sql
WITH RECURSIVE
days(d) AS (
  SELECT unixepoch('now', 'start of day', '-89 days')
  UNION ALL
  SELECT d + 86400 FROM days WHERE d < unixepoch('now', 'start of day')
)
SELECT
  d AS date,
  COUNT(pl.id)              AS total_checks,
  COALESCE(SUM(pl.is_up), 0) AS successful_checks
FROM days
LEFT JOIN ping_logs pl
  ON  pl.service_id = ?
  AND pl.checked_at >= d
  AND pl.checked_at <  d + 86400
GROUP BY d
ORDER BY d ASC
```

Returns 90 rows oldest → newest. Rows where `total_checks = 0` have no data for that day.

### better-sqlite3 is Synchronous

All queries are **blocking/synchronous** — no `await`, no `.then()`. This is intentional.

```ts
// ✅ Correct
const rows = db.prepare("SELECT * FROM services").all();
const result = db
	.prepare("INSERT INTO services (name, url) VALUES (?, ?)")
	.run(name, url);

// ❌ Wrong — never await a better-sqlite3 call
const rows = await db.prepare("...").all();
```

### Data Retention

Prune logs older than 92 days via a daily cron job in `pinger.ts` to cap DB size:

```ts
db.prepare("DELETE FROM ping_logs WHERE checked_at < ?").run(
	Math.floor(Date.now() / 1000) - 92 * 86400
);
```

---

## Migration Rules

- Never modify a migration file after it has been committed/run.
- Always implement both `up` and `down`.
- Add indexes in the same migration as the table they cover.
- New columns or tables → new numbered migration file.
