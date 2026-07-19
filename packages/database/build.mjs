import { buildPackage } from '../../scripts/shared-build.mjs';

await buildPackage({
  packageName: '@coherent.js/database',
  entries: {
    index: 'src/index.js',
    model: 'src/model.js',
    migration: 'src/migration.js',
    'connection-manager': 'src/connection-manager.js',
    middleware: 'src/middleware.js'
  },
  external: ['@coherent.js/core', 'sqlite3', 'mysql2', 'pg', 'mongodb']
});
