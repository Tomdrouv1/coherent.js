
/**
 * Type definitions for @coherent.js/runtime
 */

export * from '@coherent.js/core';
export * from '@coherent.js/client'; 
export * from '@coherent.js/web-components';

// Runtime environments
export enum RuntimeEnvironment {
  BROWSER = 'browser',
  NODE = 'node',
  EDGE = 'edge', 
  CLOUDFLARE = 'cloudflare',
  DENO = 'deno',
  BUN = 'bun',
  ELECTRON = 'electron',
  TAURI = 'tauri',
  STATIC = 'static'
}

// Runtime capabilities
export interface RuntimeCapabilities {
  dom: boolean;
  ssr: boolean;
  filesystem: boolean;
  fetch: boolean;
  websockets: boolean;
  workers: boolean;
  storage: boolean;
  crypto: boolean;
  streams: boolean;
}

// Runtime info
export interface RuntimeInfo {
  environment: RuntimeEnvironment;
  capabilities: RuntimeCapabilities;
  version: string | null;
  features: string[];
  userAgent: string | null;
  platform: any;
}

// App creation
export interface AppOptions {
  environment?: RuntimeEnvironment;
  autoHydrate?: boolean;
  enableWebComponents?: boolean;
  enablePerformanceMonitoring?: boolean;
  routingMode?: 'hash' | 'history' | 'memory' | 'none';
  [key: string]: any;
}

export interface CoherentApp {
  component(name: string, component: Function, options?: any): Function;
  route?(path: string, handler: Function): void;
  navigate?(path: string): void;
  render(component: Function | string, props?: any, target?: string | Element): Promise<any>;
  mount(component: Function | string, target?: string | Element): Promise<any>;
  unmount(target?: string | Element): void;
  getRuntime(): any;
}

// Main factory functions
export function createCoherentApp(options?: AppOptions): Promise<CoherentApp>;
export function renderApp(component: Function | string, props?: any, target?: string | Element): any;
export function detectRuntime(): RuntimeEnvironment;
export function createRuntime(options?: AppOptions): Promise<any>;
export function getRuntimeCapabilities(environment?: RuntimeEnvironment): RuntimeCapabilities;
export function getRuntimeInfo(): RuntimeInfo;

// Runtime classes
export class BrowserRuntime {
  constructor(options?: any);
  initialize(): Promise<void>;
  registerComponent(name: string, component: Function, options?: any): Function;
  createApp(options?: any): Promise<CoherentApp>;
  static createQuickApp(components?: Record<string, Function>, options?: any): Promise<CoherentApp>;
}

export class EdgeRuntime {
  constructor(options?: any);
  createApp(options?: any): any;
  handleRequest(request: Request): Promise<Response>;
  static createApp(options?: any): any;
}

export class StaticRuntime {
  constructor(options?: any);
  createApp(options?: any): any;
  build(): Promise<any>;
  static buildSite(pages?: any, components?: Record<string, Function>, options?: any): Promise<any>;
}

// Utility functions
export class RuntimeDetector {
  static detect(): RuntimeEnvironment;
  static getCapabilities(environment?: RuntimeEnvironment): RuntimeCapabilities;
}

// Global window interface (for script tag usage)
declare global {
  interface Window {
    Coherent?: {
      render(obj: any): Promise<string>;
      hydrate(element: Element, component: Function, props?: any): Promise<any>;
      defineComponent(name: string, component: Function, options?: any): Promise<any>;
      createApp(options?: AppOptions): Promise<CoherentApp>;
      renderApp(component: Function | string, props?: any, target?: string | Element): any;
      VERSION: string;
    };
    componentRegistry?: Record<string, Function>;
  }
}

export const VERSION: string;
