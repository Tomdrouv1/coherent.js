# Domain Pitfalls: SSR Framework Development

**Domain:** Server-side rendering framework with hydration, CLI tooling, and HMR
**Researched:** 2026-01-21
**Confidence:** HIGH (based on official documentation, framework source analysis, and verified community patterns)

## Critical Pitfalls

Mistakes that cause rewrites, major bugs, or framework-breaking issues.

---

### Pitfall 1: Hydration Mismatch from Non-Deterministic Rendering

**What goes wrong:** Server renders HTML with one output, but client-side hydration produces different HTML. React/frameworks detect mismatch and either tear down the entire DOM tree or silently attach event handlers to wrong elements.

**Why it happens:**
- `Date.now()`, `Math.random()`, or UUIDs generated during render
- Browser-only APIs (`window`, `document`, `localStorage`) used in render path
- Time zone differences between server and client
- Browser auto-correcting invalid HTML (e.g., nested `<p>` tags)

**Consequences:**
- Event handlers attached to wrong elements (buttons don't work)
- Flickering UI as client rebuilds DOM
- Performance loss (defeats purpose of SSR)
- Intermittent bugs that are hard to reproduce

**Warning signs:**
- Console warnings: "Hydration failed because the initial UI does not match"
- Buttons/forms that sometimes work and sometimes don't
- Layout jumps after page load

**Prevention:**
```javascript
// BAD: Non-deterministic in render
function BadComponent() {
  return { div: { text: `Time: ${Date.now()}` } }; // Different on server/client
}

// GOOD: Deterministic initial render, update in effect
function GoodComponent(props) {
  // Initial render must be identical server/client
  const time = props.serverTime || 'Loading...';
  return { div: { 'data-time': time, text: time } };
}
// Then update with useEffect/client-only code
```

**Phase to address:** Phase 1 (Core Rendering) - Enforce deterministic rendering patterns in renderer

**Sources:**
- [Next.js Hydration Error Documentation](https://nextjs.org/docs/messages/react-hydration-error)
- [Josh Comeau: The Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/)

---

### Pitfall 2: Index-Based DOM Diffing Without Keys

**What goes wrong:** When list items change (add/remove/reorder), diffing algorithm matches by position instead of identity. Causes:
- State from item A moves to item B
- Unnecessary re-renders of unchanged items
- Animation/transition bugs
- Form input values jumping to wrong items

**Why it happens:** Coherent.js hydration.js uses index-based child matching:
```javascript
// Current code in patchChildren - line 384
for (let i = 0; i < maxLength; i++) {
  const oldChild = oldChildren[i];
  const newChild = newChildren[i];
  const domChild = domChildren[i];
  // ... patches by index, not by key
}
```

**Consequences:**
- Todo items get wrong checked state after reorder
- Animations trigger on wrong elements
- Performance degradation with large lists
- User input lost during list updates

**Warning signs:**
- State "jumping" between list items
- Checkboxes changing items they control
- All list items re-rendering when one changes

**Prevention:**
```javascript
// BAD: No key support
children.map((child, index) => renderChild(child, index));

// GOOD: Key-based reconciliation
children.map(child => {
  const key = child.key || child.id || generateStableKey(child);
  return { ...renderChild(child), key };
});

// In diffing algorithm - match by key first
function patchChildren(domElement, oldChildren, newChildren) {
  const oldKeyMap = new Map();
  oldChildren.forEach((child, i) => {
    const key = child.key || i;
    oldKeyMap.set(key, { child, index: i });
  });

  newChildren.forEach((newChild, newIndex) => {
    const key = newChild.key || newIndex;
    const old = oldKeyMap.get(key);
    // Match by key, not position
  });
}
```

**Phase to address:** Phase 2 (Hydration Improvements) - Implement key-based reconciliation

**Sources:**
- [React Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html)
- [React Diffing Algorithm](https://www.geeksforgeeks.org/reactjs/what-is-diffing-algorithm/)

---

### Pitfall 3: Event Handler Loss During Re-render

**What goes wrong:** After DOM updates, event handlers are not properly re-attached. Buttons become unclickable, forms stop submitting.

**Why it happens in Coherent.js:**
1. `updateTodoList()` uses `innerHTML` replacement (line 847-867), destroying all event listeners
2. Function-based handlers stored only in virtual DOM, not persisted
3. Re-render path doesn't consistently re-attach handlers
4. Handler attachment happens on index-based traversal (misaligns after list changes)

**Consequences:**
- Interactivity completely breaks after state change
- Users must refresh to restore functionality
- Impossible to build reliable interactive apps

**Warning signs:**
- Click handlers stop working after first interaction
- Console shows "Event handler not found for ID"
- Working features break after adding/removing items

**Prevention:**
```javascript
// BAD: Replace innerHTML (destroys listeners)
todoList.innerHTML = '';
filteredTodos.forEach(todo => {
  const li = document.createElement('li');
  li.innerHTML = `<button>Delete</button>`; // No listener attached!
  todoList.appendChild(li);
});

// GOOD: Preserve DOM, update in place OR use event delegation
// Option 1: Event delegation (listeners on parent, never lost)
todoList.addEventListener('click', (e) => {
  if (e.target.matches('[data-action="delete"]')) {
    const id = e.target.dataset.todoId;
    deleteTodo(id);
  }
});

// Option 2: Track and re-attach handlers after DOM update
function rerender() {
  const newVdom = component(props);
  patchDOM(container, oldVdom, newVdom);
  reattachHandlers(container, newVdom); // Must happen after patch
}
```

**Phase to address:** Phase 2 (Hydration Improvements) - Event delegation system

---

### Pitfall 4: HMR State Loss and Handler Disconnection

**What goes wrong:** Hot Module Replacement updates code but:
- Component state resets to initial values
- Event handlers remain bound to old function references
- Module side effects duplicate (multiple autoruns, listeners)

**Why it happens in Coherent.js:**
1. HMR client (hmr.js line 76-102) re-imports module but doesn't preserve state
2. No dispose handlers to clean up old module effects
3. `autoHydrate()` may attach duplicate handlers
4. `hadDisconnect` triggers full reload but loses state anyway

**Consequences:**
- Developers lose work-in-progress form state
- Console fills with duplicate log messages
- Memory leaks from accumulated listeners
- HMR becomes unusable, developers disable it

**Warning signs:**
- Form inputs clear on every save
- Console messages multiply on each change
- Memory usage grows continuously during development
- "autoHydrate failed; falling back to full reload" message

**Prevention:**
```javascript
// BAD: No state preservation
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // State is lost, old listeners not cleaned up
    rerender();
  });
}

// GOOD: State preservation and cleanup
if (import.meta.hot) {
  // Preserve state across updates
  import.meta.hot.accept((newModule) => {
    const oldState = getComponentState();
    newModule.initWithState(oldState);
  });

  // Clean up old module effects
  import.meta.hot.dispose((data) => {
    data.savedState = getComponentState();
    cleanup(); // Remove listeners, stop timers, etc.
  });
}
```

**Phase to address:** Phase 4 (Developer Experience) - Proper HMR implementation with state preservation

**Sources:**
- [Webpack HMR Guide](https://webpack.js.org/guides/hot-module-replacement/)
- [Vite HMR API](https://vite.dev/guide/api-hmr)
- [SurviveJS HMR Appendix](https://survivejs.com/books/webpack/appendices/hmr/)

---

### Pitfall 5: Rendering Crashes on Edge Case Input

**What goes wrong:** Renderer crashes when encountering:
- `null` or `undefined` in unexpected places
- Deeply nested or circular structures
- Empty arrays or objects
- Function components that throw

**Why it happens:**
1. Object-based component syntax allows many forms
2. No input validation before render
3. Error boundaries not implemented or not catching all cases
4. Recursive renderer without depth limits can stack overflow

**Consequences:**
- Entire page fails to render
- Server crashes (affects all users)
- Silent failures leave blank sections
- Hard to debug (error far from cause)

**Warning signs:**
- "Cannot read property 'X' of undefined" in renderer
- Empty pages with no console errors
- Server process crashes under load

**Prevention:**
```javascript
// BAD: No defensive checks
function renderComponent(component) {
  const tagName = Object.keys(component)[0];
  const props = component[tagName]; // Crashes if component is null
  return renderElement(tagName, props);
}

// GOOD: Defensive with clear errors
function renderComponent(component, depth = 0, path = []) {
  // Depth limit
  if (depth > 100) {
    throw new RenderError(`Max depth exceeded at ${path.join('.')}`);
  }

  // Null/undefined handling
  if (component == null) {
    return '';
  }

  // Type validation
  if (typeof component === 'string' || typeof component === 'number') {
    return escapeHtml(String(component));
  }

  if (typeof component !== 'object') {
    throw new RenderError(`Invalid component type: ${typeof component} at ${path.join('.')}`);
  }

  // ... continue with rendering
}
```

**Phase to address:** Phase 1 (Core Rendering) - Robust input validation and error boundaries

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or developer frustration.

---

### Pitfall 6: CLI Template Drift

**What goes wrong:** CLI-generated project files become outdated as framework evolves:
- Generated code uses deprecated patterns
- Package versions in template don't match framework
- Generated components don't demonstrate current best practices
- Scaffolded projects fail to build due to breaking changes

**Why it happens:**
- Templates stored as string literals in CLI code
- No automated testing of generated projects
- Version sync between CLI and framework packages is manual
- No migration path for existing generated projects

**Warning signs:**
- New users report "fresh project doesn't work"
- Generated code doesn't match documentation examples
- CLI version and framework version mismatch in package.json

**Prevention:**
```javascript
// BAD: Hardcoded version strings
const packageJson = {
  dependencies: {
    '@coherent.js/core': '^1.0.0' // Hardcoded, will drift
  }
};

// GOOD: Dynamic version from CLI's own dependencies
import { getCLIVersion } from '../utils/version.js';
const cliVersion = getCLIVersion();
const packageJson = {
  dependencies: {
    '@coherent.js/core': `^${cliVersion}` // Stays in sync
  }
};

// BETTER: Template testing in CI
// In test suite:
test('generated project builds', async () => {
  const tempDir = await generateProject('test-project');
  const { exitCode } = await exec('npm install && npm run build', { cwd: tempDir });
  expect(exitCode).toBe(0);
});
```

**Phase to address:** Phase 4 (Developer Experience) - Template testing and version syncing

---

### Pitfall 7: Missing SSR/Client Context Guards

**What goes wrong:** Code that should only run on client (or server) runs in wrong environment:
- `window.localStorage.getItem()` crashes server
- Server-only secrets leak to client bundle
- Database connections attempted from browser

**Why it happens:**
- No clear pattern for environment-specific code
- Tree-shaking doesn't understand runtime checks
- Components render on both server and client by default

**Warning signs:**
- "ReferenceError: window is not defined" in server logs
- "localStorage is not defined" during SSR
- Secrets visible in browser network tab

**Prevention:**
```javascript
// BAD: Implicit environment assumption
function getStoredTheme() {
  return localStorage.getItem('theme'); // Crashes on server
}

// GOOD: Explicit guards with clear patterns
import { isServer, isClient } from '@coherent.js/core';

function getStoredTheme() {
  if (isServer()) {
    return null; // Server doesn't have localStorage
  }
  return localStorage.getItem('theme');
}

// Or mark code as client-only
export const getStoredTheme = markClientOnly(() => {
  return localStorage.getItem('theme');
});
```

**Phase to address:** Phase 1 (Core Rendering) - Environment detection utilities

---

### Pitfall 8: Streaming Render Incomplete Error Handling

**What goes wrong:** Streaming SSR starts sending HTML before all data is ready:
- Error in data fetch after headers sent (can't redirect)
- Partial HTML in browser (broken page)
- Error boundaries can't catch after stream started

**Why it happens:**
- Streaming optimizes TTFB but reduces error recovery options
- Once `res.write()` called, can't change status code
- Data loading failures discovered mid-stream

**Warning signs:**
- Users see half-rendered pages
- Error redirects show as HTML content instead of redirect
- Inconsistent error states between refresh

**Prevention:**
```javascript
// BAD: Start streaming immediately
async function* renderToStream(component) {
  yield '<!DOCTYPE html><html>';
  yield '<head>...</head><body>';

  const data = await fetchData(); // Error here = broken page
  yield renderWithData(data);

  yield '</body></html>';
}

// GOOD: Buffer critical path, then stream
async function renderWithFallback(component, res) {
  try {
    // Fetch critical data BEFORE streaming
    const criticalData = await fetchCriticalData();

    // Now safe to start streaming
    res.setHeader('Content-Type', 'text/html');

    for await (const chunk of renderToStream(component, criticalData)) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    // Can still redirect since nothing sent yet
    res.redirect('/error');
  }
}
```

**Phase to address:** Phase 3 (Streaming/Performance) - Error boundary patterns for streaming

---

### Pitfall 9: Component State Container Leaks

**What goes wrong:** `withState` creates state containers that persist beyond component lifecycle:
- Memory grows with each component mount
- Old state appears in new component instances
- State container registry fills up

**Why it happens in Coherent.js:**
Looking at component-system.js `withState` (line 1964-2151):
- State container created in HOC closure
- `cleanup()` exists but not automatically called
- No garbage collection of unused containers
- Shared state (line 2363) stored in `withStateUtils._shared` Map without cleanup

**Warning signs:**
- Memory usage grows during navigation
- Old data appears in new component instances
- "Maximum call stack" errors from listener accumulation

**Prevention:**
```javascript
// BAD: Container lives forever
const stateContainer = createStateContainer(initialState, options);
// No cleanup path

// GOOD: Tie container lifecycle to component
function withState(initialState, options) {
  return function withStateHOC(WrappedComponent) {
    // Create container per instance with cleanup
    const instances = new WeakMap();

    function WithStateComponent(props) {
      // Get or create container for this component tree
      const container = getOrCreateContainer(props.__coherentRoot);

      // Register cleanup
      onUnmount(() => {
        container.destroy();
        instances.delete(props.__coherentRoot);
      });

      return WrappedComponent(props);
    }

    return WithStateComponent;
  };
}
```

**Phase to address:** Phase 2 (Hydration Improvements) - State lifecycle management

---

### Pitfall 10: Inline Event Handler Security

**What goes wrong:** Inline event handlers (`onclick="..."`) bypass CSP and create security vulnerabilities:
- Content Security Policy blocks inline scripts
- User input in handlers enables XSS
- Event handlers as strings can't access closures

**Why it happens:**
Looking at hydration.js, there's attempted support for inline handlers:
```javascript
// Line 1237-1258 - Warning about inline handlers
console.warn(
  `[Coherent.js] Inline event attribute "${eventName}="${eventAttr}" found but not supported.\n` +
  // ...suggests alternatives
);
```

But generated HTML may still contain inline handlers if not filtered.

**Warning signs:**
- CSP errors in browser console
- Events not firing on sites with strict CSP
- XSS vulnerability reports

**Prevention:**
```javascript
// BAD: Inline handler in output
render({ button: { onclick: 'doThing()', text: 'Click' } });
// Outputs: <button onclick="doThing()">Click</button>

// GOOD: Data attribute + event delegation
render({
  button: {
    'data-action': 'doThing',
    text: 'Click'
  }
});
// Outputs: <button data-action="doThing">Click</button>
// Plus: document.addEventListener('click', delegatedHandler);
```

**Phase to address:** Phase 2 (Hydration Improvements) - CSP-compliant event system

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

---

### Pitfall 11: Invalid HTML Nesting Causes Browser "Correction"

**What goes wrong:** Browser auto-corrects invalid HTML, causing hydration mismatch:
- `<p><div>` becomes `<p></p><div></div>`
- `<a><a>` flattens nested links
- `<table>` without `<tbody>` gets one added

**Prevention:**
```javascript
// Validate HTML nesting in renderer
const NESTING_RULES = {
  p: { forbiddenChildren: ['div', 'p', 'ul', 'ol', 'table'] },
  a: { forbiddenChildren: ['a'] },
  button: { forbiddenChildren: ['button', 'a'] },
};

function validateNesting(parent, child, path) {
  const rules = NESTING_RULES[parent];
  if (rules?.forbiddenChildren.includes(child)) {
    console.warn(`Invalid HTML nesting: <${child}> inside <${parent}> at ${path}`);
  }
}
```

---

### Pitfall 12: Missing `key` Prop Warnings Not Shown

**What goes wrong:** Without warnings, developers don't know lists need keys. Performance and correctness issues accumulate silently.

**Prevention:**
```javascript
// In development mode, warn about missing keys
if (process.env.NODE_ENV !== 'production') {
  function renderChildren(children, path) {
    if (Array.isArray(children) && children.length > 1) {
      children.forEach((child, i) => {
        if (child && typeof child === 'object' && !child.key) {
          console.warn(
            `List item at ${path}[${i}] is missing a "key" prop. ` +
            `This can cause performance issues and bugs.`
          );
        }
      });
    }
  }
}
```

---

### Pitfall 13: TypeScript Types Don't Match Runtime

**What goes wrong:** TypeScript definitions say one thing, runtime does another:
- Props typed as required but actually optional
- Return type says `string`, can also be `null`
- Event handlers have wrong parameter types

**Prevention:**
- Generate types from runtime code, not separately authored
- Test types with `tsd` or `expect-type`
- Use `satisfies` to validate literal types

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Core Rendering | Crashes on edge cases | Defensive null checks, depth limits, error boundaries |
| Core Rendering | Hydration mismatch | Enforce deterministic render, validate HTML nesting |
| Hydration | Index-based diffing bugs | Implement key-based reconciliation |
| Hydration | Event handler loss | Event delegation or tracked re-attachment |
| Hydration | State container leaks | Lifecycle-tied cleanup |
| Streaming | Partial render on error | Buffer critical path before streaming |
| HMR | State loss | Dispose handlers, state transfer protocol |
| HMR | Handler duplication | Cleanup before re-attach pattern |
| CLI | Template drift | CI testing of generated projects, version sync |
| CLI | Outdated examples | Living documentation from tests |

## Coherent.js-Specific Issues Identified

Based on codebase analysis:

1. **`hydration.js` line 384-404**: Index-based child patching will cause key-related bugs
2. **`hydration.js` line 847-867**: `innerHTML` replacement destroys event listeners
3. **`hmr.js` line 76-102**: No state preservation or dispose handlers
4. **`project-scaffold.js`**: Uses `getCLIVersion()` (good!) but templates themselves aren't tested
5. **`component-system.js` line 2363**: Shared state Map never cleaned up

## Sources

- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error)
- [Vite HMR API](https://vite.dev/guide/api-hmr)
- [React Reconciliation](https://legacy.reactjs.org/docs/reconciliation.html)
- [Webpack HMR Guide](https://webpack.js.org/guides/hot-module-replacement/)
- [Josh Comeau: Perils of Rehydration](https://www.joshwcomeau.com/react/the-perils-of-rehydration/)
- [Modern.js SSR Docs](https://modernjs.dev/guides/basic-features/render/ssr)
- [Vite Plugin SSR Hydration Mismatch](https://vite-plugin-ssr.com/hydration-mismatch)
