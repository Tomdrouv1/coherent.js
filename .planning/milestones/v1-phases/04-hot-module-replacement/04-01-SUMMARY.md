---
phase: 04-hot-module-replacement
plan: 01
subsystem: client
tags: [hmr, state-preservation, resource-cleanup, timers, events, scroll]

# Dependency graph
requires:
  - phase: 02-hydration
    provides: Event delegation and state serialization patterns
provides:
  - CleanupTracker class for module resource disposal
  - StateCapturer class for form/scroll state preservation
  - Tracked timer/interval/listener/fetch APIs
  - Layout change detection for scroll restoration
affects: [04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-module resource tracking with cleanup
    - Stable input key generation for cross-update matching
    - Layout change detection (50px threshold)

key-files:
  created:
    - packages/client/src/hmr/cleanup-tracker.js
    - packages/client/src/hmr/state-capturer.js
    - packages/client/test/hmr/cleanup-tracker.test.js
    - packages/client/test/hmr/state-capturer.test.js
  modified:
    - eslint.config.js

key-decisions:
  - "Per-module resource tracking via moduleResources Map keyed by moduleId"
  - "Stable input keys: prefer id, then name+type, then DOM path fallback"
  - "50px threshold for layout change detection before scroll restoration"
  - "Tracked fetch wraps native fetch with auto-created AbortController"

patterns-established:
  - "CleanupTracker.createContext(moduleId) returns tracked API object"
  - "StateCapturer.captureAll()/restoreAll() for HMR lifecycle hooks"
  - "checkForLeaks() for development mode leak detection"

# Metrics
duration: 7min
completed: 2026-01-22
---

# Phase 04 Plan 01: HMR Core Infrastructure Summary

**CleanupTracker for timer/listener/fetch disposal and StateCapturer for form input/scroll position preservation during HMR updates**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-22T10:22:44Z
- **Completed:** 2026-01-22T10:29:14Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- CleanupTracker class tracking timers, intervals, event listeners, and AbortControllers per module
- Auto-cleanup on module disposal (clearTimeout, clearInterval, removeEventListener, abort)
- StateCapturer class capturing form input values, selection ranges, and checkbox states
- Scroll position preservation with layout change detection (>50px shift skips restoration)
- 61 comprehensive tests covering both modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cleanup tracker for module resource disposal** - `3d77d7a` (feat)
2. **Task 2: Create state capturer for form inputs and scroll positions** - `c90d8e5` (feat)

## Files Created/Modified
- `packages/client/src/hmr/cleanup-tracker.js` - CleanupTracker class with createContext, cleanup, checkForLeaks
- `packages/client/src/hmr/state-capturer.js` - StateCapturer class with form/scroll capture and restore
- `packages/client/test/hmr/cleanup-tracker.test.js` - 30 tests for CleanupTracker
- `packages/client/test/hmr/state-capturer.test.js` - 31 tests for StateCapturer
- `eslint.config.js` - Added browser API globals (fetch, AbortController, etc.) for client package

## Decisions Made
- **Per-module resource tracking:** Uses Map keyed by moduleId, enabling targeted cleanup on HMR dispose
- **Input key generation priority:** id > name+type > DOM path - balances stability with fallback coverage
- **50px layout change threshold:** Matches scroll anchoring patterns, prevents jarring scroll on significant layout changes
- **Tracked fetch pattern:** Auto-creates AbortController and removes from tracking on completion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added browser API globals to ESLint config**
- **Found during:** Task 1 (CleanupTracker implementation)
- **Issue:** ESLint was flagging fetch, AbortController, AbortSignal as undefined
- **Fix:** Added fetch, AbortController, AbortSignal, HTMLElement, KeyboardEvent, Event, CustomEvent, MutationObserver to client package globals
- **Files modified:** eslint.config.js
- **Verification:** `pnpm lint` passes
- **Committed in:** 3d77d7a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for client-side code to use browser APIs. No scope creep.

## Issues Encountered
- Vitest fake timers return objects instead of numbers in some cases - adjusted test to verify timer usability rather than type

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CleanupTracker and StateCapturer modules ready for HMR client integration
- Plan 02 can import these modules for the main HMR client implementation
- No blockers or concerns

---
*Phase: 04-hot-module-replacement*
*Plan: 01*
*Completed: 2026-01-22*
