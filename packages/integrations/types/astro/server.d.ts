// Type definitions for the Coherent.js Astro server entrypoint
// (../../src/astro/server.js): Astro imports its default export as the
// SSR renderer.

import type { CoherentAstroRenderer } from './index.js';

declare const renderer: CoherentAstroRenderer;

export default renderer;
