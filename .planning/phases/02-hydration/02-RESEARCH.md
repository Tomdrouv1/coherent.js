# Phase 2: Hydration - Research

**Researched:** 2026-01-21
**Domain:** Client-side hydration with event delegation and state serialization
**Confidence:** HIGH

## Summary

Phase 2 focuses on making Coherent.js client-side hydration reliable, with specific emphasis on event delegation, state serialization, and mismatch detection. The existing codebase has a functional hydration system in `packages/client/src/hydration.js` (~1850 lines) but suffers from several issues: multiple conflicting event attachment strategies, hardcoded state patterns, and no mismatch detection.

Research confirms that the user decisions from CONTEXT.md align well with industry patterns:
- **Warning-only mismatch handling** matches React's development mode approach
- **Data attribute event delegation** (`data-coherent-click`) follows established patterns from HTMX and Alpine.js
- **Per-element state serialization** via `data-state` attributes is simpler than centralized `<script>` tags for the current architecture
- **Simple hydrate() API** returning control object follows modern patterns

**Primary recommendation:** Implement a proper event delegation system with document-level listeners per event type, refactor the current monolithic hydration to use modular components, and add development-mode mismatch detection that compares virtual DOM against actual DOM during hydration.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native DOM APIs | N/A | Event delegation, DOM traversal | No external dependencies, maximum performance |
| WeakMap/WeakSet | N/A | Component instance tracking without memory leaks | Built-in, prevents reference retention |
| MutationObserver | N/A | (Future) DOM monitoring for debugging | Native API, performant |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| base64-js | N/A | State encoding (not needed - use btoa/atob) | Decided to use base64 encoding for state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-element event attachment | Event delegation | Delegation survives DOM updates, per-element needs re-attachment |
| JSON in data attributes | Base64 encoded JSON | Base64 avoids special char escaping, slightly larger |
| Centralized `<script>` state | Per-element `data-state` | Per-element simpler, centralized better for large state |

**Installation:**
```bash
# No additional dependencies needed - using native APIs
```

## Architecture Patterns

### Recommended Project Structure

The hydration system should be refactored into focused modules:

```
packages/client/src/
  hydration/
    index.js                 # Public API exports
    hydrate.js               # Main hydrate() function
    mismatch-detector.js     # Server/client diff detection
    state-serializer.js      # State encode/decode utilities
  events/
    delegation.js            # Document-level event delegation
    registry.js              # Handler ID -> function mapping
    wrapper.js               # Event wrapper with context
```

### Pattern 1: Event Delegation with Data Attributes

**What:** Single document-level listener per event type that routes to handlers via `data-coherent-{event}` attributes
**When to use:** Always - prevents handler loss during DOM updates
**Example:**
```javascript
// Source: Established pattern from HTMX, Alpine.js, and prior Coherent.js DOMEventIntegration

class EventDelegation {
  constructor() {
    this.handlers = new Map(); // handlerId -> { handler, componentRef }
    this.initialized = false;
    this.eventTypes = ['click', 'change', 'input', 'submit', 'focus', 'blur'];
  }

  initialize(root = document) {
    if (this.initialized) return;

    // One listener per event type at root level
    this.eventTypes.forEach(eventType => {
      root.addEventListener(eventType, (e) => this.handleEvent(e, eventType), {
        capture: true, // Capture phase for focus/blur
        passive: eventType !== 'submit' // submit needs preventDefault
      });
    });

    this.initialized = true;
  }

  handleEvent(event, eventType) {
    // Find nearest element with data-coherent-{eventType} attribute
    const attrName = `data-coherent-${eventType}`;
    const target = event.target.closest(`[${attrName}]`);

    if (!target) return;

    const handlerId = target.getAttribute(attrName);
    const entry = this.handlers.get(handlerId);

    if (entry) {
      // Create wrapped event with component context
      const wrappedEvent = this.wrapEvent(event, target, entry.componentRef);
      entry.handler(wrappedEvent);
    }
  }

  wrapEvent(event, target, componentRef) {
    return {
      originalEvent: event,
      target,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
      // Component context
      component: componentRef?.component,
      state: componentRef?.state,
      setState: componentRef?.setState,
      props: componentRef?.props
    };
  }

  register(handlerId, handler, componentRef) {
    this.handlers.set(handlerId, { handler, componentRef });
  }

  unregister(handlerId) {
    this.handlers.delete(handlerId);
  }
}

export const eventDelegation = new EventDelegation();
```

### Pattern 2: Mismatch Detection (Development Mode)

