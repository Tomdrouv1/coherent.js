---
'@coherent.js/adapters': patch
'@coherent.js/api': patch
'@coherent.js/build-tools': patch
'@coherent.js/cli': patch
'@coherent.js/client': patch
'@coherent.js/core': patch
'@coherent.js/database': patch
'@coherent.js/devtools': patch
'@coherent.js/express': patch
'@coherent.js/fastify': patch
'@coherent.js/forms': patch
'@coherent.js/i18n': patch
'@coherent.js/koa': patch
'@coherent.js/nextjs': patch
'@coherent.js/performance': patch
'@coherent.js/profiler': patch
'@coherent.js/runtime': patch
'@coherent.js/seo': patch
'@coherent.js/state': patch
'@coherent.js/testing': patch
'@coherent.js/web-components': patch
---

CLI generators were producing projects with outdated dependency versions (`1.0.0-beta.1`) instead of the current framework version (`1.0.0-beta.2`), causing installation conflicts and inconsistent package management.

Updated all hardcoded Coherent.js package versions from `1.0.0-beta.1` to `^1.0.0-beta.2` across all generator files:

**Files Modified:**

- `packages/cli/src/generators/runtime-scaffold.js`
- `packages/cli/src/generators/database-scaffold.js`
- `packages/cli/src/generators/package-scaffold.js`
- `packages/cli/src/generators/project-scaffold.js`

**Packages Updated:**

- `@coherent.js/core`: `^1.0.0-beta.1` → `^1.0.0-beta.2`
- `@coherent.js/cli`: `^1.0.0-beta.1` → `^1.0.0-beta.2`
- `@coherent.js/express`: `1.0.0-beta.1` → `^1.0.0-beta.2`
- `@coherent.js/fastify`: `1.0.0-beta.1` → `^1.0.0-beta.2`
- `@coherent.js/koa`: `1.0.0-beta.1` → `^1.0.0-beta.2`
- `@coherent.js/database`: `^1.0.1` → `^1.0.0-beta.2`
- `@coherent.js/api`: `^1.0.0` → `^1.0.0-beta.2`
- `@coherent.js/client`: `^1.0.0` → `^1.0.0-beta.2`
- `@coherent.js/i18n`: `^1.0.0` → `^1.0.0-beta.2`
- `@coherent.js/forms`: `^1.0.0` → `^1.0.0-beta.2`
- `@coherent.js/devtools`: `^1.0.0` → `^1.0.0-beta.2`
- `@coherent.js/seo`: `^1.0.0` → `^1.0.0-beta.2`
- `@coherent.js/testing`: `^1.0.0` → `^1.0.0-beta.2`

- ✅ All 51 CLI tests pass
- ✅ Generated projects install dependencies correctly
- ✅ No empty files are generated
- ✅ TypeScript configuration works properly
- ✅ All generator types function (components, pages, APIs, models, middleware)

- **Users now get projects with correct, up-to-date dependency versions**
- **Eliminates package conflicts during installation**
- **Ensures consistent framework behavior across generated projects**
- **Maintains compatibility with latest Coherent.js features**

Verified with multiple configurations:

- Basic projects with all runtime options (built-in, Express, Fastify, Koa)
- Full-stack projects with database integration (PostgreSQL, MySQL, SQLite, MongoDB)
- Authentication scaffolding (JWT and session-based)
- All optional packages enabled
- Both JavaScript and TypeScript projects
- Component, page, API, model, and middleware generation

**No breaking changes** - this is a pure bug fix release that ensures version consistency.
