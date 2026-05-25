# Phase 1: Foundation - Research

**Researched:** 2026-01-21
**Domain:** Core rendering, error handling, and key-based reconciliation
**Confidence:** HIGH

## Summary

This phase addresses fundamental rendering engine stability and the foundation for proper DOM reconciliation. The current codebase has good structure but lacks three critical capabilities:

1. **Input Edge Case Handling**: The renderer handles null/undefined at the element level but lacks graceful degradation for malformed input at higher levels
2. **HTML Nesting Validation**: No validation exists to prevent invalid HTML structures that browsers will silently "correct" (causing hydration mismatches)
3. **Key-Based Identity**: The component system has no concept of `key` properties for stable element identity during reconciliation

**Primary recommendation:** Add defensive input handling throughout the render pipeline, implement HTML nesting validation, create error boundaries with actionable messages, and add `key` support to the object syntax.

## Standard Stack

The core rendering already uses appropriate patterns. No new libraries required.

### Core (Already In Use)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Vitest | Current | Test framework | Working |
| Performance API | Native | Timing and metrics | Working |

### Supporting (No Changes Needed)
The existing architecture in `html-renderer.js`, `base-renderer.js`, and `error-handler.js` provides the foundation. Changes are internal refactoring, not new dependencies.

## Architecture Patterns

### Current Project Structure (Relevant Files)
```
packages/core/src/
  rendering/
    html-renderer.js      # Main render function - needs input validation
    base-renderer.js      # Base class - has depth validation (good)
  components/
    component-system.js   # State and composition - needs key support
    error-boundary.js     # Error boundaries - needs enhancement
  core/
    html-utils.js         # HTML escaping - needs nesting validation
    object-utils.js       # Validation - needs null handling improvements
  utils/
    error-handler.js      # Error system - needs file/line enrichment
packages/client/src/
  hydration.js            # Client reconciliation - needs key support
```

### Pattern 1: Defensive Input Processing

**What:** Handle all edge cases at the top of `renderComponent()` before type dispatch
**When to use:** Every render entry point
**Current code (html-renderer.js line 148-178):**
```javascript
renderComponent(component, options, depth = 0, path = []) {
    this.validateDepth(depth);
    try {
        const { type, value } = this.processComponentType(component);
        switch (type) {
            case 'empty':
                return '';
            // ...
        }
    }
}
```

**Issue:** `processComponentType` in base-renderer.js handles primitives well but `validateComponent` in object-utils.js throws on null/undefined instead of returning gracefully.

**Required Change:**
```javascript
// In renderComponent - add at top
if (component === null || component === undefined) {
    return '';
}
if (Array.isArray(component) && component.length === 0) {
    return '';
}
```

### Pattern 2: HTML Nesting Validation

**What:** Validate parent-child relationships based on HTML spec
**When to use:** During render when creating child elements

**Invalid nesting patterns that browsers auto-correct:**
| Parent | Invalid Child | Browser Behavior |
|--------|--------------|------------------|
| `<p>` | `<div>`, `<p>`, `<ul>`, `<ol>`, `<table>` | Closes `<p>` early |
| `<a>` | `<a>` | Flattens nested links |
| `<button>` | `<button>`, `<a>` | Unpredictable |
| `<table>` | Direct text | Wraps in `<tbody>` |
| `<thead>`, `<tbody>`, `<tfoot>` | Non-`<tr>` | Invalid |
| `<tr>` | Non-`<td>`, `<th>` | Invalid |

**Required Implementation:**
```javascript
// New file: packages/core/src/core/html-nesting-rules.js
const FORBIDDEN_CHILDREN = {
  p: new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl',
              'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section',
              'table', 'ul']),
  a: new Set(['a']),
  button: new Set(['button', 'a', 'input', 'select', 'textarea']),
  label: new Set(['label']),
  // Table structure
  thead: new Set(['thead', 'tbody', 'tfoot', 'caption', 'colgroup']),
  tbody: new Set(['thead', 'tbody', 'tfoot', 'caption', 'colgroup']),
  tfoot: new Set(['thead', 'tbody', 'tfoot', 'caption', 'colgroup']),
  tr: new Set(['tr', 'thead', 'tbody', 'tfoot']),
  td: new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot']),
  th: new Set(['td', 'th', 'tr', 'thead', 'tbody', 'tfoot']),
};

export function validateNesting(parentTag, childTag, path, options = {}) {
  const forbidden = FORBIDDEN_CHILDREN[parentTag];
  if (forbidden && forbidden.has(childTag)) {
    const message = `Invalid HTML nesting: <${childTag}> cannot be a child of <${parentTag}> at ${path}`;
    if (options.throwOnInvalid) {
      throw new HTMLNestingError(message);
    }
    if (options.warn !== false) {
      console.warn(`[Coherent.js] ${message}`);
    }
    return false;
  }
  return true;
}
```

