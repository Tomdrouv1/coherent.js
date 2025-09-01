import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/koa',
  entryPoint: 'src/index.js',
  external: ['@coherentjs/core', 'koa']
});
