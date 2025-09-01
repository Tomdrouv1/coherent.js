/**
 * Coherent.js Framework Types
 * Complete TypeScript definitions for the entire Coherent.js framework
 * 
 * @version 1.1.1
 */

// ============================================================================
// Core Framework Re-exports
// ============================================================================

export * from '../packages/core/types/index.js';
export * from '../packages/api/types/index.js';
export * from '../packages/database/types/index.js';
export * from '../packages/client/types/index.js';

// ============================================================================
// Framework Integrations Re-exports
// ============================================================================

export * as Express from '../packages/express/types/index.js';
export * as Koa from '../packages/koa/types/index.js';
export * as NextJS from '../packages/nextjs/types/index.js';

// ============================================================================
// CLI Tools Re-exports
// ============================================================================

export * as CLI from '../packages/cli/types/index.js';

// ============================================================================
// Framework-wide Types
// ============================================================================

/** Framework configuration */
export interface CoherentFrameworkConfig {
  // Core settings
  core?: {
    version?: string;
    development?: boolean;
    strict?: boolean;
  };
  
  // Rendering settings
  rendering?: {
    cache?: boolean;
    pretty?: boolean;
    streaming?: boolean;
  };
  
  // State management
  state?: {
    persistent?: boolean;
    serializable?: boolean;
    devtools?: boolean;
  };
  
  // Client-side settings
  client?: {
    hydration?: boolean;
    hmr?: boolean;
    serviceWorker?: boolean;
  };
  
  // API settings
  api?: {
    validation?: boolean;
    authentication?: boolean;
    rateLimit?: boolean;
    cors?: boolean;
  };
  
  // Database settings
  database?: {
    enabled?: boolean;
    type?: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'memory';
    migrations?: boolean;
    seeding?: boolean;
  };
  
  // Performance settings
  performance?: {
    monitoring?: boolean;
    caching?: boolean;
    compression?: boolean;
    bundleAnalysis?: boolean;
  };
  
  // Security settings
  security?: {
    csrf?: boolean;
    helmet?: boolean;
    sanitization?: boolean;
    audit?: boolean;
  };
  
  // Logging settings
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    format?: 'json' | 'text';
    destination?: string;
  };
}

/** Application metadata */
export interface ApplicationMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
  coherentVersion: string;
  createdAt: Date;
  lastModified: Date;
}

/** Framework runtime information */
export interface RuntimeInfo {
  version: string;
  node: string;
  platform: string;
  arch: string;
  memory: {
    used: number;
    total: number;
    free: number;
  };
  uptime: number;
  pid: number;
}

/** Plugin interface for framework extensions */
export interface CoherentPlugin {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  
  // Lifecycle hooks
  install?(framework: any): void | Promise<void>;
  uninstall?(framework: any): void | Promise<void>;
  configure?(config: CoherentFrameworkConfig): CoherentFrameworkConfig;
  
  // Component system extensions
  components?: {
    [name: string]: any;
  };
  
  // Middleware extensions
  middleware?: {
    [name: string]: any;
  };
  
  // CLI extensions
  commands?: {
    [name: string]: any;
  };
  
  // Custom hooks
  hooks?: {
    [event: string]: (...args: any[]) => any;
  };
}

// ============================================================================
// Global Framework Interface
// ============================================================================

/** Main Coherent.js framework interface */
export interface CoherentFramework {
  // Version information
  readonly version: string;
  readonly metadata: ApplicationMetadata;
  
  // Configuration
  config: CoherentFrameworkConfig;
  configure(config: Partial<CoherentFrameworkConfig>): void;
  
  // Core modules
  core: typeof import('../packages/core/types/index.js');
  api: typeof import('../packages/api/types/index.js');
  database: typeof import('../packages/database/types/index.js');
  client: typeof import('../packages/client/types/index.js');
  
  // Framework integrations
  integrations: {
    express: typeof import('../packages/express/types/index.js');
    koa: typeof import('../packages/koa/types/index.js');
    nextjs: typeof import('../packages/nextjs/types/index.js');
  };
  
  // Plugin system
  plugins: {
    install(plugin: CoherentPlugin): Promise<void>;
    uninstall(name: string): Promise<void>;
    get(name: string): CoherentPlugin | undefined;
    list(): CoherentPlugin[];
  };
  
  // Utilities
  utils: {
    getRuntimeInfo(): RuntimeInfo;
    validateConfig(config: CoherentFrameworkConfig): boolean;
    createLogger(name?: string): any;
    createPerformanceMonitor(): any;
  };
  
  // Event system
  events: {
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener?: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    once(event: string, listener: (...args: any[]) => void): void;
  };
}

// ============================================================================
// Global Constants and Utilities
// ============================================================================

/** Framework version */
export const VERSION: string;

/** Default framework configuration */
export const DEFAULT_CONFIG: CoherentFrameworkConfig;

/** Environment detection utilities */
export const Environment: {
  readonly isNode: boolean;
  readonly isBrowser: boolean;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
};

/** Feature detection utilities */
export const Features: {
  hasAsyncIteration: boolean;
  hasProxies: boolean;
  hasWeakMaps: boolean;
  hasSymbols: boolean;
  hasPromises: boolean;
};

// ============================================================================
// Framework Factory Functions
// ============================================================================

/** Create a new Coherent.js application instance */
export function createCoherentApp(config?: Partial<CoherentFrameworkConfig>): CoherentFramework;

/** Initialize framework with configuration */
export function initializeFramework(config?: Partial<CoherentFrameworkConfig>): Promise<CoherentFramework>;

/** Create framework plugin */
export function createPlugin(plugin: Omit<CoherentPlugin, 'version'>): CoherentPlugin;

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/** Check if object is a Coherent component */
export function isCoherentComponent(obj: any): obj is import('../packages/core/types/index.js').CoherentComponent;

/** Check if object is a Coherent element */
export function isCoherentElement(obj: any): obj is import('../packages/core/types/index.js').CoherentElement;

/** Check if value is a lazy wrapper */
export function isLazy<T>(value: any): value is import('../packages/core/types/index.js').LazyWrapper<T>;

/** Validate framework configuration */
export function validateFrameworkConfig(config: CoherentFrameworkConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

// ============================================================================
// Module Declarations for Package Resolution
// ============================================================================

declare module '@coherent/core' {
  export * from '../packages/core/types/index.js';
}

declare module '@coherent/api' {
  export * from '../packages/api/types/index.js';
}

declare module '@coherent/database' {
  export * from '../packages/database/types/index.js';
}

declare module '@coherent/client' {
  export * from '../packages/client/types/index.js';
}

declare module '@coherent/express' {
  export * from '../packages/express/types/index.js';
}

declare module '@coherent/koa' {
  export * from '../packages/koa/types/index.js';
}

declare module '@coherent/nextjs' {
  export * from '../packages/nextjs/types/index.js';
}

declare module '@coherent/cli' {
  export * from '../packages/cli/types/index.js';
}

declare module 'coherent.js' {
  export * from './index.js';
}

// ============================================================================
// Default Export
// ============================================================================

declare const coherent: CoherentFramework;
export default coherent;