### Pattern 3: Error Boundary Integration with Actionable Messages

**What:** Catch component render errors and display helpful information
**Current status:** `error-boundary.js` exists but doesn't integrate with the renderer

**Current error-boundary.js (line 122-168):**
```javascript
} catch (error) {
    const errorInfo = {
        componentStack: error.stack,
        props,
        timestamp: Date.now()
    };
    state.setError(error, errorInfo);
    // ...returns fallback
}
```

**Enhancement needed:** Enrich errors with file/line information where possible, and integrate boundaries into the render pipeline.

**Required additions to error-handler.js:**
```javascript
export class RenderingError extends CoherentError {
    constructor(message, component, context, suggestions = []) {
        super(message, {
            type: 'rendering',
            component,
            context,
            suggestions: [
                'Check for circular references',
                'Validate component depth',
                'Ensure all functions return valid components',
                ...suggestions
            ]
        });
        this.name = 'RenderingError';

        // Add path information for actionable debugging
        if (context && context.path) {
            this.renderPath = context.path;
        }
    }
}
```

### Pattern 4: Key Property Support

**What:** Add `key` property to component syntax for stable identity
**Where:** Object syntax processing in `html-renderer.js` and reconciliation in `hydration.js`

**Current object syntax:**
```javascript
{ div: { className: 'item', text: 'Hello' } }
```

**Enhanced syntax with key:**
```javascript
{ div: { key: 'item-1', className: 'item', text: 'Hello' } }
```

**Required changes:**

1. **html-renderer.js** - Extract and track keys during render:
```javascript
renderObjectElement(tagName, element, options, depth, path) {
    const { children, text, key, ...attributes } = element || {};
    // key is extracted but not rendered as HTML attribute
    // Store key in render context for later reconciliation
    if (key !== undefined) {
        options.keyMap = options.keyMap || new Map();
        options.keyMap.set(path.join('.'), key);
    }
    // ... rest of rendering
}
```

2. **hydration.js patchChildren (line 331-405)** - Use keys for matching:
```javascript
patchChildren(domElement, oldVNode, newVNode) {
    // Build key maps for old and new children
    const oldKeyMap = new Map();
    const newKeyMap = new Map();

    oldChildren.forEach((child, i) => {
        const key = getKey(child) || i;
        oldKeyMap.set(key, { child, index: i, node: domChildren[i] });
    });

    newChildren.forEach((child, i) => {
        const key = getKey(child) || i;
        newKeyMap.set(key, { child, index: i });
    });

    // Match by key, not index
    for (const [key, { child: newChild, index: newIndex }] of newKeyMap) {
        const old = oldKeyMap.get(key);
        if (old) {
            // Reuse existing element, just patch
            this.patchDOM(old.node, old.child, newChild);
            // Move if position changed
            if (old.index !== newIndex) {
                domElement.insertBefore(old.node, domChildren[newIndex]);
            }
        } else {
            // Create new element
            const newElement = this.createDOMElement(newChild);
            domElement.insertBefore(newElement, domChildren[newIndex]);
        }
    }

    // Remove elements with keys not in new list
    for (const [key, { node }] of oldKeyMap) {
        if (!newKeyMap.has(key)) {
            node.remove();
        }
    }
}
```

3. **Development mode warning for missing keys:**
```javascript
// In renderComponent when processing arrays
if (Array.isArray(component) && component.length > 1) {
    if (process.env.NODE_ENV !== 'production') {
        component.forEach((child, i) => {
            if (child && typeof child === 'object' && !getKey(child)) {
                console.warn(
                    `[Coherent.js] List item at ${path}[${i}] is missing a "key" prop. ` +
                    `Keys help identify which items have changed for efficient updates.`
                );
            }
        });
    }
}
```

