/**
 * Coherent.js Runtime TypeScript Definitions
 * @module @coherent.js/runtime
 */

import type { CoherentNode, CoherentComponent, RenderOptions } from '@coherent.js/core';

// Re-export types from dependent packages
export * from '@coherent.js/core';
export * from '@coherent.js/client';
export * from '@coherent.js/web-components';

// ============================================================================
// Runtime Environment
// ============================================================================

/**
 * Runtime environment types
 */
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

/**
 * Runtime capabilities
 */
export interface RuntimeCapabilities {
  /** DOM is available */
  dom: boolean;
  /** Server-side rendering is supported */
  ssr: boolean;
  /** File system access is available */
  filesystem: boolean;
  /** Fetch API is available */
  fetch: boolean;
  /** WebSocket is available */
  websockets: boolean;
  /** Web Workers are available */
  workers: boolean;
  /** Storage APIs are available */
  storage: boolean;
  /** Web Crypto API is available */
  crypto: boolean;
  /** Streams API is available */
  streams: boolean;
}

/**
 * Runtime information
 */
export interface RuntimeInfo {
  /** Detected environment */
  environment: RuntimeEnvironment;
  /** Environment capabilities */
  capabilities: RuntimeCapabilities;
  /** Runtime version (if available) */
  version: string | null;
  /** Available features */
  features: string[];
  /** User agent (if available) */
  userAgent: string | null;
  /** Platform information */
  platform: unknown;
}

// ============================================================================
// Runtime Configuration
// ============================================================================

/**
 * Runtime configuration options
 */
export interface RuntimeConfig {
  /** Runtime mode */
  mode: 'browser' | 'edge' | 'static';
  /** Enable hydration */
  hydrate?: boolean;
  /** Enable streaming */
  streaming?: boolean;
}

/**
 * App creation options
 */
export interface AppOptions {
  /** Target environment */
  environment?: RuntimeEnvironment;
  /** Auto-hydrate on load */
  autoHydrate?: boolean;
  /** Enable web components */
  enableWebComponents?: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Routing mode */
  routingMode?: 'hash' | 'history' | 'memory' | 'none';
  /** Additional options */
  [key: string]: unknown;
}

// ============================================================================
// Browser Runtime
// ============================================================================

/**
 * Browser runtime interface
 */
export interface BrowserRuntime {
  /**
   * Hydrate a server-rendered component
   */
  hydrate(
    element: HTMLElement,
    component: CoherentComponent,
    props?: Record<string, unknown>
  ): void;

  /**
   * Render a component into a container
   */
  render(component: CoherentNode, container: HTMLElement): void;

  /**
   * Create a mountable app
   */
  createApp(component: CoherentComponent): {
    mount(selector: string): void;
    unmount(): void;
  };
}

/**
 * Browser runtime class
 */
export class BrowserRuntime implements BrowserRuntime {
  constructor(options?: AppOptions);

  /** Initialize the runtime */
  initialize(): Promise<void>;

  /** Register a component */
  registerComponent(
    name: string,
    component: CoherentComponent,
    options?: unknown
  ): CoherentComponent;

  /** Create an app instance */
  createApp(options?: AppOptions): Promise<CoherentApp>;

  /** Quick app creation (static method) */
  static createQuickApp(
    components?: Record<string, CoherentComponent>,
    options?: AppOptions
  ): Promise<CoherentApp>;
}

// ============================================================================
// Edge Runtime
// ============================================================================

/**
 * Edge runtime interface (Cloudflare Workers, Vercel Edge, etc.)
 */
export interface EdgeRuntime {
  /**
   * Render a component to string
   */
  render(component: CoherentNode, options?: RenderOptions): string;

  /**
   * Render a component to a readable stream
   */
  renderToStream(component: CoherentNode, options?: RenderOptions): ReadableStream<Uint8Array>;
}

/**
 * Edge runtime class
 */
export class EdgeRuntime implements EdgeRuntime {
  constructor(options?: AppOptions);

  /** Create an app for edge runtime */
  createApp(options?: AppOptions): CoherentApp;

  /** Handle an incoming request */
  handleRequest(request: Request): Promise<Response>;

