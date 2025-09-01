import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/fastify',
  entryPoint: 'src/coherent-fastify.js',
  external: ['@coherentjs/core', 'fastify']
});
