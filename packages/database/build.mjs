import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/database',
  entryPoint: 'src/index.js',
  external: ['@coherent.js/core', 'sqlite3', 'mysql2', 'pg', 'mongodb']
});
