# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

**Large Hydration Module:**
- Issue: `packages/client/src/hydration.js` is 1791 lines, handling state management, DOM patching, event attachment, and virtual DOM operations all in one file
- Files: `packages/client/src/hydration.js`
- Impact: Difficult to test individual functionality, high cognitive load for maintenance, potential for regression bugs when modifying any feature
- Fix approach: Split into separate modules (hydration.js, dom-patching.js, event-handlers.js, state-management.js) following single responsibility principle

**Large Component System File:**
- Issue: `packages/core/src/components/component-system.js` is 2596 lines handling components, lifecycle, composition, plugins, and state management
- Files: `packages/core/src/components/component-system.js`
- Impact: Single point of failure, difficult navigation, increased bug surface area, testing complexity
- Fix approach: Separate concerns into lifecycle.js, composition.js, plugin-integration.js, and keep core as ~400 lines

**Large Router Implementation:**
- Issue: `packages/api/src/router.js` is 1802 lines combining routing logic, validation, serialization, error handling, and middleware
- Files: `packages/api/src/router.js`
- Impact: Difficult to modify routing behavior without understanding entire file, hard to test individual route matching scenarios
- Fix approach: Extract route-matching (route-matcher.js), middleware chain (middleware-chain.js), and handler resolution (handler-resolver.js)

**Large Migration System:**
- Issue: `packages/database/src/migration.js` is 1113 lines managing schema migrations, transaction handling, and version control
- Files: `packages/database/src/migration.js`
- Impact: Complex transaction logic, difficult to understand failure scenarios, hard to add new migration features
- Fix approach: Separate transaction management (tx-manager.js) from migration execution (executor.js)

**Deprecated SPA Form Builders:**
- Issue: `packages/forms/src/index.js` exports deprecated SPA-only form builders kept for backward compatibility
- Files: `packages/forms/src/index.js` exports from `forms.js` and `advanced-validation.js`
- Impact: Confusion for new developers, maintenance burden, users may choose suboptimal patterns
- Fix approach: Plan removal in next major version with deprecation warnings, update documentation to recommend SSR + Hydration pattern

## Security Considerations

**Function Constructor Risk in Hydration:**
- Risk: Comment in `packages/client/dist/client/hydration.js` line 1104 indicates "TODO: Replace Function constructor with safer alternative"
- Files: `packages/client/src/hydration.js` (source)
- Current mitigation: Event handlers appear to use direct function invocation, not Function() constructor
- Recommendations: Audit all dynamic code execution, ensure no `new Function()` or `eval()` is used anywhere, document approved patterns for function references

**Input Sanitization in Router:**
- Risk: Basic regex-based XSS prevention in `packages/api/src/router.js` (lines 81-83) with patterns like `<script>`, `javascript:`, `on\w+=`
- Files: `packages/api/src/router.js` lines 71-91
- Current mitigation: Removes obvious XSS vectors but may be bypassed with encoded payloads
- Recommendations: Use established sanitization library (DOMPurify for browser, xss for Node), validate against schema not just strings, document security assumptions

**Action Registry Injection Points:**
- Risk: Global registries `window.__coherentActionRegistry` and `window.__coherentEventRegistry` are exposed and could be mutated
- Files: `packages/client/src/hydration.js` lines 623-688, `packages/core/src/core/html-utils.js` lines 67-102
- Current mitigation: Registry checks in `attachEventListeners()` prevent duplicate handlers
- Recommendations: Freeze registry after initialization, validate handler function signatures before execution, document registry as internal API

**Prototype Pollution in Router:**
- Risk: Sanitization skips keys starting with `__` or containing `prototype` but object iteration could still mutate prototype
- Files: `packages/api/src/router.js` lines 71-91
- Current mitigation: Basic key filtering
- Recommendations: Use `Object.create(null)` for sanitization target, use `Object.hasOwnProperty()` for checks

## Performance Bottlenecks

**WeakMap Memory Usage in Hydration:**
- Problem: `componentInstances` WeakMap stores all hydrated component instances globally
- Files: `packages/client/src/hydration.js` lines 8-9
- Cause: No cleanup mechanism if hydrated components are removed from DOM but instance remains referenced
- Improvement path: Add explicit `destroy()` calls in component cleanup, use IntersectionObserver to detect removed components and clean up

