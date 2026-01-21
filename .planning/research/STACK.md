# Technology Stack for SSR/Hydration Stabilization

**Project:** Coherent.js Framework Stabilization
**Research Focus:** SSR rendering and hydration best practices
**Researched:** 2026-01-21
**Overall Confidence:** HIGH

---

## Executive Summary

Coherent.js has the right architecture foundation (object-based virtual DOM, server rendering, client hydration) but suffers from three critical gaps compared to 2025 best practices:

1. **Index-based DOM diffing** - Modern frameworks use key-based reconciliation for stable element identity
2. **All-or-nothing hydration** - No support for progressive or selective hydration patterns
3. **Hydration mismatch blindness** - No detection or debugging tools for server/client divergence

This document prescribes specific approaches, patterns, and anti-patterns for stabilizing the rendering pipeline.

---

## Critical Architectural Fixes

### 1. Key-Based Reconciliation (HIGH PRIORITY)

**Current State:** Coherent.js uses index-based diffing in `hydration.js` lines 381-404:
```javascript
// Simple diffing algorithm - can be improved with key-based diffing
const maxLength = Math.max(oldChildren.length, newChildren.length, domChildren.length);
for (let i = 0; i < maxLength; i++) { ... }
```

**Problem:** Index-based diffing causes:
- Re-rendering entire lists when items are added/removed/reordered
- Lost component state when list order changes
- Incorrect event handler bindings after reorder
- Performance degradation on dynamic lists

**2025 Best Practice:** Key-based reconciliation is universal across React, Vue, Svelte, and Solid. Keys provide stable identity for elements across renders.

**Required Implementation:**

| Aspect | Recommendation | Rationale |
|--------|---------------|-----------|
| Key attribute | Add `key` support to object syntax | `{ li: { key: 'item-1', text: 'Item' } }` |
| Key storage | Store keys in WeakMap during render | Track element identity across re-renders |
| Diffing algorithm | LCS (Longest Common Subsequence) or similar | O(n) with good heuristics, O(n log n) worst case |
| Key requirements | Must be stable, unique among siblings | Random/index keys defeat the purpose |

**Confidence:** HIGH - This is fundamental to all modern frameworks and well-documented in React's reconciliation algorithm.

