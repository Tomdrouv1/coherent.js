# Phase 5: TypeScript - Research

**Researched:** 2026-01-22
**Domain:** TypeScript declaration files, type testing, HTML element typing
**Confidence:** HIGH

## Summary

This phase provides accurate TypeScript definitions for all public APIs across 15 packages in the Coherent.js monorepo. The codebase is JavaScript-only with manually maintained `.d.ts` files in `types/` directories. Existing type definitions exist but need enhancement for strict element-specific attributes, proper children types, and comprehensive type testing.

The standard approach uses per-module `.d.ts` files mirroring source structure, mapped types for HTML element attributes (following lib.dom.d.ts patterns), and Vitest's built-in `expectTypeOf` for type testing. Shared types live in `@coherent.js/core` with other packages importing from it.

**Primary recommendation:** Use Vitest's built-in type testing (`expectTypeOf` from `expect-type`) with `--typecheck` flag, create mapped types for HTML elements using `HTMLElementTagNameMap` patterns, and establish strict children types that error on invalid structures.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type checking and declaration generation | Already configured in monorepo |
| Vitest | 3.x | Type testing via `--typecheck` | Already used for testing, has built-in `expectTypeOf` |
| expect-type | (bundled) | Type assertion API | Bundled with Vitest, mature and well-documented |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | 20.x | Node.js type definitions | Already present, needed for server-side packages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest expectTypeOf | tsd | tsd is separate tool, Vitest already integrated |
| Vitest expectTypeOf | tsd-lite | Lighter but requires separate setup |
| Manual .d.ts | Generated from JSDoc | Generation tools unreliable for complex patterns |

**Installation:**
```bash
# No new packages needed - Vitest already includes expect-type
pnpm add -D typescript@^5.0.0 # Already present
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
  core/
    src/
      index.js
      components/
        component-system.js
      rendering/
        html-renderer.js
      events/
        event-bus.js
    types/
      index.d.ts           # Main entry, re-exports all
      components.d.ts      # Component system types
      rendering.d.ts       # Renderer types
      events.d.ts          # Event bus types
      elements.d.ts        # HTML element attribute types
    type-tests/
      public-api.typecheck.ts    # Existing
      components.typecheck.ts    # New
      elements.typecheck.ts      # New
  client/
    types/
      index.d.ts
      hydration.d.ts       # Already exists
      router.d.ts          # Already exists
      hmr.d.ts             # Already exists
    type-tests/
      public-api.typecheck.ts    # Existing
```

### Pattern 1: Mapped Types for HTML Elements
**What:** Create a type map that associates each HTML tag name with its specific attribute interface
**When to use:** For the component object syntax to provide accurate per-element autocomplete
**Example:**
```typescript
// Source: lib.dom.d.ts pattern + TypeScript mapped types
interface HTMLElementAttributeMap {
  a: AnchorAttributes;
  button: ButtonAttributes;
  div: DivAttributes;
  form: FormAttributes;
  img: ImageAttributes;
  input: InputAttributes;
  // ... all HTML elements
}

// Base attributes shared by all elements
interface BaseAttributes {
  id?: string;
  className?: string;
  class?: string;
  style?: string | Record<string, string | number>;
  'data-*'?: string;
  // ARIA attributes
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
}

// Element-specific attributes
interface InputAttributes extends BaseAttributes {
  type?: 'text' | 'email' | 'password' | 'number' | 'checkbox' | 'radio' | /* ... */;
  value?: string | number;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  name?: string;
  // Event handlers
  onChange?: string | ((event: Event) => void);
  onInput?: string | ((event: Event) => void);
}

interface ButtonAttributes extends BaseAttributes {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  form?: string;
  onClick?: string | ((event: MouseEvent) => void);
}
```

### Pattern 2: Strict Children Types
**What:** Define exactly what can be in the `children` array with compile-time validation
**When to use:** Always - this is a core decision from CONTEXT.md
**Example:**
```typescript
// Source: Decision from CONTEXT.md
type CoherentChild =
  | string                    // Text content
  | number                    // Numeric content (rendered as string)
  | CoherentElement           // Nested elements
  | CoherentElement[]         // Array of elements
  | null                      // Conditional rendering (renders nothing)
  | undefined;                // Conditional rendering (renders nothing)

// NOT allowed (compile error):
// - boolean (use null/undefined instead)
// - objects without tagName
// - functions (must be called first)

interface ElementProps<T extends keyof HTMLElementAttributeMap> {
  children?: CoherentChild | CoherentChild[];
  text?: string;
  html?: string;  // Raw HTML (dangerous)
  // Spread element-specific attributes
  [K in keyof HTMLElementAttributeMap[T]]?: HTMLElementAttributeMap[T][K];
}
```

