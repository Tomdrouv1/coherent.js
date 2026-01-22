---
phase: 05-typescript
plan: 04
subsystem: types
completed: 2026-01-22

dependency-graph:
  requires: ["05-01"]
  provides: ["integration-package-types", "api-validation-types", "database-model-types"]
  affects: ["05-05", "05-06"]

tech-stack:
  added: []
  patterns:
    - name: "generic-type-chaining"
      description: "ModelQuery<T> chains generics through all query methods"
    - name: "database-specific-configs"
      description: "Type-safe configs for PostgreSQL, MySQL, SQLite, MongoDB"
    - name: "framework-adapter-pattern"
      description: "Consistent pattern across Express, Fastify, Koa, Next.js"

key-files:
  created: []
  modified:
    - path: "packages/api/types/index.d.ts"
      change: "Added core imports, typed validation with generics, JSDoc documentation"
    - path: "packages/database/types/index.d.ts"
      change: "Added typed ModelQuery<T>, database-specific configs, model generics"
    - path: "packages/express/types/index.d.ts"
      change: "Fixed core import, added coherentMiddleware, renderComponent exports"
    - path: "packages/fastify/types/index.d.ts"
      change: "Fixed core import, added fastifyCoherent, type guards"
    - path: "packages/koa/types/index.d.ts"
      change: "Fixed core import, added coherentMiddleware, CoherentContext"
    - path: "packages/nextjs/types/index.d.ts"
      change: "Fixed core import, added coherentApiHandler, withCoherentProps"

decisions:
  - id: "05-04-001"
    decision: "Used typed ValidationRule<T> generic for custom validators"
    context: "Need type-safe validation with transforms and enum constraints"
    alternative: "Could use any for all validation values"
    rationale: "Generic type carries through to custom validators and enums"

  - id: "05-04-002"
    decision: "Added database-specific config types as union"
    context: "Different databases have different configuration options"
    alternative: "Could use single generic config with optional properties"
    rationale: "Type-safe configs prevent invalid options for each database"

  - id: "05-04-003"
    decision: "Standardized middleware naming across adapters"
    context: "Express, Koa use coherentMiddleware; Fastify uses fastifyCoherent"
    alternative: "Could use same name across all frameworks"
    rationale: "Follows each framework's naming conventions"

metrics:
  duration: "~10 minutes"
  tasks-completed: 3
  tasks-total: 3

tags:
  - typescript
  - types
  - api
  - database
  - express
  - fastify
  - koa
  - nextjs
  - generics
---

# Phase 5 Plan 4: Integration Package Types Summary

**One-liner:** Type definitions for integration packages with core type imports and generic support for validation/database models.

## What Was Built

This plan enhanced type definitions for six integration packages (api, database, express, fastify, koa, nextjs) to properly import from @coherent.js/core and provide accurate TypeScript support.

### API Package Types

Enhanced with:
- Import of `CoherentNode` and `RenderOptions` from core
- `ValidationRule<T>` generic for type-safe validation
- Separated validation types: `ValidationPrimitiveType`, `ValidationCompoundType`, `ValidationFormatType`
- `ValidationErrorInfo` interface for structured error reporting
- Nested validation support (`items`, `properties`) for arrays and objects
- JSDoc documentation with examples for complex interfaces
- `withInputValidation` for combined body/query/params validation
- `BadRequestError` class for HTTP 400 errors

### Database Package Types

Enhanced with:
- Database-specific config interfaces: `PostgreSQLConfig`, `MySQLConfig`, `SQLiteConfig`, `MongoDBConfig`, `MemoryConfig`
- `DatabaseSpecificConfig` union type for type-safe connection creation
- `Model<T>` and `ModelInstance<T>` with full generic support
- `ModelQuery<T>` with generic chaining through all query methods
- Typed `where` overloads with column type inference
- `select()` returning `ModelQuery<Pick<T, K>>` for column selection
- Typed column names for aggregation functions (sum, avg, min, max)
- `InferModelAttributes` helper type for schema-to-type inference
- `createTypedConnection` function for database-specific configs
- JSDoc examples for `createModel` and `ModelQuery` usage

### Framework Adapter Types

All four adapters updated with:
- Fixed imports from `@coherent.js/core` (was incorrectly `@coherent/core`)
- Proper `CoherentNode` and `RenderOptions` usage in interfaces

**Express:**
- `coherentMiddleware` function export
- `renderComponent` utility function
- `CoherentResponse.renderCoherent()` method

**Fastify:**
- `fastifyCoherent` as preferred plugin name
- `coherentFastify` deprecated for backward compatibility
- `renderComponent` and `renderToStream` utilities
- Type guards: `isCoherentReply`, `isCoherentRequest`, `isCoherentInstance`

**Koa:**
- `coherentMiddleware` function export
- `CoherentContext` with rendering utilities
- `renderComponent` and `isCoherentObject` helpers

**Next.js:**
- `coherentApiHandler` wrapper export
- `withCoherentProps` alias for `withServerSideProps`
- `renderToString` utility function
- Enhanced page and layout types

## Technical Patterns

### Generic Type Chaining (ModelQuery)

```typescript
interface User { id: number; email: string; name: string; }

const users = await User.query()
  .where({ email: 'test@example.com' })  // ModelQuery<User>
  .orderBy('createdAt', 'DESC')          // ModelQuery<User>
  .limit(10)                             // ModelQuery<User>
  .get();                                // ModelInstance<User>[]
```

### Database-Specific Configuration

```typescript
// Type-safe PostgreSQL config
const pgConfig: PostgreSQLConfig = {
  type: 'postgresql',
  host: 'localhost',
  database: 'myapp',
  ssl: { rejectUnauthorized: false }
};

// createTypedConnection infers correct options
const conn = await createTypedConnection(pgConfig);
```

### Validation Rule Generics

```typescript
const ageRule: ValidationRule<number> = {
  type: 'number',
  min: 0,
  max: 150,
  custom: (value) => value >= 18 || 'Must be 18 or older'  // value is number
};
```

## Verification Results

All integration packages verified:

| Package | Import from Core | Key Export |
|---------|-----------------|------------|
| api | CoherentNode, RenderOptions | ValidationSchema |
| database | N/A | ModelQuery<T> |
| express | CoherentNode, RenderOptions | coherentMiddleware |
| fastify | CoherentNode, RenderOptions | fastifyCoherent |
| koa | CoherentNode, RenderOptions | coherentMiddleware |
| nextjs | CoherentNode, RenderOptions | coherentApiHandler |

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | API package types with core imports and validation generics | bd14717 |
| 2 | Database types with model generics and database-specific configs | 3d5781e |
| 3 | Framework adapter types with core imports | 4ad8120 |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 5 Plan 5 can proceed. All integration packages now have:
- Correct imports from @coherent.js/core
- Type-safe generic support where applicable
- Consistent patterns across all framework adapters
- Comprehensive JSDoc documentation
