# @coherent.js/adapters

Framework adapters for Coherent.js, providing seamless integration with popular web frameworks.

## Supported Frameworks

- **Astro** - Full SSR integration
- **Remix** - Loader and component adapters  
- **SvelteKit** - Adapter and preprocessor

## Installation

```bash
npm install @coherent.js/adapters
```

## Usage

### Astro Integration

```js
import { createAstroIntegration } from '@coherent.js/adapters/astro';

export default {
  integrations: [
    createAstroIntegration()
  ]
};
```

### Remix Adapter

```js  
import { createRemixAdapter } from '@coherent.js/adapters/remix';

const adapter = createRemixAdapter();
```

### SvelteKit Adapter

```js
import { createSvelteKitAdapter } from '@coherent.js/adapters/sveltekit';

export default {
  kit: {
    adapter: createSvelteKitAdapter()
  }
};
```