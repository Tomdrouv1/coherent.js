# Feature Landscape: SSR Framework Maturity

**Domain:** JavaScript SSR Framework Developer Experience
**Researched:** 2026-01-21
**Confidence:** HIGH (verified against multiple framework documentation sources)

## Executive Summary

Based on analysis of Next.js, Nuxt, SvelteKit, Remix, and Astro, this document maps the feature landscape for mature SSR frameworks. Coherent.js's core issues (broken CLI generators, non-functional HMR, incomplete TypeScript, no IDE support) represent gaps in **table stakes** features - the absolute baseline expected by developers in 2025/2026.

The primary insight: developers today expect **zero-friction onboarding**. They run `npx create-[framework]`, get a working app in under 5 minutes, make changes with instant HMR feedback, and have full IDE support from day one. Anything less feels broken.

---

## Table Stakes

Features users expect as baseline. Missing = framework feels incomplete or unusable.

| Feature | Why Expected | Complexity | Current State in Coherent.js |
|---------|--------------|------------|------------------------------|
| **Working CLI scaffolding** | First-contact experience; users judge framework in first 5 minutes | Medium | BROKEN - produces outdated/broken code |
| **Functional HMR** | Sub-second feedback loop is standard since 2020 | High | NOT WORKING |
| **TypeScript support (zero-config)** | TS is default in all major frameworks; ~80% of new projects use it | Medium | INCOMPLETE definitions |
| **IDE IntelliSense** | Developers expect autocomplete, error highlighting without setup | High | NONE |
| **Error overlay in development** | Visual error display with stack traces is universal | Medium | Unknown |
| **File-based routing** | Convention in Next.js, Nuxt, SvelteKit, Astro since 2020 | Medium | Not applicable (object-based) |
| **Development server with auto-restart** | Basic nodemon/vite behavior expected | Low | EXISTS but unreliable |
| **Package manager support (npm/pnpm/yarn)** | All three are mainstream | Low | EXISTS |
| **ESLint/Prettier integration** | Code quality tooling expected in scaffolded projects | Low | EXISTS |
| **Environment variable handling** | .env support is universal | Low | EXISTS |
| **Production build command** | Single command to build optimized output | Medium | EXISTS |
| **Basic documentation** | Getting started, API reference | Medium | EXISTS (website) |

### Critical Table Stakes Details

#### 1. CLI Scaffolding That Works

**What mature frameworks provide:**
- `npx create-next-app` - TypeScript, Tailwind, ESLint preconfigured by default (Next.js 16)
- `npm create nuxt` - Auto-imports, Vite, TypeScript zero-config
- `npx sv create` - Interactive wizard with add-ons for DB, auth, i18n
- All produce **immediately runnable** projects

**Why critical:**
- First impression forms in <5 minutes
- Broken scaffolding = developers leave immediately
- Must work with `--skip-prompts` for CI/automation

**Verification:** Ran searches confirming all major frameworks now scaffold TypeScript-first projects that work out of the box.

