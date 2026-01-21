# Architecture Patterns for SSR Hydration and CLI Scaffolding

**Domain:** SSR Framework Hydration & CLI Tooling
**Researched:** 2026-01-21
**Confidence:** HIGH (verified against React, SolidJS, Vue official docs and implementations)

## Executive Summary

Research into mature SSR frameworks reveals clear architectural patterns that enable stability and extensibility. The current Coherent.js architecture has several structural issues that can be addressed by adopting proven patterns from React, SolidJS, and modern CLI tools.

**Key Findings:**
1. Hydration should be separated into distinct modules: state serialization, event delegation, DOM patching, and component reconciliation
2. CLI generators benefit from template-based architecture with modular action handlers
3. Key-based reconciliation is essential for stable list diffing
4. Event delegation at document level prevents hydration overhead

---

## Current State Analysis

### Coherent.js Hydration Issues

The current `packages/client/src/hydration.js` (1791 lines) handles too many concerns:

| Concern | Lines Approx | Problem |
|---------|--------------|---------|
| State extraction | 18-75 | Hardcoded state patterns (count, step, todos) |
| Component hydration | 86-621 | Mixed with DOM patching |
| DOM diffing/patching | 219-454 | No key-based reconciliation |
| Event attachment | 1017-1385 | Multiple redundant approaches |
| Todo-specific logic | 835-1004 | Hardcoded application logic |
| Global event handlers | 623-688 | Window-level state management |

**Critical Issues:**
- No separation between hydration lifecycle and DOM patching
- Position-based diffing instead of key-based reconciliation
- Hardcoded application-specific state patterns
- Multiple event attachment strategies that conflict

### Coherent.js CLI Issues

The current CLI structure (`packages/cli/src/`) has:

| File | Lines | Problem |
|------|-------|---------|
| `project-scaffold.js` | 548 | Monolithic generation logic |
| `component-generator.js` | 443 | Template strings inline |
| Multiple `*-scaffold.js` files | - | Good separation but no shared template system |

**Issues:**
- Templates embedded in JavaScript strings
- No template engine for consistent output
- No validation of generated file connections

---

## Recommended Architecture

### Hydration Module Structure

Based on React Fiber and SolidJS patterns, hydration should be decomposed into:

```
packages/client/src/
  hydration/
    index.js                 # Public API (hydrate, autoHydrate)

    # Core Hydration Pipeline
    state-serializer.js      # Extract/restore state from DOM
    component-registry.js    # Track hydrated components
    hydration-controller.js  # Orchestrate hydration process

    # DOM Reconciliation (separate from hydration)
    reconciler/
      index.js
      differ.js              # Key-based diff algorithm
      patcher.js             # Apply patches to DOM
      scheduler.js           # Priority-based updates (like Fiber)

    # Event System (separate from reconciliation)
    events/
      delegation.js          # Single document-level listener
      registry.js            # Map event IDs to handlers
      serializer.js          # Serialize handlers for SSR
```

### Component Boundaries

**State Serializer** (Single Responsibility: State Transfer)
```javascript
// Responsibility: Extract state from DOM, serialize for hydration
export class StateSerializer {
  // Extracts state from data-coherent-state attribute
  extractFromDOM(element) { ... }

  // Serializes component state for SSR output
  serializeForSSR(state) { ... }

  // Restores state during hydration
  restoreState(element, initialState) { ... }
}
```

**Reconciler** (Single Responsibility: DOM Updates)
```javascript
// Responsibility: Compute and apply minimal DOM changes
export class Reconciler {
  constructor(options) {
    this.differ = new KeyBasedDiffer();
    this.patcher = new DOMPatcher();
  }

  // Compute diff between old and new vdom
  diff(oldVNode, newVNode) { ... }

  // Apply patches to actual DOM
  patch(element, patches) { ... }

  // Key-based child reconciliation (critical for lists)
  reconcileChildren(element, oldChildren, newChildren) { ... }
}
```

**Event Delegation System** (Single Responsibility: Event Management)
```javascript
// Responsibility: Single entry point for all events
export class EventDelegation {
  constructor() {
    this.handlers = new Map();  // eventId -> handler function
  }

  // Initialize single document-level listener
  initialize() {
    document.addEventListener('click', this.handleEvent, true);
    // ... other event types
  }

  // Route event to correct handler via data attributes
  handleEvent(event) {
    const eventId = event.target.closest('[data-coherent-event]')
      ?.getAttribute('data-coherent-event');
    if (eventId && this.handlers.has(eventId)) {
      this.handlers.get(eventId)(event);
    }
  }
}
```

### Key-Based Reconciliation Algorithm

**Current Problem:** Position-based diffing causes incorrect updates.

```javascript
// CURRENT (problematic)
for (let i = 0; i < maxLength; i++) {
  const oldChild = oldChildren[i];
  const newChild = newChildren[i];
  const domChild = domChildren[i];
  // Position-based comparison - fails on reorder
}
```

