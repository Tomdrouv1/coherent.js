# @coherent.js/build-tools

Build tool integrations for Coherent.js, providing seamless integration with popular bundlers and build systems.

## Supported Build Tools

- **Vite** - Plugin and configuration helpers
- **Webpack** - Loader and plugin integration
- **Rollup** - Plugin for component bundling

## Installation

```bash
npm install @coherent.js/build-tools
```


## Exports

Build and development tools

### Modular Imports (Tree-Shakable)

- Build utilities: `@coherent.js/build-tools`

### Example Usage

```javascript
import { buildProject } from '@coherent.js/build-tools';
```

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
## Usage

### Vite Integration

```js
import { createVitePlugin } from '@coherent.js/build-tools/vite';

export default {
  plugins: [
    createVitePlugin()
  ]
};
```

### Webpack Integration

```js
import { CoherentLoader } from '@coherent.js/build-tools/webpack';

export default {
  module: {
    rules: [
      {
        test: /\.coherent\.js$/,
        use: 'coherent-loader'
      }
    ]
  }
};
```

### Rollup Integration

```js
import { createRollupPlugin } from '@coherent.js/build-tools/rollup';

export default {
  plugins: [
    createRollupPlugin()
  ]
};
```