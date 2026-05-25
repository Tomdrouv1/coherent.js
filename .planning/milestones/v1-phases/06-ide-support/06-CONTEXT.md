# Phase 6: IDE Support - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

VS Code provides intelligent autocomplete, go-to-definition, and error highlighting for Coherent.js component syntax. Includes a separate LSP server for other editors.

</domain>

<decisions>
## Implementation Decisions

### Autocomplete scope
- Tag-aware autocomplete: div gets div attributes, input gets input attributes
- Event handlers included with proper type inference (MouseEvent, FormEvent, etc.)
- Claude's discretion: trigger behavior and nesting depth

### Error highlighting
- All detectable errors: invalid tags, wrong attribute types, invalid nesting, type mismatches
- Full HTML nesting validation (flag invalid nesting like `<p><div>` before runtime)
- Tiered severity: errors (red) for breaking issues, warnings (yellow) for suboptimal patterns
- Presentation: inline squiggles + VS Code Problems panel integration

### Extension distribution
- VS Code extension + separate LSP server
- LSP distributed as npm package: `@coherent.js/language-server`
- VS Code extension auto-installs LSP package if missing
- Extension name: "Coherent.js Language Support"

### Editor integration UX
- Hover shows TypeScript type + description from JSDoc
- Code snippets for common patterns (component structure, children array)
- Quick fixes offered for detected errors ("Add key prop", "Fix nesting", etc.)
- Full go-to-definition: Ctrl+Click on component name navigates to definition file

### Claude's Discretion
- Autocomplete trigger behavior (object property position vs. after tagName)
- Autocomplete nesting depth limit based on performance
- Specific snippet prefixes and structures
- LSP protocol version and initialization sequence

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-ide-support*
*Context gathered: 2026-01-22*
