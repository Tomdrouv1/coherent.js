import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/nextjs',
  entryPoint: 'src/index.js',
  external: ['@coherentjs/core', 'next', 'react', 'react-dom']
});
