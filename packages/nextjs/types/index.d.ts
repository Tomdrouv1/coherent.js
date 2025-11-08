/**
 * Coherent.js Next.js Integration Types
 * TypeScript definitions for Next.js framework integration
 *
 * @version 1.0.0-beta.1
 */

import { NextApiRequest, NextApiResponse, NextPage, GetServerSideProps, GetStaticProps } from 'next';
import { CoherentNode } from '@coherent/core';

// ============================================================================
// Next.js Integration Types
// ============================================================================

/** Coherent Next.js page props */
export interface CoherentPageProps {
  [key: string]: any;
  coherentState?: any;
  coherentMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
    og?: Record<string, string>;
    twitter?: Record<string, string>;
  };
}

/** Coherent Next.js page component */
export interface CoherentNextPage<P = CoherentPageProps> extends NextPage<P> {
  renderCoherent?: (props: P) => CoherentNode;
  getLayout?: (page: CoherentNode) => CoherentNode;
  coherentConfig?: {
    ssr?: boolean;
    hydrate?: boolean;
    cache?: boolean;
  };
}

/** Enhanced Next.js API request */
export interface CoherentApiRequest extends NextApiRequest {
  renderComponent<P = any>(component: (props: P) => CoherentNode, props?: P): string;
}

/** Enhanced Next.js API response */
export interface CoherentApiResponse extends NextApiResponse {
  sendComponent<P = any>(component: (props: P) => CoherentNode, props?: P): void;
  renderCoherent(component: CoherentNode, options?: any): void;
}

// ============================================================================
// Configuration Types
// ============================================================================

/** Next.js configuration with Coherent.js support */
export interface CoherentNextConfig {
  // Standard Next.js config
  reactStrictMode?: boolean;
  swcMinify?: boolean;
  experimental?: any;

  // Coherent.js specific
  coherent?: {
    ssr?: boolean;
    hydration?: boolean;
    componentDirectory?: string;
    staticGeneration?: boolean;
    cache?: {
      enabled?: boolean;
      maxAge?: number;
      staleWhileRevalidate?: number;
    };
    build?: {
      analyze?: boolean;
      bundleAnalyzer?: boolean;
    };
    dev?: {
      hmr?: boolean;
      overlay?: boolean;
    };
  };

  // Webpack configuration
  webpack?: (config: any, options: any) => any;
}

/** Build configuration for Coherent.js */
export interface CoherentBuildConfig {
  outputDirectory?: string;
  staticGeneration?: boolean;
  optimization?: {
    minimize?: boolean;
    splitChunks?: boolean;
    treeshaking?: boolean;
  };
  bundleAnalysis?: boolean;
}

// ============================================================================
// SSR and Static Generation Types
// ============================================================================

/** Server-side rendering context for Next.js */
export interface NextSSRContext {
  req: NextApiRequest;
  res: NextApiResponse;
  params?: { [key: string]: string | string[] };
  query: { [key: string]: string | string[] };
  preview?: boolean;
  previewData?: any;
  resolvedUrl: string;
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
}

/** Enhanced GetServerSideProps with Coherent.js support */
export type CoherentGetServerSideProps<P = CoherentPageProps> = (
  context: NextSSRContext & {
    renderComponent: <CP = any>(component: (props: CP) => CoherentNode, props?: CP) => string;
    coherentState: any;
    setCoherentState: (state: any) => void;
  }
) => Promise<{
  props: P;
  redirect?: any;
  notFound?: boolean;
}>;

/** Enhanced GetStaticProps with Coherent.js support */
export type CoherentGetStaticProps<P = CoherentPageProps> = (
  context: {
    params?: { [key: string]: string | string[] };
    preview?: boolean;
    previewData?: any;
    locale?: string;
    locales?: string[];
    defaultLocale?: string;
  } & {
    renderComponent: <CP = any>(component: (props: CP) => CoherentNode, props?: CP) => string;
  }
) => Promise<{
  props: P;
  revalidate?: number | boolean;
  redirect?: any;
  notFound?: boolean;
}>;

// ============================================================================
// Plugin and Middleware Types
// ============================================================================