### Anti-Patterns to Avoid

- **Index as key**: Using array index as key defeats the purpose
- **Random keys**: `key: Math.random()` recreates elements every render
- **Deep object comparison for diffing**: Use structural keys, not JSON serialization
- **Throwing on null input**: Return empty string instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | Custom regex | `escapeHtml()` in html-utils.js | XSS edge cases |
| Void element detection | Hardcoded list | `isVoidElement()` in html-utils.js | Spec compliance |
| Deep cloning | JSON parse/stringify | `deepClone()` in object-utils.js | Functions, circular refs |
| Error classification | String matching | `ErrorHandler.classifyError()` | Consistent patterns |

**Key insight:** The codebase already has good utilities. The work is integration and enhancement, not replacement.

## Common Pitfalls

### Pitfall 1: Silent Null Failures

**What goes wrong:** Renderer crashes or produces incorrect output on null/undefined
**Why it happens:** `validateComponent` throws, doesn't handle gracefully
**How to avoid:** Add defensive checks at every render entry point
**Warning signs:** "Cannot read property 'X' of undefined" errors

**Location:** `packages/core/src/core/object-utils.js` line 261-264
```javascript
// Current: throws
if (component === null || component === undefined) {
    throw new Error(`Invalid component at ${path}: null or undefined`);
}
// Should: return gracefully in render context
```

### Pitfall 2: Hydration Mismatch from HTML Auto-Correction

**What goes wrong:** Browser "fixes" invalid nesting, server HTML doesn't match client DOM
**Why it happens:** No validation of HTML structure rules
**How to avoid:** Add nesting validation in development mode
**Warning signs:** Hydration warnings, buttons not working after page load

### Pitfall 3: State Jump on List Reorder

**What goes wrong:** Input values, checkboxes, etc. appear on wrong items after list changes
**Why it happens:** Index-based diffing in `hydration.js` line 384
**How to avoid:** Key-based reconciliation
**Warning signs:** Form inputs changing which item they control

### Pitfall 4: Cryptic Render Errors

**What goes wrong:** Error shows stack trace far from actual problem
**Why it happens:** Errors don't include render path context
**How to avoid:** Enrich errors with `path` array showing component tree
**Warning signs:** Debugging requires extensive console.log

### Pitfall 5: Stack Overflow on Deep/Circular Structures

**What goes wrong:** Recursive render exceeds call stack
**Why it happens:** Missing or insufficient depth limits
**How to avoid:** `validateDepth()` is called but circular structures can still loop
**Warning signs:** "Maximum call stack size exceeded"

**Current protection (base-renderer.js line 173-176):**
```javascript
validateDepth(depth) {
    if (depth > this.config.maxDepth) {
        throw new Error(`Maximum render depth (${this.config.maxDepth}) exceeded`);
    }
}
```
This is good for linear depth. Circular structures need `WeakSet` tracking.

## Code Examples

### Example 1: Robust Input Validation

```javascript
// Source: Required addition to html-renderer.js renderComponent
renderComponent(component, options, depth = 0, path = []) {
    // Depth check (already exists)
    this.validateDepth(depth);

    // NEW: Handle edge cases before type processing
    if (component === null || component === undefined) {
        return '';
    }

    // NEW: Handle empty arrays
    if (Array.isArray(component) && component.length === 0) {
        return '';
    }

    // NEW: Detect and report circular references (development only)
    if (options.seenObjects && typeof component === 'object' && component !== null) {
        if (options.seenObjects.has(component)) {
            throw new RenderingError(
                'Circular reference detected in component tree',
                component,
                { path: formatRenderPath(path) }
            );
        }
        options.seenObjects.add(component);
    }

    // Existing type processing continues...
    try {
        const { type, value } = this.processComponentType(component);
        // ...
    }
}
```

### Example 2: HTML Nesting Validation

