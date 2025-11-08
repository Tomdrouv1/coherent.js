/**
 * Next.js integration for Coherent.js
 * 
 * This module provides Next.js integration for Coherent.js.
 * Next.js and React must be installed as peer dependencies to use this integration.
 * 
 * Installation:
 * npm install next react
 * 
 * Usage:
 * import { createNextIntegration } from '@coherent.js/core/nextjs';
 */

export {
  createCoherentNextHandler,
  createCoherentAppRouterHandler,
  createCoherentServerComponent,
  createCoherentClientComponent,
  createNextIntegration
} from './coherent-nextjs.js';

export { default } from './coherent-nextjs.js';
