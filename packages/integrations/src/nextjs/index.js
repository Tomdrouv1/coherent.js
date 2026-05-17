// src/nextjs/index.js
//
// Public entry point for @coherent.js/integrations/nextjs. Re-exports the full
// runtime surface from coherent-nextjs.js so the runtime matches the legacy
// @coherent.js/nextjs export shape.
//
// Next.js and React must be installed as peer dependencies to use this
// integration.
//
// Usage:
//   import { createCoherentNextHandler } from '@coherent.js/integrations/nextjs';

export {
  createCoherentNextHandler,
  createCoherentAppRouterHandler,
  createCoherentServerComponent,
  createCoherentClientComponent,
  createNextIntegration
} from './coherent-nextjs.js';

export { default } from './coherent-nextjs.js';
