import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/nextjs',
  entryPoint: 'src/index.js',
  external: ['@coherent.js/core', 'next', 'react', 'react-dom']
});
