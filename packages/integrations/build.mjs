// @coherent.js/integrations build script.
//
// Sources ship directly from ./src/ via the subpath exports declared in
// package.json — there is no bundling step. This file exists so
// `pnpm --filter @coherent.js/integrations build` (and the shared
// monorepo build) succeed without doing redundant work.
//
// Per the ESM-only project policy (see CLAUDE.md and the Wave-2b
// precedent set by @coherent.js/cli's build-tools subpaths), we do not
// emit a dist/ for the integration adapters. Each subpath import points
// at the original JS source file.
console.log('@coherent.js/integrations: src ships directly, no build required.');