**What:** Compare server-rendered DOM against client-side virtual DOM during hydration
**When to use:** Development mode only (configurable via options)
**Example:**
```javascript
// Source: React hydration mismatch detection pattern

function detectMismatch(domElement, virtualNode, path = []) {
  const mismatches = [];

  // Skip if not in development or detection disabled
  if (process.env.NODE_ENV === 'production') {
    return mismatches;
  }

  if (!virtualNode) {
    return mismatches;
  }

  // Handle text nodes
  if (typeof virtualNode === 'string' || typeof virtualNode === 'number') {
    const domText = domElement.nodeType === Node.TEXT_NODE
      ? domElement.textContent
      : domElement.textContent?.trim();
    const expected = String(virtualNode).trim();

    if (domText !== expected) {
      mismatches.push({
        path: formatPath(path),
        type: 'text',
        expected,
        actual: domText
      });
    }
    return mismatches;
  }

  // Handle element nodes
  const tagName = Object.keys(virtualNode)[0];
  const props = virtualNode[tagName] || {};

  // Check tag name
  if (domElement.tagName?.toLowerCase() !== tagName.toLowerCase()) {
    mismatches.push({
      path: formatPath(path),
      type: 'tagName',
      expected: tagName,
      actual: domElement.tagName?.toLowerCase()
    });
    return mismatches; // Can't continue if tag is different
  }

  // Check critical attributes (className, id, data-* attrs)
  const criticalAttrs = ['class', 'id', 'type', 'value', 'checked', 'disabled'];
  criticalAttrs.forEach(attr => {
    const virtualAttr = attr === 'class' ? props.className : props[attr];
    const domAttr = domElement.getAttribute(attr);

    if (virtualAttr !== undefined && String(virtualAttr) !== domAttr) {
      mismatches.push({
        path: formatPath([...path, `@${attr}`]),
        type: 'attribute',
        expected: String(virtualAttr),
        actual: domAttr
      });
    }
  });

  // Recursively check children
  const vChildren = getVNodeChildren(props);
  const dChildren = Array.from(domElement.childNodes).filter(n =>
    n.nodeType === Node.ELEMENT_NODE ||
    (n.nodeType === Node.TEXT_NODE && n.textContent.trim())
  );

  vChildren.forEach((vChild, i) => {
    if (dChildren[i]) {
      const childMismatches = detectMismatch(
        dChildren[i],
        vChild,
        [...path, `children[${i}]`]
      );
      mismatches.push(...childMismatches);
    }
  });

  return mismatches;
}

function formatPath(segments) {
  return segments.join('.');
}

function reportMismatches(mismatches) {
  if (mismatches.length === 0) return;

  console.warn(
    `[Coherent.js] Hydration mismatch detected!\n` +
    `Found ${mismatches.length} difference(s) between server and client:\n\n` +
    mismatches.map(m =>
      `  Path: ${m.path}\n` +
      `  Type: ${m.type}\n` +
      `  Expected: ${JSON.stringify(m.expected)}\n` +
      `  Actual: ${JSON.stringify(m.actual)}`
    ).join('\n\n')
  );
}
```

### Pattern 3: State Serialization with Base64

**What:** Encode component state in `data-state` attributes using base64
**When to use:** For hydration state transfer per CONTEXT.md decision
**Example:**
```javascript
// Source: Decision from CONTEXT.md - base64 encoding for state

function serializeState(state) {
  if (!state || typeof state !== 'object') return null;

  // Filter out non-serializable values (functions, symbols, etc.)
  const serializable = {};
  for (const [key, value] of Object.entries(state)) {
    if (typeof value !== 'function' && typeof value !== 'symbol') {
      serializable[key] = value;
    }
  }

  if (Object.keys(serializable).length === 0) return null;

  // Use base64 encoding as decided
  const json = JSON.stringify(serializable);
  return btoa(encodeURIComponent(json));
}

function deserializeState(encoded) {
  if (!encoded) return null;

  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.warn('[Coherent.js] Failed to deserialize state:', e);
    return null;
  }
}

// Usage in rendering (server-side)
function addStateAttribute(element, state) {
  const encoded = serializeState(state);
  if (encoded) {
    element['data-state'] = encoded;
  }
  return element;
}

// Usage in hydration (client-side)
function extractState(domElement) {
  const encoded = domElement.getAttribute('data-state');
  return deserializeState(encoded);
}
```

### Pattern 4: Hydrate API with Control Object

