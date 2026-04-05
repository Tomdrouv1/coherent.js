# Adapters (Experimental)

> **Status: Alpha** -- These adapters are experimental. APIs may change between releases.

`@coherent.js/adapters` provides integration adapters for modern meta-frameworks: Astro, Remix, and SvelteKit. Each adapter bridges framework-specific conventions with Coherent.js rendering.

## Installation

```bash
pnpm add @coherent.js/adapters
```

## Astro

```javascript
// astro.config.mjs
import { createAstroIntegration } from '@coherent.js/adapters';

export default {
  integrations: [createAstroIntegration()]
};
```

Render a Coherent.js component inside an Astro page:

```javascript
import { renderComponent } from '@coherent.js/adapters/astro';

const html = await renderComponent(MyComponent, props);
```

## Remix

```javascript
import { createRemixAdapter, withCoherent } from '@coherent.js/adapters/remix';

const adapter = createRemixAdapter();

// Use as a loader
export const loader = adapter.createLoader(MyComponent);

// Or wrap a component
export default withCoherent(MyComponent);
```

## SvelteKit

```javascript
import { createSvelteKitAdapter, createPreprocessor } from '@coherent.js/adapters/sveltekit';

const adapter = createSvelteKitAdapter();
const html = adapter.renderComponent(MyComponent, props);

// Optional: SvelteKit preprocessor
const preprocessor = createPreprocessor();
```

## API Reference

### Astro

| Export | Description |
|---|---|
| `createAstroIntegration(options?)` | Returns an Astro integration that registers a Coherent.js renderer |
| `renderComponent(component, props)` | Render a Coherent.js component to HTML |

### Remix

| Export | Description |
|---|---|
| `createRemixAdapter(options?)` | Returns `{ renderComponent, createLoader }` |
| `withCoherent(Component)` | HOF that wraps a Coherent.js component for use as a Remix component |

### SvelteKit

| Export | Description |
|---|---|
| `createSvelteKitAdapter(options?)` | Returns `{ name, renderComponent }` |
| `createPreprocessor(options?)` | Returns a SvelteKit preprocessor for `.coherent.js` markup |

## Known Limitations

- All adapters delegate to `@coherent.js/core`'s `render()` function; framework-specific features like streaming or suspense are not yet supported.
- The Astro integration registers a renderer entry point (`astro/server.js`) that is not yet bundled.
- The SvelteKit preprocessor is a pass-through and does not transform content.
- These adapters are separate from the established Express, Fastify, Koa, and Next.js integrations which live in their own packages.
