# Phase 3: CLI Scaffolding - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

`coherent create` produces immediately runnable fullstack projects using current framework APIs. Scaffolding templates already exist in `packages/cli/src/generators/` — this phase fixes broken imports, updates generated code to use current APIs, and adds tests to prevent regression. The templates, prompts, and file structure are already implemented; the focus is making them work correctly.

</domain>

<decisions>
## Implementation Decisions

### Phase Priority
- Fix broken imports first — ensure generated code imports from current package APIs
- Audit each generator file against actual package exports
- Create test suite to catch broken imports automatically
- Tests prevent future breakage as APIs evolve

### Test Coverage
- Scaffold → TypeScript compiles without errors
- Server starts and responds on /
- Hit key endpoints (/, /api/health if auth enabled)
- Test ALL template × runtime × database × auth permutations

### Template Consolidation
- Reduce from 6 templates to 2: **basic** and **fullstack**
- "basic" = frontend-focused SSR
- "fullstack" = adds API + database options
- Runtime (express, fastify, koa, built-in) is an option within each template
- Remove 'express', 'fastify', 'components', 'custom' templates completely (delete the code)

### Default Values
- Default runtime: Built-in HTTP (no dependencies, simplest)
- Default language: JavaScript with JSDoc hints (no compile step)
- Default database for fullstack: None — user explicitly chooses (no surprises)

### Output & Feedback
- Show step-by-step progress: Creating files... Installing... Initializing git...
- Rich success message: config summary + file tree + env vars to configure
- Fail fast on errors: stop immediately, clean up partial scaffold, show error
- After success: offer to start dev server ("Start development server now? (y/n)")

### Claude's Discretion
- Exact test implementation details
- Which runtime × database × auth combinations to prioritize in test matrix ordering
- How to structure the audit process
- File tree format in success message

</decisions>

<specifics>
## Specific Ideas

- Existing generators in `packages/cli/src/generators/`: project-scaffold.js, auth-scaffold.js, database-scaffold.js, runtime-scaffold.js, package-scaffold.js, docker-scaffold.js
- Current prompt flow in `packages/cli/src/commands/create.js` uses `prompts` library
- TypeScript and JavaScript both supported via `language` option
- Docker configuration available for postgres/mysql/mongodb

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-cli-scaffolding*
*Context gathered: 2026-01-21*
