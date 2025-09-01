import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/core',
  entryPoint: './src/index.js',
  external: []
});
