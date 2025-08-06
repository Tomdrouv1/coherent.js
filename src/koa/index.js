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
 * import { createKoaIntegration } from '@coherentjs/core/koa';
 */

export {
  coherentKoaMiddleware,
  createCoherentKoaHandler,
  setupCoherentKoa,
  createKoaIntegration
} from './coherent-koa.js';

export { default } from './coherent-koa.js';