**DOM Diffing Algorithm Limitations:**
- Problem: Simple index-based diffing in `patchChildren()` (lines 331-405) doesn't use keys, causing all children to re-render on list mutations
- Files: `packages/client/src/hydration.js` lines 381-404
- Cause: Comment on line 381 acknowledges "Simple diffing algorithm - can be improved with key-based diffing"
- Improvement path: Implement key-based reconciliation, add move detection for reordered elements, benchmark against React's algorithm

**EventListeners Array Linear Search:**
- Problem: Event listener cleanup iterates entire `eventListeners` array (lines 519-523)
- Files: `packages/client/src/hydration.js` lines 519-523
- Cause: Array storage means O(n) removal, linear search for duplicates
- Improvement path: Use Map keyed by element+event type for O(1) lookups, implement listener deduplication at registration time

**Global Map for Rate Limiting:**
- Problem: `rateLimitStore` Map in router grows unbounded across requests
- Files: `packages/api/src/router.js` line 97
- Cause: No TTL or cleanup for expired entries
- Improvement path: Add timestamp-based expiration, implement LRU eviction for memory bounds, document max map size limits

**Set Operations in Component State:**
- Problem: `listeners` Set in ComponentState iterates on every state change (line 97)
- Files: `packages/core/src/components/component-system.js` lines 87-99
- Cause: forEach on listeners for each state notification, no batching
- Improvement path: Implement microtask-based batching, defer listener notifications, prioritize frequently-changing state

## Fragile Areas

**HTML-to-Virtual-DOM Conversion:**
- Files: `packages/client/src/hydration.js` method `virtualElementFromDOM()` (lines 172-216)
- Why fragile: Complex DOM traversal logic with edge cases for text nodes, attributes, and nested children; attribute name translation (className->class)
- Safe modification: Add comprehensive test coverage for malformed DOM, nested fragments, SVG elements; document supported element types
- Test coverage: Exists (`packages/client/test/hydration.test.js`) but needs more edge case coverage for SVG, void elements, attributes with special characters

**Virtual-DOM-to-HTML Rendering:**
- Files: `packages/client/src/hydration.js` method `renderVirtualElement()` (lines 457-514)
- Why fragile: Hardcoded void elements list, attribute escaping only for quotes, no handling for data attributes with special values
- Safe modification: Centralize void element list, use comprehensive attribute escaping, handle event attribute stripping
- Test coverage: Not explicitly tested, relies on integration tests

**Event Handler Binding:**
- Files: `packages/client/src/hydration.js` `attachFunctionEventListeners()` (lines 1017-1170)
- Why fragile: Complex state and setState binding with context switching between components, multiple registry lookups
- Safe modification: Simplify handler wrapper by pre-binding state in instance creation, reduce registry complexity
- Test coverage: Basic tests exist, missing: duplicate handler prevention, nested component event bubbling, setState consistency

**Route Matching with Double-Slash Handling:**
- Files: `packages/api/src/router.js` line 1266 marked with "NEW_FIX_DEBUG: This is our fix for double slashes"
- Why fragile: Comment suggests recent fix for edge case, indicates potential regression risk
- Safe modification: Add specific test case for double-slash routes, document why fix was needed, add regression test to CI
- Test coverage: Needs explicit test case for this scenario

**Database Transaction Fallback Logic:**
- Files: `packages/database/src/migration.js` lines 77-78 has fallback: `const tx = this.db.transaction ? await this.db.transaction() : this.db;`
- Why fragile: Silent fallback if transaction method doesn't exist, could cause data inconsistency if rollback needed
- Safe modification: Throw error if transactions required but not available, make transaction support a feature flag
- Test coverage: Need test for non-transactional database behavior

## Scaling Limits

**Session/State Storage:**
- Current capacity: In-memory Maps and WeakMaps with no size limits
- Limit: Application will consume unbounded memory as more components hydrate and state accumulates
- Scaling path: Implement storage abstraction (localStorage, IndexedDB, server-side), add eviction policy, periodically prune unused state

**Rate Limit Store:**
- Current capacity: Single Map grows with each unique IP/route combination
- Limit: Memory usage grows O(n) where n = unique IPs × unique routes across application lifetime
- Scaling path: Implement time-windowed store with automatic expiration, use Redis for multi-process scenarios, add configurable size limits

