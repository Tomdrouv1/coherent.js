import { buildBrowserPackage } from '../../scripts/shared-build.mjs';

await buildBrowserPackage({
  packageName: '@coherentjs/client',
  entryPoint: 'src/hydration.js'
});
