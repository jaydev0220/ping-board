# Agent Instructions

## Project

URL uptime monitor with status pages. A Node.js cron worker pings registered services every 5 min, logs uptime/latency to SQLite. Svelte frontend renders 90-day uptime history bars. Worker runs on RPi; frontend deploys to Vercel.

## Monorepo Structure

```
pingboard/
├── apps/
│   ├── backend/         # Express API + cron pinger (RPi)
│   └── frontend/        # Svelte status page (Vercel)
├── packages/
│   └── shared/          # Zod schemas, shared TS types
├── pnpm-workspace.yaml
└── package.json
```

## Stack (exact versions required)

| Concern     | Package                            |
| ----------- | ---------------------------------- |
| Runtime     | Node.js 24+ LTS                    |
| Backend     | Express 5+, better-sqlite3 12+     |
| Scheduling  | node-cron 4+                       |
| Validation  | Zod 4+                             |
| Migrations  | knex 3+                            |
| Security    | helmet 8+, cors 2+                 |
| Frontend    | Svelte 5, Tailwind CSS 4+          |
| Language    | TypeScript 5.9+ (`strict: true`)   |
| Pkg manager | pnpm 10+ with catalog              |
| Linting/fmt | ESLint (latest), Prettier (latest) |

## Rules

1. **No guessing** — State unknowns explicitly. Never assume undocumented behavior.
2. **No fabrication** — Never hallucinate APIs, types, signatures, or behaviors.
3. **No flattery** — Objective tone. Correct errors directly and immediately.
4. **Security-first** — Zod-validate all inputs. Parameterized queries only. helmet + cors on every Express app. Never expose internal errors to clients.
5. **Type-safe** — All code TypeScript with `strict: true`. Justify every `any` or it gets removed.
6. **Dependency hygiene** — All deps declared via pnpm catalog. No version pinning outside `package.json` catalog block.
7. **Clean output** — ESLint + Prettier compliant. No dead code. No `TODO` in committed code.

## Git Commits

Load `~/.copilot/skills/git-commit/SKILL.md` for commit format and examples.

**Rules:**

- Commit after every discrete unit of work. Never batch unrelated changes.
- One migration, one route, one component, one bug fix — one commit each.
- Config/tooling changes go in their own commit, never mixed with feature code.

**Workflow:** Complete a unit of work → verify it compiles/lints → `git add` only relevant files → commit.

## Thinking Framework

When a non-trivial solution is required:

1. **Deconstruct** — Identify all constraints, inputs, outputs, and failure modes.
2. **Diverge** — Propose 3 distinct solution paths.
3. **Critique** — Stress-test each: edge cases, bottlenecks, security holes.
4. **Execute** — Implement the most robust path with explicit reasoning per step.
5. **Verify** — Validate output against every stated constraint. Zero assumptions.

## Skills

Load the relevant skill file **before** writing implementation code:

- **Backend** (Express routes, cron, Zod, security): `.agents/skills/backend/SKILL.md`
- **Frontend** (Svelte 5 runes, Tailwind 4, charts): `.agents/skills/frontend/SKILL.md`
- **Database** (SQLite schema, knex migrations, queries): `.agents/skills/database/SKILL.md`
