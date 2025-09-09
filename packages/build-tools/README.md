# @coherentjs/build-tools

Build tool integrations for Coherent.js, providing seamless integration with popular bundlers and build systems.

## Supported Build Tools

- **Vite** - Plugin and configuration helpers
- **Webpack** - Loader and plugin integration
- **Rollup** - Plugin for component bundling

## Installation

```bash
npm install @coherentjs/build-tools
```

## Usage

### Vite Integration

```js
import { createVitePlugin } from '@coherentjs/build-tools/vite';

export default {
  plugins: [
    createVitePlugin()
  ]
};
```

### Webpack Integration

```js
import { CoherentLoader } from '@coherentjs/build-tools/webpack';

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
import { createRollupPlugin } from '@coherentjs/build-tools/rollup';

export default {
  plugins: [
    createRollupPlugin()
  ]
};
```