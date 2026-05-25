# Phase 4: Hot Module Replacement - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

File changes update the browser without full reload, preserving component state. Includes WebSocket connection between dev server and browser, module replacement logic, state preservation during updates, and error display. Build tooling integration (webpack/vite plugins) is separate scope.

</domain>

<decisions>
## Implementation Decisions

### Update feedback
- Silent DOM updates on successful HMR — no visual flash or toast
- Auto full reload when HMR cannot hot-update (non-component files, boundary breaks)
- Minimal console logging: `[HMR] Updated: Button.js` — one line per update
- Persistent small corner indicator showing connection status (green dot when connected)

### State boundaries
- Preserve component state (useState, etc.) by default on HMR updates
- Form input state preservation — Claude's discretion on technical approach
- Preserve scroll position unless layout significantly changed
- External state stores (contexts, global) survive HMR — only component code updates

### Error display
- Full-screen red overlay on HMR failure (syntax errors, runtime errors)
- Overlay shows: error message, file path, line number, code snippet, stack trace
- Dismiss via X button or Escape key, plus auto-dismiss when error is fixed
- Click-to-open file in editor — configurable editor (VS Code, Cursor, etc.)

### Module cleanup
- Auto-cleanup all timers (setInterval, setTimeout) from replaced modules
- Auto-cleanup tracked event listeners from replaced modules
- Best-effort abort for pending fetches and WebSocket connections
- Console warning when potential cleanup leak detected (e.g., untracked global listener)

### Claude's Discretion
- Form state preservation technical approach
- Layout change detection algorithm for scroll preservation
- Specific cleanup tracking implementation
- Connection indicator UI design and positioning

</decisions>

<specifics>
## Specific Ideas

- Connection indicator should be unobtrusive — small colored dot, not a banner
- Error overlay should feel like Vite's error overlay — clear, actionable, not overwhelming
- Console output should be scannable — consistent prefix `[HMR]` for all messages

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-hot-module-replacement*
*Context gathered: 2026-01-22*
