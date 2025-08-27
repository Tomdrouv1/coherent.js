import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherentjs/database',
  entryPoint: '../../src/database/index.js',
  external: ['@coherentjs/core', 'sqlite3', 'mysql2', 'pg', 'mongodb']
});