**Sources:**
- [React Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html)
- [DhiWise React Reconciliation Guide](https://www.dhiwise.com/post/a-deep-dive-into-react-reconciliation-algorithm)

---

### 2. Hydration Mismatch Detection (HIGH PRIORITY)

**Current State:** No mismatch detection. Server and client can diverge silently.

**Problem:** Hydration mismatches cause:
- Broken event handlers (listeners attached to wrong elements)
- UI flickering (client re-renders differ from server)
- Silent failures that are hard to debug
- State desynchronization

**2025 Best Practice:** All major frameworks now detect and report hydration mismatches in development mode.

**Required Implementation:**

| Component | Implementation | Notes |
|-----------|---------------|-------|
| Server snapshot | Hash or serialize server-rendered DOM structure | Store in `data-coherent-hash` attribute |
| Client verification | Compare client vDOM against server snapshot before hydration | Run in development mode only |
| Error reporting | Console warnings with specific mismatch location | Show path like `root.div.ul.children[2]` |
| Recovery mode | Graceful fallback when mismatch detected | Option to re-render client-side cleanly |

**Detection Algorithm:**
```
1. Server: Render component, compute structural hash
2. Server: Inject hash as data attribute on root element
3. Client: Before hydration, compute client vDOM hash
4. Client: Compare hashes - if mismatch, log detailed diff
5. Client: Attempt recovery or warn developer
```

**Confidence:** HIGH - React 18+, Vue 3.5+, and Nuxt all implement this pattern.

**Sources:**
- [Josh Comeau - Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/)
- [Vue SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html)
- [Fixing Hydration Errors - Sentry](https://sentry.io/answers/hydration-error-nextjs/)

---

### 3. Streaming SSR Architecture (MEDIUM PRIORITY)

**Current State:** Coherent.js has `renderToStream` in `html-renderer.js` but it's not integrated with hydration.

**2025 Best Practice:** Streaming SSR with selective hydration is the standard approach:
- React 18's `renderToPipeableStream` with Suspense boundaries
- Vue/Nuxt lazy hydration strategies
- Next.js 15 streaming with incremental hydration

**Recommended Approach:**

| Pattern | When to Use | Coherent.js Status |
|---------|------------|-------------------|
| renderToString | Simple pages, small components | Working |
| renderToStream | Large pages, slow data fetching | Partially implemented |
| Selective hydration | Interactive islands in static content | Not implemented |
| Progressive hydration | Priority-based component activation | Not implemented |

**Implementation Priority:**
1. First: Fix core rendering bugs and add key support
2. Second: Add hydration boundary markers
3. Third: Implement selective/progressive hydration

**Confidence:** MEDIUM - Streaming exists but integration needs design work.

**Sources:**
- [Patterns.dev Streaming SSR](https://www.patterns.dev/react/streaming-ssr/)
- [FreeCodeCamp Next.js 15 Streaming Handbook](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/)

---

## Recommended Patterns

### Component Object Syntax Enhancement

**Add key support to the object syntax:**

```javascript
// Current syntax (no keys)
{ ul: {
    children: items.map(item => ({ li: { text: item.name } }))
}}

// Enhanced syntax (with keys)
{ ul: {
    children: items.map(item => ({
        li: {
            key: item.id,  // Add key support
            text: item.name
        }
    }))
}}
```

**Rationale:** Keys must be first-class citizens in the object syntax for proper reconciliation.

### Hydration Boundary Pattern

**Mark hydration boundaries for selective hydration:**

```javascript
// Server-side: Mark interactive regions
{ div: {
    'data-coherent-hydrate': 'eager',  // Hydrate immediately
    children: [...]
}}

{ div: {
    'data-coherent-hydrate': 'visible',  // Hydrate when visible
    children: [...]
}}

{ div: {
    'data-coherent-hydrate': 'idle',  // Hydrate when idle
    children: [...]
}}
```

**Rationale:** Matches Vue/Nuxt lazy hydration strategies and React Suspense patterns.

### State Serialization Pattern

**Serialize component state for hydration:**

```javascript
// Current (fragmented state extraction)
const stateAttr = element.getAttribute('data-coherent-state');

// Better: Centralized state hydration script
<script id="__COHERENT_STATE__" type="application/json">
{
    "components": {
        "Counter_1": { "count": 5 },
        "TodoList_1": { "todos": [...], "filter": "all" }
    }
}
</script>
```

**Rationale:**
- Single source of truth for hydration state
- Easier debugging (inspect one script tag)
- Better compression (JSON can be minified)
- Prevents XSS (script type prevents execution)

---

## Anti-Patterns to Avoid

### 1. Index-as-Key Anti-Pattern

**DO NOT:**
```javascript
items.map((item, index) => ({ li: { key: index, ... } }))
```

**Problem:** Index changes when items are reordered, defeating the purpose of keys.

**DO:**
```javascript
items.map(item => ({ li: { key: item.id, ... } }))
```

### 2. Random Key Anti-Pattern

**DO NOT:**
```javascript
{ div: { key: Math.random(), ... } }
```

**Problem:** New key every render = new DOM element every render = terrible performance.

### 3. Deep Object Comparison Anti-Pattern

**DO NOT:**
```javascript
// In diffing
if (JSON.stringify(oldChild) !== JSON.stringify(newChild)) {
    replaceElement(...)
}
```

**Problem:**
- O(n) serialization on every comparison
- Doesn't preserve element identity
- Breaks component state

**DO:**
```javascript
// Compare by key first, then shallow props comparison
if (oldChild.key === newChild.key) {
    patchAttributes(...)
    patchChildren(...)
}
```

### 4. Window/Document Check Anti-Pattern

**Current code has many patterns like:**
```javascript
if (typeof window === 'undefined') {
    return options.initialState || null;
}
```

**Problem:** Scatters SSR/CSR logic throughout codebase.

**Better:** Centralize environment detection:
```javascript
// Single source of truth
const isServer = typeof window === 'undefined';
const isClient = !isServer;

// Use in one place to branch logic
export function createRenderer(options) {
    return isServer ? ServerRenderer : ClientRenderer;
}
```

### 5. Silent Failure Anti-Pattern

**DO NOT:**
```javascript
} catch (_error) {
    console.warn('Error extracting initial state:', _error);
    return options.initialState || null;  // Silent fallback
}
```

**DO:**
```javascript
} catch (error) {
    if (isDevelopment()) {
        throw new HydrationError(`Failed to extract state: ${error.message}`, {
            component: componentName,
            element: element.outerHTML.slice(0, 100)
        });
    }
    // Only silent in production
    return options.initialState || null;
}
```

---

## Testing Strategy Recommendations

### 1. Snapshot Testing for SSR Output

```javascript
// Test that server renders consistently
test('Counter renders correct HTML', () => {
    const component = Counter({ count: 5 });
    const html = render(component);
    expect(html).toMatchSnapshot();
});
```

**Confidence:** HIGH - Jest snapshot testing is well-established.

### 2. Hydration Mismatch Tests

```javascript
// Test that hydration succeeds without warnings
test('Counter hydrates without mismatch', () => {
    const serverHtml = renderToString(Counter({ count: 5 }));
    document.body.innerHTML = serverHtml;

    const warnings = [];
    console.warn = (msg) => warnings.push(msg);

    hydrate(document.querySelector('[data-coherent-component]'), Counter, { count: 5 });

    expect(warnings).toHaveLength(0);
});
```

### 3. Reconciliation Tests

```javascript
// Test that key-based reconciliation preserves state
test('reordering list preserves item state', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const instance = hydrate(el, TodoList, { items });

    // Reorder items
    instance.update({ items: [{ id: 3 }, { id: 1 }, { id: 2 }] });

    // Verify DOM nodes were moved, not recreated
    const nodeIds = Array.from(el.querySelectorAll('li')).map(li => li.dataset.nodeId);
    // Same nodes, different order
});
```

**Sources:**
- [Jest Snapshot Testing](https://jestjs.io/docs/snapshot-testing)
- [Salesforce LWR SSR Testing](https://developer.salesforce.com/docs/platform/lwr/guide/lwr-ssr-components-test.html)

---

## Modular Architecture Recommendations

### Current Problem

The codebase has large monolithic files:
- `component-system.js`: 2597 lines
- `hydration.js`: 1792 lines

### Recommended Structure

```
packages/core/src/
  rendering/
    html-renderer.js      # Server-side HTML rendering
    reconciler.js         # NEW: Key-based diff/patch algorithm
    scheduler.js          # NEW: Render scheduling/batching
  hydration/
    index.js              # Public API
    client-renderer.js    # NEW: Client-side DOM operations
    state-transfer.js     # NEW: Server->client state serialization
    mismatch-detector.js  # NEW: Hydration mismatch detection
  components/
    component-system.js   # Component definition (slimmed down)
    state-manager.js      # Extract from component-system.js
    lifecycle.js          # Already separate - good
```

### Benefits:
1. Easier testing (test reconciler separately from hydration)
2. Better tree-shaking (only import what's needed)
3. Clearer boundaries (rendering vs hydration vs state)
4. Easier debugging (smaller files to navigate)

**Confidence:** HIGH - This matches React's internal structure and modern framework patterns.

**Sources:**
- [Addy Osmani - Large-Scale JavaScript Architecture](https://addyosmani.com/largescalejavascript/)
- [GeeksforGeeks React Architecture 2025](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/)

---

## Framework Comparison: Where Coherent.js Stands

| Feature | React 18+ | Vue 3.5+ | Solid | Qwik | Coherent.js |
|---------|-----------|----------|-------|------|-------------|
| Key-based reconciliation | Yes | Yes | Yes | N/A (resumable) | No - CRITICAL GAP |
| Hydration mismatch detection | Yes | Yes | Yes | N/A | No - CRITICAL GAP |
| Progressive hydration | Yes (Suspense) | Yes (Nuxt) | Yes | Built-in | No |
| Streaming SSR | Yes | Yes | Yes | Yes | Partial |
| Development warnings | Yes | Yes | Yes | Yes | Limited |

---

## Implementation Roadmap Implications

Based on this research, the stabilization should proceed in this order:

### Phase 1: Foundation (Blocks Everything Else)
1. Add key support to object syntax
2. Implement key-based reconciliation algorithm
3. Add hydration mismatch detection (dev mode)

### Phase 2: Reliability
4. Comprehensive error handling with actionable messages
5. Add development warnings for common mistakes
6. Improve test coverage for edge cases

### Phase 3: Performance
7. Streaming SSR integration with hydration boundaries
8. Selective hydration support
9. Memoization improvements

**Rationale:** You cannot fix hydration bugs without key support. You cannot debug issues without mismatch detection. Performance optimizations are pointless on a broken foundation.

---

## Confidence Assessment

| Recommendation | Confidence | Evidence |
|----------------|------------|----------|
| Key-based reconciliation | HIGH | Universal across React/Vue/Svelte/Solid |
| Hydration mismatch detection | HIGH | React 18, Vue 3.5+, documented extensively |
| Modular architecture | HIGH | Standard practice, Addy Osmani patterns |
| Streaming SSR patterns | MEDIUM | Coherent.js has partial impl, needs integration design |
| Progressive hydration | MEDIUM | Well-documented but implementation varies by framework |

---

## Sources

### Primary Sources (HIGH Confidence)
- [React Reconciliation Algorithm](https://legacy.reactjs.org/docs/reconciliation.html)
- [Vue.js SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html)
- [Josh Comeau - The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/)
- [Patterns.dev - Streaming SSR](https://www.patterns.dev/react/streaming-ssr/)

### Secondary Sources (MEDIUM Confidence)
- [DEV.to - Hydration, Selective Hydration & Progressive Hydration Explained](https://dev.to/vishwark/hydration-selective-hydration-progressive-hydration-explained-react-vs-vuenuxt-vs-others-47fc)
- [Builder.io - Resumability vs Hydration](https://www.builder.io/blog/resumability-vs-hydration)
- [FreeCodeCamp - Next.js 15 Streaming Handbook](https://www.freecodecamp.org/news/the-nextjs-15-streaming-handbook/)
- [Qwik Resumable Documentation](https://qwik.dev/docs/concepts/resumable/)

### Framework Documentation
- [Sentry - Fixing Hydration Errors](https://sentry.io/answers/hydration-error-nextjs/)
- [Jest Snapshot Testing](https://jestjs.io/docs/snapshot-testing)
- [Addy Osmani - Large-Scale JavaScript Architecture](https://addyosmani.com/largescalejavascript/)
