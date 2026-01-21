# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- `camelCase` for JavaScript files: `object-factory.js`, `component-system.js`
- Descriptive names reflecting module purpose
- Private/internal utilities prefixed with underscore in properties: `_isSubmitting`, `_type`, `_ArrayFrom`

**Functions:**
- `camelCase` for all functions: `createElement()`, `validateComponent()`, `fireEvent()`
- Verb-first for actions: `render()`, `create()`, `validate()`, `register()`, `hydrate()`
- Helper functions with underscores for private/internal methods in classes
- Factory functions: `create*()` pattern like `createComponent()`, `createRouter()`, `createErrorBoundary()`

**Variables:**
- `camelCase` for all variables: `enableCache`, `maxDepth`, `scopeCounter`
- `const` for all declarations (ESLint enforces via `prefer-const` rule)
- Unused parameters prefixed with `_`: `(_error)`, `(_name, _value)`

**Types/Classes:**
- `PascalCase` for classes: `BaseRenderer`, `EventBus`, `ComponentCache`, `FormBuilder`
- `SCREAMING_SNAKE_CASE` for constants: `HTML_ELEMENTS`, `CoherentTypes`, `COHERENT_MARKER`, `DEFAULT_RENDERER_CONFIG`

## Code Style

**Formatting:**
- Tool: Prettier 3.7.4
- Semicolons: enabled (`semi: true`)
- Print width: 80 characters
- Tab width: 2 spaces
- Single quotes: true (`singleQuote: true`)
- Trailing commas: ES5 format (`trailingComma: "es5"`)
- Line endings: LF (`endOfLine: "lf"`)

**Linting:**
- Tool: ESLint 9.39.2 (new config format)
- Max warnings allowed: 0 (strict enforcement)
- Node.js 20+ features required
- ES2022 target with module syntax

**Key ESLint Rules:**
- Strict equality only: `eqeqeq: ['error', 'always']`
- No eval or dynamic code: `no-eval`, `no-implied-eval`, `no-new-func` errors
- Const enforcement: `prefer-const: 'error'`, `no-var: 'error'`
- No console in tests/browser: `no-console: 'off'` (allowed on server)
- No debugger statements: `no-debugger: 'error'`

## Import Organization

**Order:**
1. Node.js built-ins (with `node:` prefix): `import { readFileSync } from 'node:fs'`, `import { env } from 'node:process'`
2. Third-party packages: `import { defineConfig } from 'vitest/config'`
3. Local modules: `import { render } from '../src/index.js'`

**Path Aliases:**
- No path aliases detected; uses relative paths only: `../src/index.js`, `../components/component-system.js`
- Always use `.js` extension in imports (ESM requirement)

**Module Structure:**
- ESM-only: `"type": "module"` in package.json
- Barrel exports common patterns: `export { EventBus, createEventBus, globalEventBus }`
- Default exports used for classes or main module exports
- Named exports for utility functions

## Error Handling

**Patterns:**
- Custom error classes extending `Error`: `CoherentError`, `ComponentValidationError`, `RenderingError`, `PerformanceError`, `StateError`
- Error classes include metadata: `type`, `code`, `component`, `context`, `suggestions`, `docsUrl`, `timestamp`
- Validation throws descriptive errors immediately with context: `throw new Error('Invalid HTML element: ${tag}')`
- Safe execution wrappers: `safeExecute()`, `safeExecuteAsync()` for defensive programming
- Global error handler available: `globalErrorHandler`, `createErrorHandler()`
- Error serialization: errors implement `toJSON()` for logging

**Error Boundaries:**
- `createErrorBoundary()` for component-level error containment
- `withErrorBoundary()` HOC wrapper for components
- Async error boundaries: `createAsyncErrorBoundary()`
- Fallback content on error: `createErrorFallback()`

**Config Validation:**
- All config objects validated on instantiation
- Type checking with descriptive error messages: `if (typeof config.maxDepth !== 'number') { throw new Error('...') }`
- Range validation: positive number checks for numeric configs

## Logging

**Framework:** console (server-side), no dedicated logger for core

**Patterns:**
- Log level utilities in `@coherent.js/devtools`: `logger` module
- Debug logging controlled by config flag: `enableDebugLogging: false`
- Dev warnings controlled by NODE_ENV: `enableDevWarnings: process.env.NODE_ENV === 'development'`
- Performance metrics tracked via `performanceMonitor` singleton
- Structured logging available but optional in most packages

## Comments

**When to Comment:**
- File-level docstrings for modules: describes purpose and exports
- Algorithm-level comments for complex logic
- Warning comments for edge cases or non-obvious code
- Configuration comments explaining key options

**JSDoc/TSDoc:**
- Used in public API functions: `@param`, `@returns`, `@throws`, `@example`
- Parameter types documented: `@param {string} tag`, `@param {Object} [props={}]`
- Optional parameters marked with brackets: `[props={}]`
- Return types specified: `@returns {Object}`, `@returns {Promise<void>}`
- Examples included for complex utilities: `@example` blocks

**Example:**
```javascript
/**
 * Creates a Coherent object with the specified tag and properties
 * @param {string} tag - HTML tag name
 * @param {Object} [props={}] - Properties object
 * @returns {Object} Coherent object with element structure
 * @throws {Error} When invalid HTML element is provided
 */
export function createElement(tag, props = {}) {
```

## Function Design

**Size:**
- Aim for small, focused functions (under 50 lines typical)
- Factory functions wrap object creation: `createElement()`, `createComponent()`

**Parameters:**
- Destructured object parameters for options: `(options = {})`
- Default values in destructuring: `{ validateOnChange: true, name: options.name || 'form' }`
- Unused params marked with underscore: `(_error)`, `(_name, _value)`
- Parameter validation happens early in function body

**Return Values:**
- Return `this` for builder pattern methods: `field()`, `removeField()` return `this`
- Return objects, arrays, or promises (async functions)
- `void` for side-effect only functions
- Consistent return types within function scope

## Module Design

**Exports:**
- Named exports for utilities: `export function createElement()`, `export class BaseRenderer {}`
- Default export for main module or class: `export default EventBus`
- Singleton exports: `export const globalEventBus = createEventBus()`
- Group related exports together with comments

**Barrel Files:**
- Common pattern in `index.js` files
- Re-export grouped functionality: `export { ComponentCache, createComponentCache, memoize }`
- Organize by concern/layer

**Package Organization:**
- `/src` contains implementation (ESM-only)
- `/test` contains test files co-located by package
- Each package is self-contained with own `vitest.config.js`
- Pnpm workspaces for monorepo management

## Global Conventions

**Strict Mode:**
- All code in ES2022 module context (implicit strict mode)
- No runtime feature detection needed

**Browser/Node.js Differentiation:**
- Core packages support both environments (isomorphic)
- Feature detection via `typeof process !== 'undefined'`
- Globals provided via ESLint config for each environment
- Test setup creates mocks: `global.window`, `global.document`

**Performance Considerations:**
- Memoization via `memoize()` function for expensive computations
- Cache managers for component/rendering cache
- Streaming rendering support built-in
- Performance monitoring available but optional

---

*Convention analysis: 2026-01-21*
