// src/koa/index.js
//
// Public entry point for @coherent.js/integrations/koa. Re-exports the full
// runtime surface from coherent-koa.js so the runtime matches the legacy
// @coherent.js/koa export shape.
//
// Koa must be installed as a peer dependency to use this integration.
//
// Usage:
//   import { setupCoherent } from '@coherent.js/integrations/koa';

export {
  coherentKoaMiddleware,
  createHandler,
  setupCoherent,
  createKoaIntegration
} from './coherent-koa.js';

export { default } from './coherent-koa.js';