### Pattern 3: Component Function Types
**What:** Support both explicit `Component<Props>` typing and inference from function signature
**When to use:** For custom components
**Example:**
```typescript
// Source: TypeScript function inference patterns
// Explicit typing
interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const Button: Component<ButtonProps> = (props) => ({
  button: {
    className: `btn btn-${props.variant ?? 'primary'}`,
    text: props.label,
    onClick: props.onClick
  }
});

// Inference from function signature (also works)
function Card(props: { title: string; children: CoherentChild }) {
  return {
    div: {
      className: 'card',
      children: [
        { h2: { text: props.title } },
        ...Array.isArray(props.children) ? props.children : [props.children]
      ]
    }
  };
}
// TypeScript infers: (props: { title: string; children: CoherentChild }) => CoherentElement
```

### Pattern 4: Type Testing with Vitest
**What:** Use Vitest's built-in type checking with `expectTypeOf`
**When to use:** For all public API type tests
**Example:**
```typescript
// Source: https://vitest.dev/guide/testing-types
// File: type-tests/components.typecheck.ts

import { expectTypeOf } from 'vitest';
import { render, Component, CoherentElement } from '@coherent.js/core';

// Test return types
expectTypeOf(render).returns.toBeString();

// Test parameter types
expectTypeOf(render).parameter(0).toMatchTypeOf<CoherentElement>();

// Test component props
type MyProps = { name: string };
const MyComponent: Component<MyProps> = (props) => ({ div: { text: props.name } });
expectTypeOf(MyComponent).parameter(0).toEqualTypeOf<MyProps>();

// Test that invalid children cause errors
// @ts-expect-error - boolean is not valid child
const invalid: CoherentElement = { div: { children: [true] } };

// Test element-specific attributes
expectTypeOf<{ input: { type: 'checkbox'; checked: true } }>()
  .toMatchTypeOf<CoherentElement>();

// @ts-expect-error - 'checked' not valid on div
const invalidAttr: CoherentElement = { div: { checked: true } };
```

