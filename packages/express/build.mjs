import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/express',
  entryPoint: '../../src/express/index.js',
  external: ['@coherentjs/core', 'express']
});
