# Phase 5: TypeScript - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Provide accurate TypeScript definitions for all public APIs across all packages in the monorepo. Types must match runtime behavior and enable IDE autocomplete, error checking, and go-to-definition. This phase covers type definitions only — language server features and VS Code extension are Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Type strictness
- Strict attribute types per element (className: string, disabled: boolean, etc.)
- Strict children types — only valid child types: string | number | Element | Element[] | null | undefined
- Error on unknown props — typos like 'classname' instead of 'className' are compile errors
- Both null and undefined allowed in children for conditional rendering

### Component type patterns
- Mapped type per tag: { div: DivAttributes, span: SpanAttributes, ... } for accurate per-element attrs
- Custom components support both patterns: explicit Component<Props> AND inference from function signature
- Both object syntax types AND optional createElement helper function for those who prefer it

### Definition structure
- Separate types folder per package (types/render.d.ts, types/hydrate.d.ts, etc.)
- Per-module files mirroring source structure, not single index.d.ts
- Types bundled in package — ship with main package, not separate @types/* package
- Shared types live in @coherent.js/core, other packages import from core

### DX priorities
- All packages need types equally — complete coverage across all packages in this phase
- Catch both component structure errors AND API misuse equally
- Errors first — strict error checking prioritized over autocomplete convenience
- Comprehensive type tests (tsd/expect-type) for all public APIs to catch type/runtime drift

### Claude's Discretion
- Event handler types (DOM Event vs synthetic wrapper) — pick based on runtime behavior
- Exact HTML attribute definitions per element — follow lib.dom.d.ts patterns
- Type complexity tradeoffs — balance strictness with reasonable compile times

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-typescript*
*Context gathered: 2026-01-22*