/** Next.js plugin for Coherent.js */
export interface CoherentNextPlugin {
  (nextConfig?: any): any;
}

/** Middleware options for API routes */
export interface ApiMiddlewareOptions {
  cors?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  auth?: {
    required?: boolean;
    roles?: string[];
  };
}

/** API route handler with Coherent.js support */
export type CoherentApiHandler = (
  req: CoherentApiRequest,
  res: CoherentApiResponse
) => void | Promise<void>;

// ============================================================================
// Layout and App Types
// ============================================================================

/** Custom App component with Coherent.js support */
export interface CoherentAppProps {
  Component: CoherentNextPage;
  pageProps: CoherentPageProps;
  coherentState?: any;
  coherentMeta?: any;
}

/** Custom App component type */
export type CoherentApp = (props: CoherentAppProps) => CoherentNode;

/** Layout component props */
export interface LayoutProps {
  children: CoherentNode;
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  coherentState?: any;
}

/** Layout component type */
export type CoherentLayout = (props: LayoutProps) => CoherentNode;

// ============================================================================
// Development and Build Types
// ============================================================================

/** Development server configuration */
export interface DevServerConfig {
  port?: number;
  hostname?: string;
  hmr?: boolean;
  turbo?: boolean;
  experimental?: {
    turbo?: boolean;
    serverComponents?: boolean;
  };
}

/** Build statistics */
export interface BuildStats {
  pages: Array<{
    path: string;
    size: number;
    firstLoad: number;
  }>;
  assets: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  bundles: Array<{
    name: string;
    size: number;
    modules: number;
  }>;
}

// ============================================================================
// Main Functions
// ============================================================================

/** Create Coherent.js Next.js configuration */
export function withCoherent(nextConfig?: any): CoherentNextConfig;

/** Create page component with Coherent.js support */
export function createPage<P = CoherentPageProps>(
  component: (props: P) => CoherentNode,
  options?: {
    layout?: CoherentLayout;
    ssr?: boolean;
    hydrate?: boolean;
  }
): CoherentNextPage<P>;

/** Create API route with Coherent.js support */
export function createApiRoute(
  handler: CoherentApiHandler,
  options?: ApiMiddlewareOptions
): CoherentApiHandler;

/** Create layout component */
export function createLayout(
  component: (props: LayoutProps) => CoherentNode
): CoherentLayout;

/** Create custom App component */
export function createApp(
  component: (props: CoherentAppProps) => CoherentNode
): CoherentApp;

/** Middleware for API routes */
export function withMiddleware(
  handler: CoherentApiHandler,
  options?: ApiMiddlewareOptions
): CoherentApiHandler;

/** Enhanced GetServerSideProps */
export function withServerSideProps<P = CoherentPageProps>(
  getProps: CoherentGetServerSideProps<P>
): GetServerSideProps<P>;

/** Enhanced GetStaticProps */
export function withStaticProps<P = CoherentPageProps>(
  getProps: CoherentGetStaticProps<P>
): GetStaticProps<P>;

// ============================================================================
// Utility Functions
// ============================================================================

/** Get build configuration */
export function getBuildConfig(): CoherentBuildConfig;

/** Get runtime configuration */
export function getRuntimeConfig(): any;

/** Create webpack configuration */
export function createWebpackConfig(baseConfig: any, options: any): any;

/** Analyze bundle */
export function analyzeBundle(): Promise<BuildStats>;

// ============================================================================
// Default Export
// ============================================================================

declare const coherentNext: {
  withCoherent: typeof withCoherent;
  createPage: typeof createPage;
  createApiRoute: typeof createApiRoute;
  createLayout: typeof createLayout;
  createApp: typeof createApp;
  withMiddleware: typeof withMiddleware;
  withServerSideProps: typeof withServerSideProps;
  withStaticProps: typeof withStaticProps;
  getBuildConfig: typeof getBuildConfig;
  getRuntimeConfig: typeof getRuntimeConfig;
  createWebpackConfig: typeof createWebpackConfig;
  analyzeBundle: typeof analyzeBundle;
};

export default coherentNext;
