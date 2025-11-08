import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/core',
  entryPoint: './src/index.js',
  external: []
});
