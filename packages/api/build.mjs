import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/api',
  entries: {
    index: 'src/index.js',
    router: 'src/router.js',
    middleware: 'src/middleware.js',
    security: 'src/security.js',
    validation: 'src/validation.js',
    serialization: 'src/serialization.js'
  },
  external: ['@coherent.js/core']
});
