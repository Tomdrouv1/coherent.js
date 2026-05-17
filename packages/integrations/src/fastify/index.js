// src/fastify/index.js
//
// Public entry point for @coherent.js/integrations/fastify. Re-exports the
// full runtime surface from coherent-fastify.js so the runtime matches the
// TypeScript declarations in ../../types/fastify/index.d.ts.

export {
  coherentFastify,
  createHandler,
  setupCoherent
} from './coherent-fastify.js';

export { default } from './coherent-fastify.js';
