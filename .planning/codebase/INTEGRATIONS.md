# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Server Frameworks:**
- Express.js (>=4.18.0, <6.0.0) - Adapter at `packages/express/`
  - SDK/Client: express package
  - Integration: Via `setupCoherent(app)` function, registers Coherent.js as view engine

- Fastify (>=4.0.0, <6.0.0) - Adapter at `packages/fastify/`
  - SDK/Client: fastify package
  - Integration: Custom plugin registration

- Koa.js (>=2.13.0, <4.0.0) - Adapter at `packages/koa/`
  - SDK/Client: koa package
  - Integration: Middleware registration

- Next.js (>=13.0.0, <16.0.0) - Integration at `packages/nextjs/`
  - SDK/Client: next, react packages
  - Integration: Server component rendering

**Monitoring & Performance:**
- New Relic (optional) - API key via `NEW_RELIC_API_KEY` env var
  - Used in `packages/performance/` for APM integration
  - Reference: `packages/performance/README.md`

- Datadog (optional) - API key via `DATADOG_API_KEY` env var
  - Used in `packages/performance/` for metrics collection
  - Reference: `packages/performance/README.md`

## Data Storage

**Databases:**
- PostgreSQL (>=8.8.0, <9.0.0) - Adapter at `packages/database/src/adapters/postgresql.js`
  - Client: pg package (peer dependency, optional)
  - Connection: Via `createPostgreSQLAdapter()` factory
  - Environment: `DATABASE_URL` for connection string

- MySQL (>=3.0.0, <4.0.0) - Adapter at `packages/database/src/adapters/mysql.js`
  - Client: mysql2 package (peer dependency, optional)
  - Connection: Via `createMySQLAdapter()` factory
  - Environment: `DATABASE_URL` for connection string

- SQLite (>=5.1.0, <6.0.0) - Adapter at `packages/database/src/adapters/sqlite.js`
  - Client: sqlite3 package (peer dependency, optional)
  - Connection: Via `createSQLiteAdapter()` factory
  - Default in-memory: `:memory:` database

- MongoDB (>=5.0.0, <7.0.0) - Adapter at `packages/database/src/adapters/mongodb.js`
  - Client: mongodb package (peer dependency, optional)
  - Connection: Via `createMongoDBAdapter()` factory
  - Environment: `MONGODB_URI` for connection string

**File Storage:**
- Local filesystem only - No cloud storage integration

**Caching:**
- None detected - Framework handles memoization internally via `@coherent.js/performance`

## Authentication & Identity

**Auth Provider:**
- Custom implementation - No third-party auth service required

**Supported Patterns:**
1. **JWT Authentication** - Generated in `packages/cli/src/generators/auth-scaffold.js`
   - Implementation: `jsonwebtoken` package for token generation/verification
   - Environment: `JWT_SECRET`, `JWT_EXPIRES_IN`
   - Available for Express, Fastify, Koa

2. **Session-based Authentication** - Generated in auth scaffolding
   - Express: Uses `express-session` package
   - Fastify: Uses `@fastify/session` and `@fastify/cookie` plugins
   - Koa: Uses `koa-session` package
   - Environment: `SESSION_SECRET`
   - Configuration: HTTPOnly, Secure cookies, 7-day max age

## Monitoring & Observability

**Error Tracking:**
- None detected - Errors handled locally via application-level error middleware

**Logs:**
- Console-based logging - Via `console` methods (allowed in ESLint config)
- Devtools logger at `packages/devtools/src/logger.js`
- No external log aggregation detected

**Performance Monitoring:**
- Internal performance package: `packages/performance/` with dashboard
- Optional: New Relic and Datadog integrations supported
- Built-in: `performanceMonitor` global available for profiling

## CI/CD & Deployment

**Hosting:**
- Not specified - Designed for flexibility (Express/Fastify/Koa/Next.js compatible)

**CI Pipeline:**
- GitHub Actions workflows detected in repository structure
- Commands available:
  - `pnpm test:ci` - Run tests without cache
  - `pnpm test:coverage:ci` - Coverage with cache disabled
  - `pnpm lint` - ESLint with max 0 warnings
  - `pnpm typecheck` - TypeScript type checking
  - `pnpm build` - Build all packages

**Version Management:**
- Changesets for monorepo versioning (`@changesets/cli`)
- Release commands:
  - `pnpm publish:beta` - Publish beta versions
  - `pnpm publish:latest` - Publish to npm latest
  - `pnpm release` - Run full release cycle

## Environment Configuration

**Required env vars:**
- `NODE_ENV` - Application environment (development/production)
- Framework-specific:
  - `JWT_SECRET` - For JWT auth (if using auth scaffolding)
  - `JWT_EXPIRES_IN` - Token expiration time (default: 7d)
  - `SESSION_SECRET` - For session auth (if using session scaffolding)

**Database-specific:**
- `DATABASE_URL` - PostgreSQL/MySQL connection string
- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017/coherent_db)

**Optional monitoring:**
- `NEW_RELIC_API_KEY` - New Relic APM
- `DATADOG_API_KEY` - Datadog metrics

**Secrets location:**
- Environment variables only
- Local `.env` file in root (contains `NODE_AUTH_TOKEN` for npm)
- CI/CD secrets managed by GitHub Actions

## Webhooks & Callbacks

**Incoming:**
- Framework supports middleware for webhook endpoints
- No pre-built webhook handlers detected
- Can be implemented via Express/Fastify/Koa adapters

**Outgoing:**
- None detected

## Docker & Containerization

**Support:**
- Docker scaffolding available via CLI: `packages/cli/src/generators/docker-scaffold.js`
- Generates Dockerfile and docker-compose.yml for:
  - PostgreSQL + Express/Fastify/Koa
  - MySQL + Express/Fastify/Koa
  - MongoDB + Express/Fastify/Koa
- Database service orchestration included

---

*Integration audit: 2026-01-21*
