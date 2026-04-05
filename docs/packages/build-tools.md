# Build Tools

`@coherent.js/build-tools` provides bundler plugins and build utilities for integrating Coherent.js into your existing build pipeline. Supports Vite, Webpack, and Rollup.

## Installation

```bash
pnpm add -D @coherent.js/build-tools
```

## Basic Usage

### Vite

```javascript
// vite.config.js
import { createVitePlugin } from '@coherent.js/build-tools';

export default {
  plugins: [createVitePlugin()]
};
```

An SSR-specific plugin is also available:

```javascript
import { createSSRPlugin } from '@coherent.js/build-tools/vite';

export default {
  plugins: [createVitePlugin(), createSSRPlugin()]
};
```

### Webpack

```javascript
// webpack.config.js
import { createWebpackPlugin } from '@coherent.js/build-tools';

export default {
  plugins: [createWebpackPlugin()]
};
```

Use the loader for `.coherent.js` files:

```javascript
import { coherentLoader } from '@coherent.js/build-tools';

// webpack.config.js
export default {
  module: {
    rules: [
      { test: /\.coherent\.js$/, use: 'coherent-loader' }
    ]
  }
};
```

### Rollup

```javascript
// rollup.config.js
import { createRollupPlugin } from '@coherent.js/build-tools';

export default {
  plugins: [createRollupPlugin()]
};
```

## API Reference

### Plugins

| Function | Description |
|---|---|
| `createVitePlugin(options?)` | Vite plugin that handles `.coherent.js` files |
| `createSSRPlugin(options?)` | Vite plugin for SSR bundle generation |
| `createWebpackPlugin(options?)` | Webpack plugin (also available as `CoherentWebpackPlugin` class) |
| `createRollupPlugin(options?)` | Rollup plugin for `.coherent.js` resolution and transformation |
| `coherentLoader(source)` | Webpack loader for transforming Coherent.js component files |

### Utilities

| Function | Description |
|---|---|
| `optimizeComponents(components)` | Optimize a set of components for production |
| `generateManifest(components)` | Generate a build manifest with component names, version, and timestamp |
| `createAssetMap(assets)` | Create a `Map` from an array of `{ id, ... }` asset objects |

## Known Limitations

- The plugins detect `.coherent.js` files by extension but currently pass through code without transformation. Actual component compilation is planned for a future release.
- `coherentLoader` delegates to an internal `transformCoherentComponent` function that is a no-op in the current version.
- `optimizeComponents` returns components unchanged; optimization logic is not yet implemented.