Sources:
- [Next.js CLI Documentation](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- [SvelteKit Creating a Project](https://svelte.dev/docs/kit/creating-a-project)
- [Nuxt Starter](https://github.com/nuxt/starter)

#### 2. Hot Module Replacement (HMR)

**What mature frameworks provide:**
- Next.js 16: Turbopack by default, 5-10x faster Fast Refresh
- Nuxt 4: Vite-powered HMR, socket-based communication
- SvelteKit: Vite-powered, sub-100ms updates
- Remix: HMR + Hot Data Revalidation (HDR) for server code

**Why critical:**
- Developers expect sub-second feedback
- State preservation during edits
- Without HMR, DX feels like 2015

**Technical approach:**
- All use Vite or Turbopack as bundler
- WebSocket connection to dev server
- Module graph invalidation

Sources:
- [Next.js Dev Environment Guide](https://nextjs.org/docs/app/guides/local-development)
- [Nuxt 4 Announcement](https://nuxt.com/blog/v4)
- [Remix HMR Discussion](https://github.com/remix-run/remix/discussions/2384)

#### 3. TypeScript Zero-Config

**What mature frameworks provide:**
- Next.js: `--ts` flag, auto-generated tsconfig, typed routes via `next typegen`
- Nuxt: Zero-config TS, auto-generated types, separate tsconfigs per context (app/server/shared)
- SvelteKit: Auto-generated `./$types` folder with route-specific types
- Astro: TypeScript by default, `astro check` CLI for type-checking

**Why critical:**
- TypeScript is now the default, not optional
- Auto-generated types prevent manual type maintenance burden
- Route typing prevents runtime errors

Sources:
- [Next.js TypeScript Documentation](https://nextjs.org/docs/app/api-reference/cli/next)
- [Nuxt 4 TypeScript Setup](https://nuxt.com/blog/v4)
- [SvelteKit TypeScript Showcase](https://github.com/ivanhofer/sveltekit-typescript-showcase)
- [Astro TypeScript Guide](https://docs.astro.build/en/guides/typescript/)

#### 4. IDE/Language Server Support

**What mature frameworks provide:**
- VS Code extensions for all major frameworks (official)
- IntelliSense for component props, routes, configuration
- Go-to-definition for components and imports
- Syntax highlighting for framework-specific files

**Why critical:**
- Developers spend 80%+ time in IDE
- Missing autocomplete = constant documentation lookups
- Error squiggles catch bugs before runtime

**Technical approach:**
- Language Server Protocol (LSP) implementation
- TypeScript Language Server integration
- Custom syntax support for framework-specific constructs

Sources:
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
- [Angular Language Server Approaches](https://blog.jetbrains.com/webstorm/2025/03/the-angular-language-server-understanding-ide-integration-approaches/)

---

## Differentiators

Features that set frameworks apart. Not expected, but highly valued when present.

| Feature | Value Proposition | Complexity | Framework Examples |
|---------|-------------------|------------|-------------------|
| **In-browser DevTools** | Visual debugging, component tree, performance metrics | High | Nuxt DevTools, React DevTools |
| **Codemods for migrations** | Automated upgrade path between versions | High | Next.js @next/codemod |
| **Server Components** | Reduced client JS, better performance | Very High | Next.js RSC, Remix |
| **Streaming SSR** | Faster TTFB, progressive rendering | High | Next.js, Remix, SvelteKit |
| **Edge deployment support** | Global low-latency deployment | Medium | Vercel, Cloudflare Workers |
| **Built-in API routes** | Full-stack in one project | Medium | All major frameworks |
| **Type-safe data fetching** | End-to-end type safety | High | SvelteKit load(), tRPC |
| **Database integrations** | ORM/adapter scaffolding | Medium | SvelteKit (Prisma), Nuxt modules |
| **Auth scaffolding** | Pre-built auth flows | Medium | SvelteKit, Nuxt Auth |
| **Component playground** | Interactive component documentation | Medium | Storybook integration |
| **AI-assisted development** | MCP integration, AI coding assistants | High | Next.js DevTools MCP (2026) |
| **Testing utilities** | Framework-specific test helpers | Medium | Nuxt testing utils, Vitest integration |

### Differentiator Details

#### 1. In-Browser DevTools

**What Nuxt provides:**
- Component tree inspector with source links
- Routes/pages visualization
- Auto-imports browser
- VS Code embedded in DevTools
- Performance profiling
- Module ecosystem (Vitest UI, TailwindCSS viewer, VueUse search)

**Value:** Dramatically faster debugging, especially for unfamiliar codebases.

**For Coherent.js:** Already has `@coherent.js/devtools` package with inspector, profiler, logger. Could differentiate by building browser DevTools panel.

Sources:
- [Nuxt DevTools Features](https://devtools.nuxt.com/guide/features)
- [Nuxt DevTools v1.0](https://nuxt.com/blog/nuxt-devtools-v1-0)

#### 2. Codemods for Migrations

**What Next.js provides:**
- `npx @next/codemod <transform> <path>`
- Automated migration for API changes
- Async dynamic API transforms
- TypeScript-aware transformations

**Value:** Reduces version upgrade from days to hours.

**For Coherent.js:** Not immediately needed (v1.0), but plan architecture to support future codemods.

Sources:
- [Next.js Codemods Guide](https://nextjs.org/docs/app/guides/upgrading/codemods)
- [Codemod.com](https://codemod.com/)

#### 3. Streaming SSR

**What mature frameworks provide:**
- Progressive HTML delivery
- Suspense boundaries for streaming
- Better Time to First Byte (TTFB)

**For Coherent.js:** Already has `@coherent.js/performance` package - streaming could be differentiator.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Over-abstracted configuration** | Hides what's happening, breaks debugging | Expose clear config files (vite.config.js, tsconfig.json) |
| **Magic auto-imports everywhere** | Confuses IDE, makes code harder to understand | Explicit imports, or very limited auto-import scope |
| **Mandatory build step for dev** | Kills developer feedback loop | HMR/hot reload without rebuild |
| **Monolithic CLI with hidden state** | Hard to debug, non-composable | Transparent commands, clear file outputs |
| **Breaking changes without codemods** | Forces manual migration, frustrates users | Provide migration tooling or maintain backwards compatibility |
| **Opaque error messages** | Developers waste time debugging framework vs. their code | Actionable errors with fix suggestions |
| **Implicit routing magic** | Hard to debug why routes don't match | Clear documentation of routing rules |
| **Heavy runtime dependency** | Large bundle sizes, slow startup | Compile-time optimization (Astro/Svelte approach) |
| **Sync-only development server** | Blocks on large operations | Async operations, streaming responses |
| **Global CLI state** | Conflicts between projects | Project-local configuration |

### Anti-Feature Details

#### 1. Opaque Error Messages

**The problem:**
Generic errors like "Something went wrong" or stack traces pointing to framework internals rather than user code.

**What mature frameworks do:**
- Next.js: Development overlay shows exact file, line, with code snippet
- Nuxt: DevTools highlights component causing error
- All: Suggest fixes when error is recognizable

**For Coherent.js:** Already has `@coherent.js/devtools` enhanced-errors module. Ensure it surfaces actionable information.

#### 2. Over-abstracted Configuration

**The problem:**
Configuration buried in framework internals, no clear way to customize.

**What mature frameworks do:**
- Expose standard config files (vite.config.js, tsconfig.json)
- Documentation on overriding defaults
- `eject` or `customize` commands if needed

**For Coherent.js:** Ensure scaffolded projects have clear, documented config files.

#### 3. Mandatory Build Step for Development

**The problem:**
Requiring full rebuild to see changes (like older webpack setups).

**What causes this:**
- No file watcher
- No HMR implementation
- Transformations done at build time only

**For Coherent.js:** Current dev server falls back to nodemon, which restarts entire process. True HMR needed.

---

## Feature Dependencies

Understanding which features must come before others.

```
Foundation Layer (must have first):
  CLI Scaffolding (working) ─────────────────────────────┐
                                                          │
  TypeScript Support ────────┬──────────────────────────────> IDE Support
                             │                             │
  HMR Infrastructure ────────┴──────> Dev Server ──────────┘
                                           │
                                           v
                              Error Overlay / DevTools
                                           │
                                           v
                              Testing Utilities
                                           │
                                           v
                              Codemods (future versions)
```

**Critical path for Coherent.js:**
1. Fix CLI scaffolding first (immediate unblock)
2. Implement HMR (development experience)
3. Complete TypeScript definitions (IDE support enabler)
4. Add Language Server (IDE integration)
5. Build DevTools (debugging experience)

---

## MVP Recommendation

For Coherent.js to be viable as a framework developers will choose:

### Phase 1: Foundation (Critical/Blocking)

**Must fix immediately:**
1. CLI scaffolding produces working code
2. HMR actually works
3. TypeScript definitions are complete

These are **blockers**. Without them, framework is not usable.

### Phase 2: Developer Experience

**Strong expectation:**
4. Language server with basic IntelliSense
5. Error overlay in development
6. Comprehensive getting-started documentation

### Phase 3: Differentiators

**Defer to post-MVP:**
- In-browser DevTools (have CLI devtools first)
- Streaming SSR (have basic SSR working first)
- Codemods (needed for v2, not v1)
- AI integration (bleeding edge, not table stakes)

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| CLI scaffolding is table stakes | HIGH | All frameworks (Next, Nuxt, SvelteKit, Remix, Astro) provide this |
| HMR is expected | HIGH | Universal since 2020, Vite/Turbopack standard |
| TypeScript zero-config expected | HIGH | All frameworks scaffold TS by default |
| IDE support is expected | HIGH | Official VS Code extensions for all frameworks |
| In-browser DevTools is differentiator | HIGH | Only Nuxt has full DevTools, others use React/Vue DevTools |
| Codemods needed for maturity | MEDIUM | Next.js provides them, others vary |
| Streaming SSR differentiates | MEDIUM | Not all users need it, but shows framework sophistication |

---

## Sources

### Framework Documentation
- [Next.js CLI Documentation](https://nextjs.org/docs/app/api-reference/cli/next)
- [Next.js Development Environment Guide](https://nextjs.org/docs/app/guides/local-development)
- [Nuxt 4.0 Announcement](https://nuxt.com/blog/v4)
- [Nuxt DevTools Features](https://devtools.nuxt.com/guide/features)
- [SvelteKit Creating a Project](https://svelte.dev/docs/kit/creating-a-project)
- [SvelteKit CLI Documentation](https://svelte.dev/docs/cli)
- [Astro TypeScript Guide](https://docs.astro.build/en/guides/typescript/)
- [Astro Development Guide](https://docs.astro.build/en/develop-and-build/)
- [Remix TypeScript Guide](https://v2.remix.run/docs/guides/typescript/)
- [Remix Dev CLI](https://remix.run/docs/en/main/other-api/dev)

### Framework Comparisons
- [Nuxt vs Next.js 2025 - Strapi](https://strapi.io/blog/nuxt-vs-nextjs-framework-comparison-guide)
- [SvelteKit vs Next.js 2025 - Prismic](https://prismic.io/blog/sveltekit-vs-nextjs)
- [Frontend Framework Showdown 2025 - Leapcell](https://leapcell.io/blog/the-2025-frontend-framework-showdown-next-js-nuxt-js-sveltekit-and-astro)

### Developer Experience
- [Developer Experience 2025 - Jellyfish](https://jellyfish.co/library/developer-experience/)
- [Developer Productivity Pain Points - Jellyfish](https://jellyfish.co/library/developer-productivity/pain-points/)
- [Best JavaScript Debugging Tools 2025](https://devtechinsights.com/best-javascript-debugging-tools-2025/)

### Tooling
- [TypeScript Language Server](https://github.com/typescript-language-server/typescript-language-server)
- [Next.js Codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)
- [Codemod Platform](https://codemod.com/)
- [Plop.js Scaffolding](https://blogs.perficient.com/2025/03/20/plop-js-a-micro-generator-framework-introduction-and-installation-part-1/)
