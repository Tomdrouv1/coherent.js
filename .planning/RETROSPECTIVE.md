# Coherent.js — Retrospective

A living log of what worked, what didn't, and what patterns emerged across milestones. Updated at every milestone completion.

---

## Milestone: v1.0 — Stabilization

**Shipped:** 2026-05-25
**Phases:** 6 | **Plans:** 20 | **Requirements:** 32/32

### What Was Built

A stable rendering pipeline (defensive inputs, HTML nesting validation, key-based reconciliation), a clean hydration system (event delegation, base64 state, mismatch detection, control-object API), a consolidated CLI scaffolder with import-audit tests, a client-side HMR system with state preservation and Shadow-DOM error overlay, strict per-element TypeScript types with `expectTypeOf` regression tests across every package, and an LSP + bundled VS Code extension.

### What Worked

- **Sequencing was the win.** Foundation → Hydration → CLI → HMR → Types → IDE held strictly. Each phase consumed the previous phase's stability and nothing was rebuilt later.
- **Two-template CLI.** Reducing from N×M permutations to `basic` + `fullstack` cut maintenance and made the 18-permutation matrix test feasible.
- **`expectTypeOf` + `@ts-expect-error`.** Compile-time regression coverage caught silent type drift that runtime tests would never see.
- **Shadow-DOM HMR overlay.** Style isolation prevented every "the overlay broke my CSS" bug we would have shipped otherwise.
- **Bundled LSP inside the extension.** Avoided npm resolution headaches and made the extension work offline.
- **Audit-before-archive.** The milestone audit caught 2/47 integration soft-misses and clarified 6 human-verification items before they became surprises.

### What Was Inefficient

- **Legacy `hydration.js` retained.** Backward-compat was the right call mid-milestone, but ~1850 lines now sit alongside the new modular hydration and have to be removed in v1.1.
- **Marketplace publish deferred.** The extension is ready but unshipped to end users — IDE-04's "published" criterion was relaxed to "VSIX ready".
- **HMR is client-only.** A dev-server integration is still needed for full end-to-end behavior; client-side wiring alone can't be exercised in a browser without it.
- **Browser-environment verification deferred.** 6 hands-on checks (visual hydration, real interaction event delegation, mismatch output quality, end-to-end HMR, form-state preservation, connection indicator) skipped during execution and folded into v1.1 todo.
- **Wall-clock vs. exec-time gap.** 3 days of planned work stretched across 4 months due to CI/build housekeeping (Node matrix, pnpm policy, glob upgrade, bundle baselines, recursive-build fixes). Not a milestone failure — just a reminder that "done" and "shippable in a clean repo" are different.

### Patterns Established

- **Phase = goal-scoped vertical slice.** Each phase declares Requirements + Success Criteria up front; plans deliver those, audits verify.
- **Per-plan `*-SUMMARY.md` with dependency graph.** `requires` / `provides` / `affects` blocks make cross-phase dependencies queryable.
- **Verification artifact per phase.** Every phase ends with `*-VERIFICATION.md` before the next begins.
- **Audit + integration check before milestone close.** The pair (`v1-MILESTONE-AUDIT.md` + `v1-INTEGRATION-CHECK.md`) is what made completion confident, not just complete.
- **Defensive validation at boundaries only.** Renderer validates inputs once; internal layers trust each other. Kept the diff loop fast.

### Key Lessons

1. **Sequence the foundation before the polish.** Rendering had to be correct before hydration could work; hydration had to be stable before HMR could preserve state. Resist the pull to start with DX.
2. **Backward-compat costs are real.** Keeping `hydration.js` was correct in the moment but it now blocks a clean v1.1. Plan a deprecation path the moment you decide to keep a legacy.
3. **Audit gates beat hope.** The pre-archive audit's "6 human verification items" surfaced gaps the team would otherwise have called PASS on.
4. **Bundle the runtime when you can.** Bundled LSP in the extension is simpler than the npm-resolution alternative — applies to any tool whose runtime is a moving target.
5. **Type tests are tests.** `expectTypeOf` caught regressions that no runtime suite could. Worth the setup cost on every typed package.
6. **CI housekeeping has its own milestone shape.** The 4-month stretch of post-milestone fix commits suggests CI/build maintenance deserves its own small phase or recurring chore loop instead of riding outside the GSD workflow.

### Cost Observations

- Sessions: not tracked (consider enabling for v1.1)
- Model mix: not tracked (consider enabling for v1.1)
- Notable: planned execution was tight (3 days). Wall-clock cost lived in post-milestone CI/build housekeeping, which never entered the GSD plan/execute loop. Worth either pulling it into a phase or formalizing a separate "maintenance" track.

---

## Cross-Milestone Trends

*(Populated as more milestones complete.)*

| Milestone | Phases | Plans | Reqs | Audit | Notes |
|-----------|--------|-------|------|-------|-------|
| v1.0 Stabilization | 6 | 20 | 32/32 | PASSED (45/47) | First milestone; established phase template + audit gate |
