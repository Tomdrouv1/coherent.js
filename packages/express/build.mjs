import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/express',
  entryPoint: 'src/index.js',
  external: ['@coherentjs/core', 'express']
});
