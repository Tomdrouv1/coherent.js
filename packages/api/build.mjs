import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/api',
  entryPoint: 'src/index.js',
  external: ['@coherent.js/core']
});