```javascript
// Source: New file packages/core/src/core/html-nesting-rules.js
export const FORBIDDEN_CHILDREN = {
  p: new Set(['address', 'article', 'aside', 'blockquote', 'div', 'dl',
              'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section',
              'table', 'ul']),
  a: new Set(['a']),
  button: new Set(['button', 'a', 'input', 'select', 'textarea']),
};

export function validateNesting(parentTag, childTag, path, options = {}) {
  const parent = parentTag?.toLowerCase();
  const child = childTag?.toLowerCase();

  const forbidden = FORBIDDEN_CHILDREN[parent];
  if (forbidden && forbidden.has(child)) {
    const message = `Invalid HTML nesting: <${child}> cannot be child of <${parent}>`;
    if (options.throwOnError) {
      throw new HTMLNestingError(message, { path, parent: parentTag, child: childTag });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Coherent.js] ${message} at ${path}`);
    }
    return false;
  }
  return true;
}
```

### Example 3: Key Extraction Helper

```javascript
// Source: New utility for hydration.js
function getKey(vNode) {
    if (!vNode || typeof vNode !== 'object') {
        return undefined;
    }

    // Handle Coherent object syntax: { tagName: { key: 'x', ... } }
    const tagName = Object.keys(vNode)[0];
    const props = vNode[tagName];

    if (props && typeof props === 'object') {
        return props.key;
    }

    return undefined;
}
```

### Example 4: Development Mode Key Warning

```javascript
// Source: Addition to html-renderer.js when rendering arrays
// In renderComponent case 'array':
if (process.env.NODE_ENV !== 'production') {
    const hasKeys = value.every((child, i) => {
        if (child && typeof child === 'object') {
            const tag = Object.keys(child)[0];
            const props = child[tag];
            return props && typeof props === 'object' && props.key !== undefined;
        }
        return true; // primitives don't need keys
    });

    if (!hasKeys && value.length > 1) {
        console.warn(
            `[Coherent.js] Array of ${value.length} items at ${formatRenderPath(path)} ` +
            `is missing "key" props. Add unique keys for efficient updates.`
        );
    }
}
return value.map((child, index) =>
    this.renderComponent(child, options, depth + 1, [...path, `[${index}]`])
).join('');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Index-based diffing | Key-based reconciliation | React 2014+ | Standard in all modern frameworks |
| Silent failures | Actionable error messages | React 16+ error boundaries | Better DX |
| Full re-render | Targeted DOM patches | Virtual DOM era | Performance |
| Inline event handlers | Event delegation | CSP adoption | Security |

**Deprecated/outdated:**
- Using array index as key (never correct for dynamic lists)
- Throwing on null input (should render nothing)
- Deep JSON comparison for change detection (too slow)

## Open Questions

1. **Key uniqueness scope**
   - What we know: Keys must be unique among siblings
   - What's unclear: Should we warn on duplicate keys or silently use first?
   - Recommendation: Warn in development mode, use first occurrence

2. **Error boundary scope**
   - What we know: Current boundaries wrap component functions
   - What's unclear: Should boundaries also catch async errors?
   - Recommendation: Sync errors for Phase 1, async errors in Phase 2

3. **Nesting validation strictness**
   - What we know: Some nesting is spec-invalid but browsers handle it
   - What's unclear: How strict should validation be?
   - Recommendation: Warn only, don't block rendering (dev mode)

## Sources

### Primary (HIGH confidence)
- Coherent.js source code analysis (this repository)
- [HTML Living Standard - Content Models](https://html.spec.whatwg.org/multipage/dom.html#content-models) - Nesting rules
- [React Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html) - Key algorithm

### Secondary (MEDIUM confidence)
- .planning/research/PITFALLS.md - Codebase-specific issues
- .planning/research/STACK.md - Architecture recommendations

### Code Locations Analyzed
- `packages/core/src/rendering/html-renderer.js` - Main render logic
- `packages/core/src/rendering/base-renderer.js` - Base class with depth validation
- `packages/core/src/components/component-system.js` - State and composition (2596 lines)
- `packages/core/src/components/error-boundary.js` - Error boundary implementation
- `packages/core/src/core/object-utils.js` - Validation utilities
- `packages/core/src/core/html-utils.js` - HTML escaping and void elements
- `packages/core/src/utils/error-handler.js` - Error classification and reporting
- `packages/client/src/hydration.js` - Client-side reconciliation (line 384-404 for patching)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, existing code is solid
- Architecture patterns: HIGH - Based on direct codebase analysis
- Pitfalls: HIGH - Verified by examining actual code paths
- Key implementation: MEDIUM - Algorithm is well-known but integration needs testing

**Research date:** 2026-01-21
**Valid until:** 60 days (stable domain, changes are internal refactoring)
