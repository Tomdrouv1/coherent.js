/**
 * Koa.js integration for Coherent.js
 * 
 * This module provides Koa.js integration for Coherent.js.
 * Koa must be installed as a peer dependency to use this integration.
 * 
 * Installation:
 * npm install koa
 * 
 * Usage:
 * import { createKoaIntegration } from '@coherent.js/core/koa';
 */

export {
  coherentKoaMiddleware,
  createHandler,
  setupCoherent,
  createKoaIntegration
} from './coherent-koa.js';

export { default } from './coherent-koa.js';
