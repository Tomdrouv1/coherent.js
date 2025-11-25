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


## Exports

Framework adapters

### Modular Imports (Tree-Shakable)

- Adapter utilities: `@coherent.js/adapters`

### Example Usage

```javascript
import { createAdapter } from '@coherent.js/adapters';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
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