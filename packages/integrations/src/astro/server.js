// src/astro/server.js
//
// Astro server entrypoint for @coherent.js/integrations/astro.
//
// `createAstroIntegration()` registers this module with `addRenderer({
// serverEntrypoint })`. Astro imports its *default export* as the SSR
// renderer (`{ name, check, renderToStaticMarkup }`), so it must have one —
// without it `astro build` fails with `"default" is not exported`.

import { createRenderer } from './index.js';

export default createRenderer();