  /** Static app creation */
  static createApp(options?: AppOptions): CoherentApp;
}

// ============================================================================
// Static Runtime
// ============================================================================

/**
 * Static runtime interface (for SSG)
 */
export interface StaticRuntime {
  /**
   * Render a component to string
   */
  render(component: CoherentNode, options?: RenderOptions): string;

  /**
   * Render multiple pages
   */
  renderPages(routes: Record<string, CoherentComponent>): Promise<Record<string, string>>;
}

/**
 * Static runtime class
 */
export class StaticRuntime implements StaticRuntime {
  constructor(options?: AppOptions);

  /** Create an app for static generation */
  createApp(options?: AppOptions): CoherentApp;

  /** Build the static site */
  build(): Promise<unknown>;

  /** Static site builder */
  static buildSite(
    pages?: unknown,
    components?: Record<string, CoherentComponent>,
    options?: AppOptions
  ): Promise<unknown>;
}

// ============================================================================
// App Interface
// ============================================================================

/**
 * Coherent app interface
 */
export interface CoherentApp {
  /**
   * Register a component
   */
  component(
    name: string,
    component: CoherentComponent,
    options?: unknown
  ): CoherentComponent;

  /**
   * Register a route (if routing is enabled)
   */
  route?(path: string, handler: CoherentComponent): void;

  /**
   * Navigate to a route (if routing is enabled)
   */
  navigate?(path: string): void;

  /**
   * Render a component
   */
  render(
    component: CoherentComponent | string,
    props?: Record<string, unknown>,
    target?: string | Element
  ): Promise<unknown>;

  /**
   * Mount the app
   */
  mount(
    component: CoherentComponent | string,
    target?: string | Element
  ): Promise<unknown>;

  /**
   * Unmount the app
   */
  unmount(target?: string | Element): void;

  /**
   * Get the runtime instance
   */
  getRuntime(): BrowserRuntime | EdgeRuntime | StaticRuntime;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Coherent.js app
 */
export function createCoherentApp(options?: AppOptions): Promise<CoherentApp>;

/**
 * Render an app directly
 */
export function renderApp(
  component: CoherentComponent | string,
  props?: Record<string, unknown>,
  target?: string | Element
): unknown;

/**
 * Detect the current runtime environment
 */
export function detectRuntime(): RuntimeEnvironment;

/**
 * Create a runtime instance for the detected environment
 */
export function createRuntime(options?: AppOptions): Promise<BrowserRuntime | EdgeRuntime | StaticRuntime>;

/**
 * Get capabilities for a specific environment
 */
export function getRuntimeCapabilities(environment?: RuntimeEnvironment): RuntimeCapabilities;

/**
 * Get full runtime information
 */
export function getRuntimeInfo(): RuntimeInfo;

// ============================================================================
// Runtime Detector
// ============================================================================

/**
 * Runtime detection utility class
 */
export class RuntimeDetector {
  /** Detect current runtime environment */
  static detect(): RuntimeEnvironment;

  /** Get capabilities for an environment */
  static getCapabilities(environment?: RuntimeEnvironment): RuntimeCapabilities;
}

// ============================================================================
// Global Window Interface
// ============================================================================

/**
 * Window interface extension for script tag usage
 */
declare global {
  interface Window {
    Coherent?: {
      /** Render a component to HTML */
      render(obj: CoherentNode): Promise<string>;
      /** Hydrate a server-rendered component */
      hydrate(
        element: Element,
        component: CoherentComponent,
        props?: Record<string, unknown>
      ): Promise<unknown>;
      /** Define a web component */
      defineComponent(
        name: string,
        component: CoherentComponent,
        options?: unknown
      ): Promise<unknown>;
      /** Create an app instance */
      createApp(options?: AppOptions): Promise<CoherentApp>;
      /** Render an app directly */
      renderApp(
        component: CoherentComponent | string,
        props?: Record<string, unknown>,
        target?: string | Element
      ): unknown;
      /** Framework version */
      VERSION: string;
    };
    /** Component registry for registered components */
    componentRegistry?: Record<string, CoherentComponent>;
  }
}

// ============================================================================
// Version
// ============================================================================

/**
 * Package version
 */
export const VERSION: string;