**What:** Simple hydrate() function returning lifecycle controls
**When to use:** Main entry point for hydration
**Example:**
```javascript
// Source: Decision from CONTEXT.md - returns control object

export function hydrate(component, container, options = {}) {
  // Validate inputs
  if (typeof component !== 'function') {
    console.error('[Coherent.js] hydrate(): component must be a function');
    return null;
  }

  if (!container || !(container instanceof Element)) {
    console.error('[Coherent.js] hydrate(): container must be a DOM element');
    return null;
  }

  const config = {
    strict: false,           // Throw on mismatch instead of warn
    onMismatch: null,        // Custom mismatch handler
    detectMismatch: process.env.NODE_ENV !== 'production',
    ...options
  };

  // Extract state from container
  const initialState = extractState(container) || options.initialState || null;

  // Generate virtual DOM from component
  const props = options.props || {};
  const virtualDOM = component({ ...props, ...(initialState || {}) });

  // Detect mismatches if enabled
  if (config.detectMismatch) {
    const mismatches = detectMismatch(container, virtualDOM);

    if (mismatches.length > 0) {
      if (config.onMismatch) {
        config.onMismatch(mismatches);
      } else {
        reportMismatches(mismatches);
      }

      if (config.strict) {
        throw new Error(`Hydration failed: ${mismatches.length} mismatch(es) found`);
      }
    }
  }

  // Create component instance
  const instance = createInstance(container, component, props, initialState);

  // Attach event handlers via delegation
  attachEventHandlers(container, virtualDOM, instance);

  // Return control object
  return {
    unmount() {
      cleanupInstance(instance);
      container.__coherentInstance = null;
    },

    rerender() {
      instance.rerender();
    },

    getState() {
      return instance.state;
    },

    setState(newState) {
      instance.setState(newState);
    }
  };
}
```

### Anti-Patterns to Avoid

- **Multiple event attachment strategies:** Current code has function handlers, data-action, data-coherent-event, onclick all mixed. Use ONLY event delegation via `data-coherent-{event}` attributes.

- **Per-element addEventListener calls:** These are lost when DOM is patched. Use document-level delegation instead.

- **Hardcoded state patterns:** Current extractInitialState() has hardcoded `data-count`, `data-step`, `data-todos`. Use generic `data-state` with serialization.

- **innerHTML replacement:** Current updateTodoList() uses innerHTML which destroys all listeners. Use DOM patching from Phase 1's key-based reconciliation.

- **Application logic in framework:** Current hydration.js has todo-specific functions (updateTodoList, reattachTodoEventHandlers). Remove all application-specific code.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event delegation | Custom bubble/capture handling | Document-level listener pattern | Proven, handles edge cases |
| State encoding | Custom serialization format | JSON + base64 (btoa/atob) | Built-in, handles unicode |
| DOM diffing | Position-based comparison | Phase 1's key-based reconciliation | Already implemented correctly |
| Memory management | Manual reference tracking | WeakMap for instances | Automatic garbage collection |

**Key insight:** The existing `DOMEventIntegration` class in `packages/core/src/events/dom-integration.js` already implements proper event delegation. The problem is that `hydration.js` doesn't use it consistently - it reimplements parts and mixes in other approaches.

## Common Pitfalls

### Pitfall 1: Event Handler Loss During Re-render

**What goes wrong:** Event handlers attached via addEventListener are destroyed when parent DOM is patched or innerHTML is used.
**Why it happens:** DOM manipulation doesn't preserve JavaScript references.
**How to avoid:** Use event delegation with document-level listener. Handlers are registered by ID, not by DOM reference.
**Warning signs:** Buttons stop working after state update, especially in lists.

### Pitfall 2: Non-deterministic Server/Client Output

**What goes wrong:** Server renders one thing, client renders another (different text, attributes, structure).
**Why it happens:** Date.now(), Math.random(), browser-only APIs, timezone differences, race conditions in data fetching.
**How to avoid:** Ensure component functions are pure during hydration. Pass all dynamic data as props/state, not computed at render time.
**Warning signs:** Flicker on page load, "flash of incorrect content", hydration warnings.

### Pitfall 3: State Leaks Between Components

**What goes wrong:** State from one component instance affects another.
**Why it happens:** Shared mutable state, module-level variables, forgetting to scope state to instance.
**How to avoid:** Use WeakMap keyed by element for instance storage. Each hydrate() creates isolated instance.
**Warning signs:** Counter increments affect wrong counter, form inputs cross-pollinate.

### Pitfall 4: Memory Leaks from Orphaned Handlers

**What goes wrong:** Registered handlers never get cleaned up when components unmount.
**Why it happens:** No cleanup mechanism, handlers stored in Map without corresponding removal.
**How to avoid:** unmount() must unregister all handlers. Use WeakMap where possible. Track handler IDs per instance.
**Warning signs:** Memory grows with navigation, performance degrades over time.

### Pitfall 5: Focus/Blur Events Don't Bubble

**What goes wrong:** Event delegation for focus/blur doesn't work with bubbling.
**Why it happens:** These events don't bubble by default, only capture.
**How to avoid:** Use capture phase (`{ capture: true }`) for focus/blur listeners.
**Warning signs:** Input focus handlers never fire, form validation doesn't trigger.

