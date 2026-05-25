---
phase: 03-cli-scaffolding
plan: 01
subsystem: cli
tags: [cli, scaffolding, templates, code-generation]

# Dependency graph
requires:
  - phase: 02-hydration
    provides: completed client-side hydration for generated projects
provides:
  - Consolidated 2-template CLI (basic/fullstack)
  - Fixed auth route imports for Express and Koa
  - Consistent database adapter instantiation pattern
affects: [03-02, 03-03, cli-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adapter factory pattern: XAdapter(dbConfig) for all database types"
    - "Router export pattern: 'export default router' for auth routes"

key-files:
  modified:
    - packages/cli/src/commands/create.js
    - packages/cli/src/generators/auth-scaffold.js
    - packages/cli/src/generators/database-scaffold.js

key-decisions:
  - "Template consolidation from 6 to 2: basic and fullstack only"
  - "Runtime selection available for both templates (no template-to-runtime mapping)"
  - "Adapter factories receive dbConfig directly"
  - "Koa auth routes use 'export default router' instead of broken registerAuthRoutes"

patterns-established:
  - "Template options: basic (simple SSR app), fullstack (API + SSR with database/auth)"
  - "Adapter instantiation: setupDatabase({ adapter: XAdapter(dbConfig) })"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 03 Plan 01: Template Consolidation Summary

**Consolidated CLI templates from 6 to 2 (basic/fullstack) and fixed import mismatches in auth and database scaffolding**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-22T09:45:00Z
- **Completed:** 2026-01-22T09:53:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Reduced template choices from 6 to 2 for simpler user experience
- Fixed authMiddleware import missing from Express JWT routes
- Removed broken registerAuthRoutes function from Koa auth routes
- Standardized database adapter instantiation to pass config to factory functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Consolidate templates in create.js** - `0d8789a` (refactor)
2. **Task 2: Fix auth scaffold import issues** - `83be882` (fix)
3. **Task 3: Fix database adapter usage in generated init files** - `cec0528` (fix)

## Files Created/Modified
- `packages/cli/src/commands/create.js` - Reduced template choices, updated conditional checks
- `packages/cli/src/generators/auth-scaffold.js` - Added authMiddleware import, fixed Koa export
- `packages/cli/src/generators/database-scaffold.js` - Pass dbConfig to all adapter factories

## Decisions Made
- **Template consolidation:** Reduced from 6 templates (basic, fullstack, express, fastify, components, custom) to 2 (basic, fullstack). Runtime is now always a separate option, not determined by template.
- **Skip-prompts guard:** Added check for basic template package selection to respect --skip-prompts flag
- **Adapter config passing:** All adapters now receive dbConfig directly instead of spreading it into setupDatabase

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added skip-prompts guard to basic template**
- **Found during:** Task 1 (Template consolidation)
- **Issue:** Basic template package selection prompt ran even with --skip-prompts flag
- **Fix:** Added `&& !options.skipPrompts` condition to basic template else-if branch
- **Files modified:** packages/cli/src/commands/create.js
- **Verification:** Running with --skip-prompts no longer triggers interactive prompts
- **Committed in:** 0d8789a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Minor fix to ensure --skip-prompts works correctly. No scope creep.

## Issues Encountered
- Initial CLI test ran from dist/ directory with old code - resolved by rebuilding with `pnpm --filter @coherent.js/cli run build`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Template consolidation complete, ready for plan 03-02 (runtime scaffold improvements)
- Import statements now correct for generated projects
- Generated files pass Node.js syntax validation

---
*Phase: 03-cli-scaffolding*
*Completed: 2026-01-22*