**Recommended Pattern:** Key-based reconciliation (React's approach).

```javascript
// RECOMMENDED
class KeyBasedDiffer {
  reconcileChildren(parentElement, oldChildren, newChildren) {
    // Build key -> element map from old children
    const oldKeyMap = new Map();
    oldChildren.forEach((child, index) => {
      const key = this.getKey(child) || `__index_${index}`;
      oldKeyMap.set(key, { vnode: child, element: domChildren[index], index });
    });

    // Process new children
    const patches = [];
    const usedKeys = new Set();

    newChildren.forEach((newChild, newIndex) => {
      const key = this.getKey(newChild) || `__index_${newIndex}`;
      usedKeys.add(key);

      if (oldKeyMap.has(key)) {
        const old = oldKeyMap.get(key);
        // Same key - update in place
        patches.push({ type: 'UPDATE', element: old.element, vnode: newChild });

        // Check if position changed
        if (old.index !== newIndex) {
          patches.push({ type: 'MOVE', element: old.element, toIndex: newIndex });
        }
      } else {
        // New key - insert
        patches.push({ type: 'INSERT', vnode: newChild, atIndex: newIndex });
      }
    });

    // Remove old keys not in new list
    oldKeyMap.forEach((old, key) => {
      if (!usedKeys.has(key)) {
        patches.push({ type: 'REMOVE', element: old.element });
      }
    });

    return patches;
  }

  getKey(vnode) {
    if (!vnode || typeof vnode !== 'object') return null;
    const tagName = Object.keys(vnode)[0];
    return vnode[tagName]?.key || vnode[tagName]?.id || null;
  }
}
```

### CLI Generator Architecture

Based on Plop.js and Hygen patterns, restructure CLI to use:

```
packages/cli/
  src/
    index.js                  # CLI entry point

    # Commands (thin wrappers)
    commands/
      create.js               # Project creation
      generate.js             # Code generation

    # Generators (action-based)
    generators/
      index.js                # Generator registry
      project/
        index.js              # Project generator definition
        actions.js            # Generation actions
        prompts.js            # User prompts
      component/
        index.js
        actions.js
        prompts.js
      page/
        index.js
        actions.js
        prompts.js

    # Templates (external files, not inline strings)
    templates/
      project/
        package.json.hbs      # Handlebars template
        src/index.js.hbs
        src/components/HomePage.js.hbs
      component/
        {{name}}.js.hbs       # Dynamic filename
        {{name}}.test.js.hbs
      page/
        {{name}}.js.hbs

    # Utilities
    utils/
      template-engine.js      # Handlebars wrapper
      file-writer.js          # Safe file writing
      validation.js           # Input validation
```

**Generator Definition Pattern:**
```javascript
// generators/component/index.js
export default {
  name: 'component',
  description: 'Generate a new component',
  prompts: [
    {
      type: 'input',
      name: 'name',
      message: 'Component name:',
      validate: (input) => /^[A-Z][a-zA-Z]*$/.test(input) || 'Must be PascalCase'
    },
    {
      type: 'list',
      name: 'template',
      message: 'Component type:',
      choices: ['basic', 'functional', 'interactive', 'layout']
    }
  ],
  actions: [
    {
      type: 'add',
      path: 'src/components/{{name}}.js',
      templateFile: 'templates/component/{{template}}.js.hbs'
    },
    {
      type: 'add',
      path: 'src/components/{{name}}.test.js',
      templateFile: 'templates/component/test.js.hbs'
    }
  ]
};
```

---

## Data Flow Patterns

### Hydration Data Flow

```
SSR Phase:
  Component Tree -> Render HTML -> Serialize State to data-* attrs

Client Phase:
  HTML + State -> Parse State -> Create Component Instances ->
    Register Event Handlers -> Attach to DOM

Update Phase:
  State Change -> Reconcile vDOM -> Key-based Diff ->
    Minimal DOM Patches -> Re-register Handlers (if needed)
```

**Critical Rule:** State flows one direction. Never derive state from DOM during updates.

### Event Flow Pattern

```
User Event -> Document Listener (delegation) ->
  Find event ID in target ancestry ->
  Lookup handler in registry ->
  Execute with component context (state, setState) ->
  Schedule reconciliation if state changed
```

**Why Event Delegation Matters:**
- No need to re-attach handlers after DOM updates
- Single listener per event type (not per element)
- Lazy handler loading possible (Qwik pattern)

---

## Patterns to Follow

### Pattern 1: Separation of Concerns

**What:** Each module has one responsibility
**When:** Always - fundamental architectural principle
**Example:**
```javascript
// GOOD: Single responsibility
class StateSerializer {
  serialize(state) { /* only serialization logic */ }
  deserialize(data) { /* only deserialization logic */ }
}

// BAD: Mixed responsibilities (current hydrate function)
function hydrate(element, component, props, options) {
  // State extraction
  // Component instantiation
  // DOM patching
  // Event attachment
  // Todo list updates
  // Filter button updates
  // ... 1791 lines of mixed concerns
}
```

### Pattern 2: Key-Based Identity

**What:** Use stable keys for list items
**When:** Any dynamic list or reorderable content
**Example:**
```javascript
// Component definition
const TodoList = ({ todos }) => ({
  ul: {
    children: todos.map(todo => ({
      li: {
        key: todo.id,  // Stable identity
        text: todo.text
      }
    }))
  }
});
```

### Pattern 3: Progressive Hydration

**What:** Hydrate components on demand, not all at once
**When:** Large applications with many components
**Example:**
```javascript
// Only hydrate when component enters viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      hydrateComponent(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll('[data-coherent-lazy]')
  .forEach(el => observer.observe(el));
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Application Logic in Framework Code

**What:** Hardcoded todo list updates, counter logic in hydration
**Why bad:** Framework becomes coupled to specific applications
**Instead:** Generic state update mechanism

```javascript
// CURRENT (bad) - hardcoded in hydration.js
function updateTodoList(rootElement, state) {
  const todoList = rootElement.querySelector('.todo-list');
  // ... todo-specific logic in framework code
}

// RECOMMENDED - generic
function updateComponent(instance) {
  const newVDOM = instance.component(instance.props, instance.state);
  instance.reconciler.patch(instance.element, instance.vdom, newVDOM);
  instance.vdom = newVDOM;
}
```

### Anti-Pattern 2: Multiple Event Registration Strategies

**What:** Function handlers, data-action, data-coherent-event, onclick all in same codebase
**Why bad:** Confusing API, conflicts, harder to debug
**Instead:** Single canonical approach (event delegation)

### Anti-Pattern 3: Position-Based Diffing

**What:** Comparing children by array index
**Why bad:** Reordering causes full re-render, state loss
**Instead:** Key-based reconciliation (see algorithm above)

---

## Scalability Considerations

| Concern | 100 Components | 10K Components | 1M Components |
|---------|----------------|----------------|---------------|
| Hydration | Full hydrate | Progressive | Islands only |
| Event Handling | Delegation | Delegation | Delegation + lazy load |
| DOM Updates | Full reconcile | Batched updates | Virtual scrolling |
| State | Local | Shared stores | Server state |

---

## Refactoring Approach

### Phase 1: Extract and Isolate (Non-Breaking)

1. **Create new module structure** without changing existing API
2. **Extract StateSerializer** from hydrate function
3. **Extract Reconciler** with new key-based algorithm
4. **Extract EventDelegation** system

### Phase 2: Internal Migration (Non-Breaking)

1. **Update hydrate()** to use new modules internally
2. **Maintain existing API** (hydrate, autoHydrate, makeHydratable)
3. **Add key support** to virtual DOM structure
4. **Deprecate** multiple event registration patterns

### Phase 3: API Refinement (Breaking with Migration)

1. **Expose new APIs** for advanced use cases
2. **Remove deprecated code**
3. **Add progressive hydration** support

### CLI Refactoring

1. **Extract templates** to external files
2. **Create generator definitions** (prompt + action pattern)
3. **Implement template engine** (Handlebars or EJS)
4. **Add validation** for generated file connections

---

## Sources

**React Architecture:**
- [Understanding Reconciliation in React 19](https://medium.com/@souviksen093/understanding-reconciliation-in-react-19-19-2-a-deep-dive-into-modern-ui-rendering-ed433ce1e375)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
- [React Reconciliation Official Docs](https://legacy.reactjs.org/docs/reconciliation.html)
- [Mastering Hydration in React 19](https://dev.to/melvinprince/mastering-hydration-in-react-19-the-ultimate-guide-to-faster-smarter-rendering-46ep)

**SolidJS Patterns:**
- [SolidJS Fine-Grained Reactivity](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity)
- [SolidJS Creator on Fine-Grained Reactivity](https://thenewstack.io/solidjs-creator-on-fine-grained-reactivity-as-next-frontier/)
- [The Road to SolidJS 2.0](https://github.com/solidjs/solid/discussions/2425)

**Hydration Research:**
- [Hydration is Pure Overhead (Qwik)](https://www.builder.io/blog/hydration-is-pure-overhead)
- [Conquering JavaScript Hydration](https://dev.to/this-is-learning/conquering-javascript-hydration-a9f)
- [MRAH in React Applications (arxiv)](https://arxiv.org/html/2504.03884v1)

**CLI Tools:**
- [Plop.js Documentation](https://plopjs.com/)
- [Hygen GitHub](https://github.com/jondot/hygen)
- [Vite Project Scaffolding](https://deepwiki.com/vitejs/vite/6-project-scaffolding)

---

## Implementation Checklist

- [ ] Create `packages/client/src/hydration/` directory structure
- [ ] Implement `StateSerializer` class
- [ ] Implement `KeyBasedDiffer` class with key extraction
- [ ] Implement `DOMPatcher` class
- [ ] Implement `EventDelegation` single-listener system
- [ ] Create `HydrationController` to orchestrate
- [ ] Migrate `hydrate()` to use new modules
- [ ] Extract CLI templates to `.hbs` files
- [ ] Implement generator definition pattern
- [ ] Add validation for generated file imports
