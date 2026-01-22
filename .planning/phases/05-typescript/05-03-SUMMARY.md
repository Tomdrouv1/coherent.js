---
phase: 05-typescript
plan: 03
subsystem: client-types
tags: [typescript, client, hydration, event-handlers, type-tests]

dependency-graph:
  requires:
    - 05-01: Core strict element types (CoherentNode, StrictCoherentElement)
  provides:
    - Client types importing from core
    - Specific DOM event handler types
    - Comprehensive hydration type tests
  affects:
    - 05-04: API package types (similar pattern)
    - Future: Client API consumers get better type inference

tech-stack:
  added:
    - expect-type: Type testing utility
  patterns:
    - Type re-export from core package
    - Generic event handler types with DOM events
    - expectTypeOf for type assertions

key-files:
  created:
    - packages/client/type-tests/hydration.typecheck.ts
    - packages/client/types/hydration.d.ts
  modified:
    - packages/client/types/index.d.ts
    - packages/client/types/router.d.ts
    - packages/client/type-tests/public-api.typecheck.ts

decisions:
  - id: client-imports-core
    choice: Client types import from @coherent.js/core
    rationale: Single source of truth for element types
  - id: specific-event-handlers
    choice: Typed handlers for each DOM event (ClickHandler, KeyHandler, etc.)
    rationale: Better type inference for event properties
  - id: generic-registerEventHandler
    choice: Made registerEventHandler generic for state and event types
    rationale: Allows typed state and specific event types in handlers
  - id: serializable-state-strict
    choice: SerializableState only allows JSON-safe values
    rationale: Prevents runtime errors during state serialization

metrics:
  duration: 7 min
  completed: 2026-01-22
---

# Phase 05 Plan 03: Client Package Types Summary

Client types now import from @coherent.js/core and provide specific DOM event handler types with comprehensive type tests.

## Overview

Updated @coherent.js/client types to integrate with core's element types, added specific DOM event handler types, and created comprehensive type tests for all hydration APIs.

## Completed Tasks

### Task 1: Update client types to import core element types
**Commit:** `4c808a0`

- Added imports from `@coherent.js/core` for CoherentNode, CoherentElement, StrictCoherentElement, CoherentComponent, ComponentProps, ComponentState
- Re-exported core types for convenience
- Added specific DOM event handler types:
  - `ClickHandler` (MouseEvent)
  - `KeyHandler` (KeyboardEvent)
  - `FocusHandler` (FocusEvent)
  - `SubmitHandler` (SubmitEvent)
  - `ChangeHandler` (Event)
  - `InputHandler` (InputEvent)
  - `MouseHandler`, `DragHandler`, `TouchHandler`, `WheelHandler`
- Added `StateAwareHandler<S, E>` for typed state management in event handlers
- Updated `HydratedInstance` to use `CoherentComponent` type
- Made `registerEventHandler` and `wrapEvent` generic for type flexibility
- Restricted `SerializableState` to JSON-safe values only

### Task 2: Create comprehensive hydration type tests
**Commit:** `fee6e29`

Created `hydration.typecheck.ts` with tests for:
- `hydrate()` function returning `HydrateControl`
- `legacyHydrate()` returning `HydratedInstance | null`
- `hydrateAll()` and `hydrateBySelector()` batch hydration
- `autoHydrate()` and `enableClientEvents()` initialization
- `makeHydratable()` component enhancement
- `registerEventHandler()` with generic state/event types
- `SerializableState` type constraints (primitives, arrays, nested objects)
- All specific event handler types with DOM event properties
- `StateAwareHandler` with typed state and setState
- `ClientComponent` interface methods
- State serialization functions
- Mismatch detection functions
- Event delegation exports
- Integration with core types

### Task 3: Expand client public API type tests
**Commit:** `c91c952`

Expanded `public-api.typecheck.ts` to comprehensively test:
- Core type re-exports from @coherent.js/core
- All hydration API functions and options
- State serialization API
- Mismatch detection API
- Event delegation API (eventDelegation, handlerRegistry, wrapEvent)
- Router API with full types (RouterConfig, Router, RouterStats)
- Client state manager interface
- Event manager interface
- HMR Client API (HMRClient, ModuleTracker, CleanupTracker, StateCapturer, ErrorOverlay, ConnectionIndicator)
- Hot Context API (accept, dispose, data persistence)
- Performance monitor interface
- All specific event handler types
- ClientComponent, ComponentFactory, ComponentRegistryEntry

Also updated `router.d.ts` with proper types instead of `any`.

## Key Changes

### Type Integration Pattern
```typescript
// Client now imports from core
import type {
  CoherentNode,
  CoherentElement,
  StrictCoherentElement,
  CoherentComponent,
} from '@coherent.js/core';

// Re-exports for convenience
export type { CoherentNode, CoherentElement, ... };
```

### Specific Event Handlers
```typescript
// Generic handler with specific event type
export type EventHandler<E extends Event = Event> = (
  event: E,
  element: HTMLElement,
  data?: any
) => void | Promise<void>;

// Specific handlers for common events
export type ClickHandler = EventHandler<MouseEvent>;
export type KeyHandler = EventHandler<KeyboardEvent>;
export type FocusHandler = EventHandler<FocusEvent>;
```

### State-Aware Handlers
```typescript
// Generic state and event type parameters
export type StateAwareHandler<S = any, E extends Event = Event> = (
  event: E,
  state: S,
  setState: (newState: Partial<S> | ((prev: S) => Partial<S>)) => void
) => void | Promise<void>;

// Usage
const handler: StateAwareHandler<{ count: number }, MouseEvent> = (event, state, setState) => {
  setState({ count: state.count + 1 });
};
```

### SerializableState Restriction
```typescript
// Only JSON-safe values allowed
export interface SerializableState {
  [key: string]:
    | SerializablePrimitive        // string | number | boolean | null
    | SerializablePrimitive[]
    | SerializableState
    | SerializableState[]
    | undefined;
}
```

## Verification Results

All verifications passed:
- `pnpm --filter @coherent.js/client run typecheck` - passes
- Client types import from @coherent.js/core
- Event handler types are specific to DOM event types
- All major client APIs covered by type tests

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/types/index.d.ts` | Modified | Import core types, add event handlers |
| `packages/client/types/router.d.ts` | Modified | Replace any with proper Router types |
| `packages/client/types/hydration.d.ts` | Created | Hydration-specific type re-exports |
| `packages/client/type-tests/hydration.typecheck.ts` | Created | Comprehensive hydration type tests |
| `packages/client/type-tests/public-api.typecheck.ts` | Modified | Expanded API coverage |
| `packages/client/package.json` | Modified | Added expect-type dependency |

## Next Phase Readiness

Ready for 05-04 (API package types) with:
- Pattern established for importing core types
- expect-type installed for type testing
- Comprehensive type test structure in place