### Anti-Patterns to Avoid
- **Single monolithic index.d.ts:** Makes maintenance difficult, creates long files
- **`[key: string]: any` escape hatches:** Defeats the purpose of strict typing
- **Generating types from JSDoc:** Unreliable for complex mapped types and generics
- **Separate @types/* packages:** Complicates versioning, user needs to install separately
- **`Record<string, unknown>` for props:** Loses all autocomplete benefit

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML element attributes | Custom attribute lists | lib.dom.d.ts patterns | Already standardized, maintained by TypeScript team |
| Type testing | Custom compile-time checks | Vitest expectTypeOf | Mature, well-documented, already in stack |
| DOM event types | Custom Event interfaces | DOM Event types | Standard, matches runtime behavior |
| Element tag names | String union types | HTMLElementTagNameMap keys | Auto-updated with TypeScript versions |

**Key insight:** TypeScript's lib.dom.d.ts already defines all HTML element attribute interfaces. Reference these patterns rather than maintaining a separate list that will drift from standards.

## Common Pitfalls

### Pitfall 1: Excessive Type Complexity Causing Slow Compiles
**What goes wrong:** Deeply nested mapped types with many conditionals cause TypeScript to slow down significantly
**Why it happens:** TypeScript has O(n^2) or worse behavior for some type operations, especially with large unions
**How to avoid:**
- Limit conditional type nesting to 3-4 levels
- Use type caching (separate smaller types instead of one giant type)
- Test compile times during development
**Warning signs:** IDE autocomplete takes >2 seconds, `pnpm typecheck` takes >30 seconds

### Pitfall 2: Type/Runtime Drift
**What goes wrong:** Types say one thing, runtime does another
**Why it happens:** Manual .d.ts files aren't validated against implementation
**How to avoid:**
- Comprehensive type tests using `expectTypeOf`
- CI validation with `--typecheck` flag
- Test actual usage patterns, not just function signatures
**Warning signs:** Users report "types say X but runtime does Y"

### Pitfall 3: Overly Permissive Index Signatures
**What goes wrong:** `[key: string]: any` allows any property, defeating type safety
**Why it happens:** Quick fix for "property doesn't exist" errors
**How to avoid:**
- Use explicit property definitions
- Use template literal types for data-* attributes: `[K in `data-${string}`]?: string`
- For truly dynamic props, use separate `customAttributes` property
**Warning signs:** No red squiggles in IDE when making typos

### Pitfall 4: Inconsistent Null Handling
**What goes wrong:** Some APIs return `T | null`, others return `T | undefined`, some return `T`
**Why it happens:** Different developers, different conventions
**How to avoid:**
- Establish convention: `null` for "intentionally empty", `undefined` for "not set"
- Document in types with JSDoc comments
- Use `strictNullChecks: true` (already enabled)
**Warning signs:** Users need to check both `!= null` and `!= undefined`

### Pitfall 5: Event Handler Type Confusion
**What goes wrong:** Event handlers typed as `(e: Event) => void` but runtime receives `MouseEvent`, `KeyboardEvent`, etc.
**Why it happens:** Generic typing for convenience
**How to avoid:**
- Use DOM event types directly: `onClick?: (e: MouseEvent) => void`
- Match actual runtime behavior (DOM Events, not synthetic wrappers)
- Per-element event handler types (button onClick is MouseEvent, input onChange is Event)
**Warning signs:** Type assertion needed to access event-specific properties

## Code Examples

Verified patterns from official sources:

### Complete Element Definition Type
```typescript
// Source: lib.dom.d.ts patterns + Coherent.js requirements

// Global attributes shared by all HTML elements
interface GlobalHTMLAttributes {
  // Core attributes
  id?: string;
  className?: string;
  class?: string;  // alias for className
  style?: string | CSSStyleDeclaration;
  title?: string;
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  tabIndex?: number;
  hidden?: boolean;
  draggable?: boolean | 'true' | 'false';

  // Data attributes (template literal type)
  [K: `data-${string}`]: string | number | boolean;

  // ARIA attributes
  role?: AriaRole;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-disabled'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-selected'?: boolean | 'true' | 'false';
  // ... other ARIA attributes
}

// Event handler types matching runtime behavior
interface GlobalEventHandlers {
  onClick?: string | ((event: MouseEvent) => void);
  onDblClick?: string | ((event: MouseEvent) => void);
  onMouseDown?: string | ((event: MouseEvent) => void);
  onMouseUp?: string | ((event: MouseEvent) => void);
  onMouseEnter?: string | ((event: MouseEvent) => void);
  onMouseLeave?: string | ((event: MouseEvent) => void);
  onKeyDown?: string | ((event: KeyboardEvent) => void);
  onKeyUp?: string | ((event: KeyboardEvent) => void);
  onKeyPress?: string | ((event: KeyboardEvent) => void);
  onFocus?: string | ((event: FocusEvent) => void);
  onBlur?: string | ((event: FocusEvent) => void);
  onChange?: string | ((event: Event) => void);
  onInput?: string | ((event: Event) => void);
  onSubmit?: string | ((event: SubmitEvent) => void);
}

// Coherent-specific properties
interface CoherentElementBase {
  text?: string | number;
  html?: string;  // Raw HTML (dangerous)
  children?: CoherentChild | CoherentChild[];
}

// Combined base for all elements
type BaseElementAttributes = GlobalHTMLAttributes & GlobalEventHandlers & CoherentElementBase;
```

### Type Test File Structure
```typescript
// Source: https://vitest.dev/guide/testing-types
// File: packages/core/type-tests/elements.typecheck.ts

import { expectTypeOf } from 'vitest';
import type { CoherentElement, CoherentChild, Component } from '@coherent.js/core';

// ==========================================
// Test: Valid element structures compile
// ==========================================

// Simple text element
expectTypeOf<{ div: { text: 'Hello' } }>().toMatchTypeOf<CoherentElement>();

// Element with children
expectTypeOf<{ div: { children: [{ span: { text: 'child' } }] } }>()
  .toMatchTypeOf<CoherentElement>();

// Conditional children (null/undefined allowed)
expectTypeOf<{ div: { children: [null, undefined, { span: {} }] } }>()
  .toMatchTypeOf<CoherentElement>();

// ==========================================
// Test: Invalid structures cause errors
// ==========================================

// @ts-expect-error - boolean not valid child
const boolChild: CoherentElement = { div: { children: [true] } };

// @ts-expect-error - typo in className
const typoClass: CoherentElement = { div: { classname: 'foo' } };

// @ts-expect-error - checked not valid on div
const wrongAttr: CoherentElement = { div: { checked: true } };

// ==========================================
// Test: Element-specific attributes
// ==========================================

// Input with correct attributes
expectTypeOf<{ input: { type: 'checkbox'; checked: true; disabled: false } }>()
  .toMatchTypeOf<CoherentElement>();

// Button with correct attributes
expectTypeOf<{ button: { type: 'submit'; disabled: true } }>()
  .toMatchTypeOf<CoherentElement>();

// ==========================================
// Test: Component types
// ==========================================

interface MyProps { name: string; count?: number }

const MyComponent: Component<MyProps> = (props) => ({
  div: { text: `${props.name}: ${props.count ?? 0}` }
});

// Props are correctly typed
expectTypeOf(MyComponent).parameter(0).toEqualTypeOf<MyProps>();

// Return type is CoherentElement
expectTypeOf(MyComponent).returns.toMatchTypeOf<CoherentElement>();
```

### Package.json Types Configuration
```json
// Source: TypeScript handbook, npm best practices
{
  "name": "@coherent.js/core",
  "types": "./types/index.d.ts",
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "development": "./src/index.js",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./components": {
      "types": "./types/components.d.ts",
      "import": "./src/components/index.js"
    },
    "./events": {
      "types": "./types/events.d.ts",
      "import": "./src/events/index.js"
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tsd for type testing | Vitest built-in expectTypeOf | 2023 | Single test runner for both runtime and type tests |
| Single index.d.ts | Per-module type files | Ongoing | Better maintainability, clearer organization |
| Generic HTML attributes | Per-element typed attributes | TypeScript 4.1+ | Accurate autocomplete, catches typos |
| String event handlers only | String OR function handlers | N/A | Matches Coherent.js runtime (supports both) |

**Deprecated/outdated:**
- **tsd as separate package:** Vitest now includes expect-type, no need for separate tool
- **@types/* separate packages:** Modern practice is to bundle types with the main package
- **Loose `any` typing:** strictNullChecks and noImplicitAny are now standard

## Open Questions

Things that couldn't be fully resolved:

1. **Template literal types for data-* performance**
   - What we know: `[K in \`data-${string}\`]?: string` provides autocomplete
   - What's unclear: Performance impact at scale with many elements
   - Recommendation: Implement and measure compile times, simplify if needed

2. **Void elements children type**
   - What we know: Void elements (br, hr, img, input) cannot have children
   - What's unclear: How strict to be (error vs warning vs ignore)
   - Recommendation: Use separate type for void elements that omits children

3. **Cross-package type imports**
   - What we know: @coherent.js/client needs types from @coherent.js/core
   - What's unclear: Best way to structure for both internal dev and published packages
   - Recommendation: Use workspace protocol for dev, test published package types in CI

## Sources

### Primary (HIGH confidence)
- [Vitest Type Testing Guide](https://vitest.dev/guide/testing-types) - expectTypeOf configuration and usage
- [expect-type GitHub](https://github.com/mmkal/expect-type) - Matcher documentation
- [TypeScript Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) - Official documentation
- [TypeScript JSX Documentation](https://www.typescriptlang.org/docs/handbook/jsx.html) - IntrinsicElements patterns

### Secondary (MEDIUM confidence)
- [Managing TS Packages in Monorepos](https://nx.dev/blog/managing-ts-packages-in-monorepos) - Nx best practices
- [TypeScript Type Maps Pattern](https://oida.dev/typescript-type-maps/) - HTML element type map pattern
- [Total TypeScript JSX IntrinsicElements](https://www.totaltypescript.com/what-is-jsx-intrinsicelements) - JSX typing patterns

### Tertiary (LOW confidence)
- Various Stack Overflow and dev.to articles on HTML element typing patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vitest/expect-type already in use, well-documented
- Architecture: HIGH - Per-module pattern is standard, matches existing structure
- Element typing: MEDIUM - Patterns are clear but implementation details need validation
- Pitfalls: HIGH - Based on TypeScript documentation and common issues

**Research date:** 2026-01-22
**Valid until:** 2026-03-22 (60 days - TypeScript ecosystem is stable)
