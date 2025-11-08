import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/koa',
  entryPoint: 'src/index.js',
  external: ['@coherent.js/core', 'koa']
});