**Route Registry:**
- Current capacity: `COMPONENT_REGISTRY` Map in component system holds all components
- Limit: All components loaded at startup, no lazy loading mechanism
- Scaling path: Implement code splitting at route level, lazy register components on demand, implement component unloading

**Event Registry:**
- Current capacity: `window.__coherentActionRegistry` and `window.__coherentEventRegistry` grow with page actions
- Limit: Unbounded memory growth if many dynamic event handlers registered
- Scaling path: Implement handler pooling, weak references for handler cleanup, time-based handler expiration

## Dependencies at Risk

**commander (CLI dependency):**
- Risk: Major version at ^12.1.0, known breaking changes between major versions
- Impact: CLI breaks on `pnpm install` if commander releases v13+ due to caret range
- Migration plan: Pin to exact version or use `^12.1.0` with explicit compatibility testing in CI

**glob (File matching):**
- Risk: Pinned to exact version 11.1.0, no patch updates will be applied
- Impact: Security fixes in glob not applied automatically
- Migration plan: Use caret range `^11.1.0` and test updates in staging before release

**Peer Dependency Flexibility:**
- Risk: Some packages declare broad peer dependency ranges (e.g., `express ">=4.18.0 < 6.0.0"`)
- Impact: Compatibility issues if dependencies release with breaking API changes
- Migration plan: Test against min and max declared versions in CI matrix, pin major version in examples

## Missing Critical Features

**No Key-Based Reconciliation:**
- Problem: List updates always trigger full child re-renders since algorithm uses array indices not keys
- Blocks: Efficient list rendering, animations on list items, preserving input focus in lists
- Priority: High - affects performance of common use case

**No Transaction Support Detection:**
- Problem: Database layer silently falls back to non-transactional operations
- Blocks: Atomicity guarantees, data consistency in multi-step operations
- Priority: High - potential data corruption

**No Hydration Error Recovery:**
- Problem: If hydration fails mid-process, component may be left in partially-hydrated state
- Blocks: Graceful degradation, debugging failed hydrations
- Priority: Medium - affects production stability

**No Stream Rendering Support:**
- Problem: Hydration waits for entire component tree before mounting
- Blocks: Progressive rendering, Suspense-like patterns, faster initial paint
- Priority: Medium - performance optimization for large apps

## Test Coverage Gaps

**Client-Side Routing Edge Cases:**
- What's not tested: Route transitions during ongoing requests, parameterized route matching with special characters, nested routing scenarios
- Files: `packages/client/src/router.js`, `packages/client/test/routing.test.js`
- Risk: Silent failures in route matching, navigation loops, missed route guards
- Priority: High

**Database Migration Rollback:**
- What's not tested: Rollback scenarios with partial failures, rollback of dependent migrations, migration dependencies detection
- Files: `packages/database/src/migration.js`, `packages/database/test/database/migration.test.js`
- Risk: Database left in inconsistent state after failed migration, data loss
- Priority: High

**Form Validation with Nested Objects:**
- What's not tested: Deep object validation, circular reference handling in schemas, performance with large nested structures
- Files: `packages/forms/src/validation.js`, `packages/forms/test/forms.test.js`
- Risk: Validation bypass with carefully crafted payloads, stack overflow on circular structures
- Priority: High

**API Router with Complex Middleware Chains:**
- What's not tested: Error propagation through middleware, middleware ordering effects, conditional middleware execution
- Files: `packages/api/src/router.js`, `packages/api/test/api-edge-cases.test.js`
- Risk: Requests bypass security middleware, error handlers not invoked, unexpected state pollution
- Priority: Medium

**Performance Monitor Accuracy:**
- What's not tested: Timing accuracy under high load, memory leak detection effectiveness, false positives in metrics
- Files: `packages/core/src/performance/monitor.js`, `packages/core/test/performance-monitor.test.js`
- Risk: Performance regressions missed, misleading metrics cause wrong optimization targets
- Priority: Medium

**Component Lifecycle with Multiple Renders:**
- What's not tested: Lifecycle hook order with forced re-renders, cleanup during rapid mount/unmount cycles, memory leaks from uncanceled effects
- Files: `packages/core/src/components/lifecycle.js`, `packages/core/test/error-boundary.test.js`
- Risk: Resource leaks, inconsistent component state, race conditions
- Priority: Medium

---

*Concerns audit: 2026-01-21*
