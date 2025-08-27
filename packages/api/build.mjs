import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/api',
  entryPoint: '../../src/api/index.js',
  external: ['@coherentjs/core']
});
