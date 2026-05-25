---
phase: 05-typescript
plan: 01
subsystem: typing
tags: [typescript, types, html-elements, strict-typing, dts]

# Dependency graph
requires: []
provides:
  - Strict HTML element types with per-element attribute validation
  - CoherentChild type excluding boolean (use null/undefined for conditionals)
  - HTMLElementAttributeMap for tag-to-attribute mapping
  - VoidElementTagNames for elements without children
  - StrictCoherentElement type for opt-in strict checking
affects: [05-typescript-02, 05-typescript-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mapped types for HTML element attributes
    - Template literal types for data-* attributes
    - DOM event types for handlers (MouseEvent, KeyboardEvent, etc.)

key-files:
  created:
    - packages/core/types/elements.d.ts
  modified:
    - packages/core/types/index.d.ts
    - packages/core/tsconfig.typecheck.json

key-decisions:
  - "StrictCoherentElement opt-in (backward compatible)"
  - "Boolean not allowed in children (use null/undefined)"
  - "Void elements cannot have children property"
  - "Event handlers accept string | function union"

patterns-established:
  - "Permissive CoherentElement vs strict StrictCoherentElement pattern"
  - "GlobalHTMLAttributes + GlobalEventHandlers + CoherentElementBase composition"
  - "HTMLElementAttributeMap mapped type for per-element validation"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 5 Plan 1: Strict HTML Element Types Summary

**Mapped types for all HTML elements with per-element attribute validation, strict children types (no booleans), and void element handling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T13:42:44Z
- **Completed:** 2026-01-22T13:46:51Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created comprehensive elements.d.ts with 1080+ lines of strict HTML element type definitions
- Added per-element attribute interfaces (InputAttributes, ButtonAttributes, AnchorAttributes, etc.)
- Implemented template literal types for data-* attributes
- Added proper DOM event types for all event handlers (MouseEvent, KeyboardEvent, FocusEvent, etc.)
- Updated index.d.ts to re-export new types while maintaining backward compatibility
- Enabled strict mode in tsconfig.typecheck.json for maximum type safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Create elements.d.ts with strict HTML element types** - `bc1ab6d` (feat)
2. **Task 2: Update index.d.ts to export new element types** - `2795934` (feat)
3. **Task 3: Enable strict mode in tsconfig.typecheck.json** - `269e3c3` (chore)

## Files Created/Modified
- `packages/core/types/elements.d.ts` - New file with strict HTML element types, 1080 lines
- `packages/core/types/index.d.ts` - Added re-export and JSDoc documentation
- `packages/core/tsconfig.typecheck.json` - Added strict mode options

## Decisions Made
- **StrictCoherentElement opt-in:** Keep existing CoherentElement permissive for backward compatibility. New strict types are opt-in.
- **Boolean excluded from children:** CoherentChild type excludes boolean - use null/undefined for conditional rendering.
- **Void elements no children:** Elements like img, input, br have children property omitted (not optional).
- **Event handler union:** All event handlers typed as `string | ((event: EventType) => void)` to support both SSR (string) and hydration (function).
- **Attribute aliases:** Include both camelCase and lowercase aliases (autoFocus/autofocus, readOnly/readonly) for DX.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Strict element types are ready for use across all packages
- Type tests can now use StrictCoherentElement for strict validation
- Plan 02 can add component typing building on these element types
- Plan 03 can add render function strict overloads

---
*Phase: 05-typescript*
*Completed: 2026-01-22*
