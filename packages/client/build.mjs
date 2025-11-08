import { buildBrowserPackage } from '../../scripts/shared-build.mjs';

await buildBrowserPackage({
  packageName: '@coherent.js/client',
  entryPoint: 'src/hydration.js'
});
