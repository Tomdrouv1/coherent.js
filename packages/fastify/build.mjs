import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/fastify',
  entryPoint: 'src/coherent-fastify.js',
  external: ['@coherent.js/core', 'fastify']
});
