# Phase 2: Hydration - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Client-side hydration reliably attaches to server-rendered HTML with event delegation and state preservation. Users can hydrate SSR content and have interactive components. Client-only rendering is a separate API. HMR integration is a future phase.

</domain>

<decisions>
## Implementation Decisions

### Mismatch handling
- Warning only — log detailed warning but keep server HTML intact
- Show both DOM path AND component hierarchy in warnings for full context
- Always show expected vs actual diff values, even if long
- Mismatch detection configurable: off by default in prod, opt-in via hydrate() option

### Event delegation
- Use data attributes (e.g., `data-coherent-click="handler-id"`) to identify handlers on elements
- Event object passed to handlers should be wrapped with extra context (component, props, etc.)

### State serialization
- State embedded in data-state attributes on individual elements
- All component state serialized automatically
- Functions and non-serializable values omitted silently (they reconstruct on hydrate)
- State encoded as base64 for smaller payload with special chars

### Hydrate API
- Returns control object: `{ unmount(), rerender() }` for lifecycle control
- Accepts options object: `hydrate(component, container, { strict: true, onMismatch: fn })`
- Separate APIs: `hydrate()` for SSR content, `render()` for client-only rendering
- Import from `@coherent.js/client` package

### Claude's Discretion
- Root listener strategy (single vs per-event-type)
- Which events delegated vs direct attachment based on bubbling behavior
- Event wrapper implementation details
- Exact data attribute naming conventions

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-hydration*
*Context gathered: 2026-01-21*
