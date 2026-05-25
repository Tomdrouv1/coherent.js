---
phase: 04-hot-module-replacement
plan: 03
subsystem: hmr
tags: [websocket, hmr, vite-api, state-preservation, hot-context]

# Dependency graph
requires:
  - phase: 04-01
    provides: CleanupTracker and StateCapturer modules
  - phase: 04-02
    provides: ErrorOverlay and ConnectionIndicator modules
provides:
  - ModuleTracker with Vite-compatible hot context API
  - HMRClient orchestrating WebSocket and state-preserving updates
  - Complete HMR system exported from @coherent.js/client
affects: [04-04, dev-server-integration, example-apps]

# Tech tracking
tech-stack:
  added: []
  patterns: [hot-context-api, websocket-reconnect, exponential-backoff, state-cycle]

key-files:
  created:
    - packages/client/src/hmr/module-tracker.js
    - packages/client/src/hmr/client.js
    - packages/client/src/hmr/index.js
  modified:
    - packages/client/src/hmr.js
    - packages/client/src/index.js

key-decisions:
  - "Vite-compatible hot context API for accept/dispose/data"
  - "Module boundary detection via accept handler or __hmrBoundary export"
  - "Exponential backoff with jitter for reconnection (1-30 second range)"
  - "Full page reload on reconnect after disconnect (server restart detection)"
  - "State capture/restore cycle wraps entire update flow"

patterns-established:
  - "Hot context API: createHotContext(moduleId) returns { data, accept, dispose, ... }"
  - "Update cycle: capture -> dispose -> cleanup -> import -> accept -> restore"
  - "Backward compatible deprecation: re-export + IIFE auto-init"

# Metrics
duration: 7min
completed: 2026-01-22
---

# Phase 4 Plan 03: HMR Client Integration Summary

**Complete HMR client with Vite-compatible hot context API, WebSocket orchestration, and state-preserving updates via cleanup/state integration**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-22T10:35:29Z
- **Completed:** 2026-01-22T10:42:55Z
- **Tasks:** 3
- **Files modified:** 5 created/modified, 2 test files

## Accomplishments
- ModuleTracker provides Vite-compatible hot context API (accept/dispose/data/invalidate)
- HMRClient orchestrates WebSocket connection with exponential backoff reconnection
- Full state-preserving update cycle: capture -> dispose -> cleanup -> import -> accept -> restore
- All HMR modules integrated and exported from @coherent.js/client main entry
- Backward compatible deprecation of old hmr.js with auto-initialization preserved

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ModuleTracker** - `6e1153b` (feat)
2. **Task 2: Create HMRClient** - `d3d7063` (feat)
3. **Task 3: Wire up exports** - `74a7adb` (feat)

## Files Created/Modified

### Created
- `packages/client/src/hmr/module-tracker.js` - Vite-compatible hot context API with accept/dispose/data
- `packages/client/src/hmr/client.js` - WebSocket orchestration and update handling
- `packages/client/src/hmr/index.js` - Public HMR API exports
- `packages/client/test/hmr/module-tracker.test.js` - 42 tests for module tracker
- `packages/client/test/hmr/client.test.js` - 36 tests for HMR client

### Modified
- `packages/client/src/hmr.js` - Deprecated, re-exports from hmr/index.js with legacy IIFE
- `packages/client/src/index.js` - Added HMR exports section

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Vite-compatible hot context API | Industry standard, familiar to developers, documented pattern |
| Module boundary via accept handler or __hmrBoundary | Explicit opt-in for HMR, fallback to autoHydrate for legacy code |
| Exponential backoff with jitter (1-30s) | Prevents thundering herd on dev server restart |
| Full page reload on reconnect after disconnect | Server may have restarted with different code |
| State capture/restore wraps entire update | Ensures form inputs and scroll survive even on fallback hydrate |
| Backward compatible deprecation | Existing code using `import '@coherent.js/client/src/hmr.js'` continues working |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Mock WebSocket in tests:** Initial test implementation used async setTimeout which conflicted with vi.useFakeTimers(). Fixed by using synchronous state updates and explicit simulateOpen() calls.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 04-04:** Dev server integration
- Complete HMR client available: `import { hmrClient } from '@coherent.js/client'`
- Hot context API for module authors: `createHotContext(moduleId)`
- All four HMR requirements addressed:
  1. File changes update browser without reload (hmrClient.handleUpdate)
  2. Form inputs and component state survive (stateCapturer.captureAll/restoreAll)
  3. Old module effects cleaned up (cleanupTracker.cleanup)
  4. Errors display with file/line/message (errorOverlay.show)

**Phase 4 core implementation complete.** Next plan will integrate with dev server for end-to-end HMR.

---
*Phase: 04-hot-module-replacement*
*Completed: 2026-01-22*