## Code Examples

Verified patterns from official sources and existing codebase:

### Generating Event Handler IDs (Server-side)

```javascript
// Used during SSR to assign handler IDs
let handlerIdCounter = 0;

function generateHandlerId(componentName, eventType, handlerName) {
  return `${componentName}_${eventType}_${handlerName}_${++handlerIdCounter}`;
}

// Usage in component
function Counter({ count, onIncrement }) {
  const incrementId = generateHandlerId('Counter', 'click', 'increment');

  // Register handler for client pickup
  registerServerHandler(incrementId, onIncrement);

  return {
    div: {
      'data-coherent-component': 'Counter',
      'data-state': serializeState({ count }),
      children: [
        { span: { text: `Count: ${count}` } },
        {
          button: {
            text: '+',
            'data-coherent-click': incrementId
          }
        }
      ]
    }
  };
}
```

### Hydration with Mismatch Detection

```javascript
// Client-side hydration entry point
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter';

const container = document.querySelector('[data-coherent-component="Counter"]');

const controls = hydrate(Counter, container, {
  strict: false,
  onMismatch: (mismatches) => {
    // Custom handling - e.g., send to error tracking
    console.warn('Mismatches found:', mismatches);
  }
});

// Later...
controls.rerender(); // Force re-render
controls.unmount();  // Cleanup
```

### Event Wrapper with Component Context

```javascript
// The wrapped event passed to handlers
interface CoherentEvent {
  originalEvent: Event;
  target: Element;
  preventDefault(): void;
  stopPropagation(): void;
  // Component context
  component: Function;
  state: object;
  setState(newState: object | (prev) => object): void;
  props: object;
}

// Handler signature
function handleIncrement(event: CoherentEvent) {
  event.setState(prev => ({ count: prev.count + 1 }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-element addEventListener | Event delegation | 2020+ (HTMX, Alpine) | Handlers survive DOM updates |
| JSON in attributes | Base64 encoded JSON | Common practice | Avoids escaping issues |
| Full page re-render on mismatch | Warning + keep server HTML | React 18+ | Better UX, easier debugging |
| Inline onclick handlers | CSP-compliant data attributes | 2018+ (CSP adoption) | Security compliance |

**Deprecated/outdated:**
- Inline event handlers (onclick="..."): CSP security risk, not recommended
- Position-based diffing: Replaced by key-based in Phase 1
- Global window.eventRegistry: Use encapsulated EventDelegation class

## Open Questions

Things that couldn't be fully resolved:

1. **Non-bubbling events beyond focus/blur**
   - What we know: mouseenter, mouseleave, scroll don't bubble
   - What's unclear: Which of these need delegation support?
   - Recommendation: Handle focus/blur with capture. Add mouseenter/leave if user reports need. Skip scroll (too noisy).

2. **Handler serialization for SSR**
   - What we know: Functions can't be serialized. Server must generate IDs.
   - What's unclear: How to transfer handler function bodies from server to client.
   - Recommendation: Handlers defined in client-side component code. Server only generates IDs. Client registers handlers during hydration.

3. **State size limits**
   - What we know: Data attributes have no official size limit but browsers may truncate very large values.
   - What's unclear: Practical limit for base64-encoded state.
   - Recommendation: Warn if serialized state > 10KB. Consider centralized `<script>` for larger state.

## Sources

### Primary (HIGH confidence)

- Coherent.js existing codebase:
  - `packages/client/src/hydration.js` - Current implementation (1858 lines)
  - `packages/core/src/events/dom-integration.js` - Existing delegation pattern (536 lines)
  - `examples/hydration-demo.js` - Usage examples

- Phase 1 artifacts:
  - `.planning/phases/01-foundation/01-VERIFICATION.md` - Key-based reconciliation verified
  - `.planning/research/ARCHITECTURE.md` - Modular architecture recommendations

### Secondary (MEDIUM confidence)

- Research documentation:
  - `.planning/research/SUMMARY.md` - Phase 2 requirements
  - `.planning/research/PITFALLS.md` - Hydration pitfalls identified

- Framework patterns (from prior research):
  - React reconciliation patterns
  - HTMX event delegation approach
  - Alpine.js data attribute patterns

### Tertiary (LOW confidence)

- Generic web development patterns for:
  - Base64 encoding/decoding
  - WeakMap/WeakSet usage for garbage collection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using native APIs, no external dependencies
- Architecture: HIGH - Patterns verified against existing Coherent.js code and prior research
- Pitfalls: HIGH - Confirmed by analyzing current hydration.js issues

**Research date:** 2026-01-21
**Valid until:** 60 days - Stable patterns, unlikely to change
