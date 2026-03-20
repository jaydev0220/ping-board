# Ping Board

A distributed URL uptime monitoring service with status pages. Ping Board continuously monitors registered services, logs uptime and latency data, and displays 90-day historical trends on a responsive dashboard.

## 🎯 Overview

Ping Board is a monorepo that combines:

- **Backend Worker** (Node.js + Express)
  - RESTful API for service management
  - Cron-based HTTP pinger that checks services every 5 minutes
  - SQLite-based uptime/latency logging with 90-day retention
  - JWT authentication with refresh token rotation

- **Frontend Dashboard** (SvelteKit + Tailwind CSS)
  - User registration and login
  - Service management
  - Real-time status visualization with 90-day uptime bars
  - Latency and status code tracking

## 📊 Key Features

### Backend

- ✅ User registration & login with JWT tokens
- ✅ Service CRUD with per-user quota (default: 2 services)
- ✅ Automatic HTTP pinging every 5 minutes (HEAD → GET fallback)
- ✅ Uptime/latency logging with 92-day retention pruning
- ✅ Status history retrieval for 90-day visualization
- ✅ Health check endpoint (`GET /health`)

### Frontend

- ✅ User registration & login
- ✅ Service management dashboard
- ✅ Service status cards with details
- ✅ 90-day uptime visualization with daily aggregation
- ✅ Responsive Tailwind CSS design
- ✅ Token refresh on 401 errors

## 📦 Tech Stack

| Concern     | Package            |
| ----------- | ------------------ |
| Runtime     | Node.js            |
| Backend     | Express            |
| Frontend    | Svelte / SvelteKit |
| Styling     | Tailwind CSS       |
| Database    | SQLite             |
| Scheduling  | node-cron          |
| Validation  | Zod                |
| Migrations  | knex               |
| Security    | helmet, CORS       |
| Language    | TypeScript         |
| Package Mgr | pnpm               |

## 📚 Documentation

- [API Documentation](./docs/API.md) - Complete endpoint reference, auth flows

## 🚀 Quick Start

### Prerequisites

- Node.js 24+ (LTS)
- pnpm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/jaydev0220/ping-board
cd ping-board

# Install dependencies
pnpm install

# Set up environment variables
# See apps/backend/.env.example and apps/frontend/.env.example
```

### Development

```bash
# Start both backend and frontend in development mode
pnpm dev
```

### Database Migrations

```bash
# Create a new migration
pnpm migrate:make <migration_name>

# Apply migrations (development)
pnpm migrate:latest:dev
# Apply migrations (production)
pnpm migrate:latest:prod

# Rollback last migration (development)
pnpm migrate:rollback:dev
# Rollback last migration (production)
pnpm migrate:rollback:prod
```

## 🔐 Security

- **Authentication**: JWT with 15m access token TTL, 7-day refresh token
- **CORS**: Configurable allowlist via `CORS_ALLOWED_ORIGINS` env var
- **Helmet**: Security headers enabled globally
- **Password**: Argon2id hashing
- **Cookies**: HttpOnly, SameSite strict, Secure (production only)
- **Validation**: Strict Zod schemas on all inputs
- **Database**: Parameterized queries only (SQLite prepared statements)

## 🛠️ Scripts

### Root-level Commands

```bash
pnpm dev                     # Start backend + frontend
pnpm build                   # Build all apps
pnpm lint                    # Lint all packages
pnpm format                  # Format all code
pnpm migrate:make <name>     # Create migration
pnpm migrate:latest:dev      # Apply migrations (dev)
pnpm migrate:latest:prod     # Apply migrations (prod)
pnpm migrate:rollback:dev    # Rollback (dev)
pnpm migrate:rollback:prod   # Rollback (prod)
```

### Backend-specific

```bash
pnpm dev                  # Watch mode with tsx
pnpm build                # Build for production
pnpm start                # Run production server
pnpm typecheck            # TypeScript checks only
pnpm lint                 # Run ESLint
pnpm format               # Format code with Prettier
pnpm test-pinger          # Test HTTP pinger
pnpm test-auth            # Test JWT auth flow
pnpm test-services-quota  # Test quota enforcement
```

### Frontend-specific

```bash
pnpm dev        # Vite dev server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm check      # SvelteKit type checks
pnpm lint       # Prettier + ESLint
pnpm format     # Format code with Prettier
```

## 🔧 Environment Variables

### Backend

```bash
NODE_ENV=development
HOST=127.0.0.1
PORT=3001
PING_TIMEOUT_MS=5000
SQLITE_PATH=./data/ping-board.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://example.com
JWT_SECRET=<32+ character secret>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
```

### Frontend

```bash
PUBLIC_API_BASE_URL=http://localhost:3001  # Backend API URL
```

## 📄 License

This project is open-source and available under the MIT License.
