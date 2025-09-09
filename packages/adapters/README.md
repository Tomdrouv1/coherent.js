# @coherentjs/adapters

Framework adapters for Coherent.js, providing seamless integration with popular web frameworks.

## Supported Frameworks

- **Astro** - Full SSR integration
- **Remix** - Loader and component adapters  
- **SvelteKit** - Adapter and preprocessor

## Installation

```bash
npm install @coherentjs/adapters
```

## Usage

### Astro Integration

```js
import { createAstroIntegration } from '@coherentjs/adapters/astro';

export default {
  integrations: [
    createAstroIntegration()
  ]
};
```

### Remix Adapter

```js  
import { createRemixAdapter } from '@coherentjs/adapters/remix';

const adapter = createRemixAdapter();
```

### SvelteKit Adapter

```js
import { createSvelteKitAdapter } from '@coherentjs/adapters/sveltekit';

export default {
  kit: {
    adapter: createSvelteKitAdapter()
  }
};
```