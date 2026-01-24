# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- JavaScript (ES2022+) - All source code in `packages/*/src/` directories
- TypeScript (5.9.3) - Type definitions and optional strict type checking

**Secondary:**
- None - Codebase is JavaScript-first with JSDoc for type hints

## Runtime

**Environment:**
- Node.js 20.0.0+ (minimum required in all package.json files)

**Package Manager:**
- pnpm 10.28.1 (as specified in root package.json)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Coherent.js (custom SSR framework) - In `packages/core/`, provides component rendering engine
- Server framework adapters:
  - Express.js 4.18.0+ (peer dependency) - `packages/express/`
  - Fastify 4.0.0+ (peer dependency) - `packages/fastify/`
  - Koa.js 2.13.0+ (peer dependency) - `packages/koa/`
  - Next.js 13.0.0+ (peer dependency) - `packages/nextjs/`

**Build & Bundling:**
- esbuild 0.27.1 - Module bundling and transpilation
- TypeScript 5.9.3 - Type checking with `tsc --noEmit`
- Chokidar 4.0.3 - File watching for dev scripts

**Testing:**
- Vitest 4.0.15 - Test runner with Node.js environment
- @vitest/coverage-v8 4.0.15 - Code coverage with V8

**Development Tools:**
- ESLint 9.39.2 - Linting with flat config in `eslint.config.js`
- Prettier 3.7.4 - Code formatting with config in `.prettierrc`
- Husky 9.1.7 - Git hooks preparation
- @commitlint/cli 20.2.0 - Commit message validation
- @changesets/cli 2.29.8 - Versioning and changelog management

## Key Dependencies

**Critical:**
- None in core production dependencies (the framework is zero-dependency by design)
- All framework integrations are peer dependencies to keep size minimal

**Infrastructure:**
- React 19.2.3 (peer dependency) - Used in `packages/nextjs/` for Next.js integration
- Next.js 16.0.10 (devDependency for examples/testing)
- Marked 17.0.1 - Markdown parsing for website documentation
- ws 8.18.3 - WebSocket library for streaming/real-time features
- @types/node 24.10.1 - Node.js type definitions

**Build & Dev:**
- @codecov/vite-plugin 1.9.1 - Coverage reporting integration
- concurrently 9.2.1 - Running multiple commands in parallel

## Configuration

**Environment:**
- Environment-based configuration via `process.env`
- Required variables (from CLI scaffolding):
  - `NODE_ENV` - Application environment (development/production)
  - `JWT_SECRET` - For JWT authentication (if using auth scaffolding)
  - `SESSION_SECRET` - For session-based auth (if using session scaffolding)
  - `DATABASE_URL` - Database connection string (if using database package)
  - `MONGODB_URI` - MongoDB connection (if using MongoDB adapter)
  - `NEW_RELIC_API_KEY` - For performance monitoring integration (optional)
  - `DATADOG_API_KEY` - For Datadog integration (optional)

**Build:**
- Build config in shared script: `scripts/shared-build.mjs`
- TypeScript configs per package: `packages/*/tsconfig.json`
- Root TypeScript config: `tsconfig.json` with workspace references

## Platform Requirements

**Development:**
- Node.js 20+ with pnpm 8+
- Git (for Husky hooks)
- Unix-like shell (development scripts use bash/sh)

**Production:**
- Node.js 20+ runtime
- Optional: Express.js, Fastify, Koa.js, or Next.js for server deployment
- Optional: PostgreSQL, MySQL, SQLite, MongoDB for database support

---

*Stack analysis: 2026-01-21*
