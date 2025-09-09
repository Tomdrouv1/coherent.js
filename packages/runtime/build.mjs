#!/usr/bin/env node

/**
 * Build script for @coherentjs/runtime
 * Creates optimized bundles for different runtime environments
 */

import { build } from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function buildUniversalRuntime() {
  console.log('🌐 Building @coherentjs/runtime...');

  // Ensure dist directory exists
  await fs.mkdir(path.join(__dirname, 'dist'), { recursive: true });

  const commonConfig = {
    bundle: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true,
    target: ['es2020'],
    external: [
      '@coherentjs/core',
      '@coherentjs/client', 
      '@coherentjs/web-components'
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }
  };

  // Main universal bundle
  const universalBuilds = [
    // Universal runtime (browser + edge compatible)
    {
      ...commonConfig,
      entryPoints: ['src/index.js'],
      outfile: 'dist/coherent-universal.js',
      format: 'esm',
      platform: 'browser',
      globalName: 'Coherent'
    },
    {
      ...commonConfig,
      entryPoints: ['src/index.js'],
      outfile: 'dist/coherent-universal.cjs',
      format: 'cjs',
      platform: 'node'
    },
    
    // Universal runtime minified for CDN
    {
      ...commonConfig,
      entryPoints: ['src/index.js'],
      outfile: 'dist/coherent-universal.min.js',
      format: 'iife',
      platform: 'browser',
      globalName: 'Coherent',
      minify: true
    }
  ];

  // Environment-specific builds
  const environmentBuilds = [
    // Browser-only runtime
    {
      ...commonConfig,
      entryPoints: ['src/runtimes/browser.js'],
      outfile: 'dist/coherent-browser.js',
      format: 'esm',
      platform: 'browser'
    },
    {
      ...commonConfig,
      entryPoints: ['src/runtimes/browser.js'],
      outfile: 'dist/coherent-browser.cjs',
      format: 'cjs',
      platform: 'node'
    },
    
    // Edge runtime
    {
      ...commonConfig,
      entryPoints: ['src/runtimes/edge.js'],
      outfile: 'dist/coherent-edge.js',
      format: 'esm',
      platform: 'neutral'
    },
    {
      ...commonConfig,
      entryPoints: ['src/runtimes/edge.js'],
      outfile: 'dist/coherent-edge.cjs',
      format: 'cjs',
      platform: 'node'
    },
    
    // Static generation runtime
    {
      ...commonConfig,
      entryPoints: ['src/runtimes/static.js'],
      outfile: 'dist/coherent-static.js',
      format: 'esm',
      platform: 'node'
    },
    {
      ...commonConfig,
      entryPoints: ['src/runtimes/static.js'],
      outfile: 'dist/coherent-static.cjs',
      format: 'cjs',
      platform: 'node'
    }
  ];

  // Standalone builds (with dependencies bundled)
  const standaloneBuilds = [
    // Complete standalone bundle for browsers
    {
      ...commonConfig,
      entryPoints: ['src/index.js'],
      outfile: 'dist/coherent-standalone.js',
      format: 'iife',
      platform: 'browser',
      globalName: 'Coherent',
      external: ['@coherentjs/core', '@coherentjs/client', '@coherentjs/web-components'],
      minify: true
    },
    
    // Standalone ESM for modern browsers
    {
      ...commonConfig,
      entryPoints: ['src/index.js'],
      outfile: 'dist/coherent-standalone.esm.js',
      format: 'esm',
      platform: 'browser',
      external: ['@coherentjs/core', '@coherentjs/client', '@coherentjs/web-components'],
      minify: process.env.NODE_ENV === 'production'
    }
  ];

  try {
    // Build all configurations in parallel
    const allBuilds = [
      ...universalBuilds,
      ...environmentBuilds,
      ...standaloneBuilds
    ];

    await Promise.all(allBuilds.map(config => build(config)));
    
    console.log('✅ Runtime builds completed successfully!');
    
    // Generate TypeScript definitions
    await generateTypeDefinitions();
    
    // Copy additional files
    await copyAdditionalFiles();
    
    // Generate usage examples
    await generateExamples();
    
    console.log('📦 Build artifacts:');
    console.log('  - dist/coherent-universal.js (Universal ESM)');
    console.log('  - dist/coherent-universal.min.js (Universal IIFE, minified)');
    console.log('  - dist/coherent-browser.js (Browser-specific)');
    console.log('  - dist/coherent-edge.js (Edge runtime)');
    console.log('  - dist/coherent-static.js (Static generation)');
    console.log('  - dist/coherent-standalone.js (Complete bundle)');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function generateTypeDefinitions() {
  console.log('📝 Generating TypeScript definitions...');
  
  const mainTypes = `
/**
 * Type definitions for @coherentjs/runtime
 */

export * from '@coherentjs/core';
export * from '@coherentjs/client'; 
export * from '@coherentjs/web-components';

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
      renderToString(obj: any): Promise<string>;
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
`;

  await fs.writeFile(path.join(__dirname, 'types', 'index.d.ts'), mainTypes);
  
  // Create specific runtime type definitions
  const browserTypes = `export * from './index';
export { BrowserRuntime } from './index';`;
  
  await fs.writeFile(path.join(__dirname, 'types', 'browser.d.ts'), browserTypes);
  
  const edgeTypes = `export * from './index';
export { EdgeRuntime } from './index';`;
  
  await fs.writeFile(path.join(__dirname, 'types', 'edge.d.ts'), edgeTypes);
  
  const staticTypes = `export * from './index';
export { StaticRuntime } from './index';`;
  
  await fs.writeFile(path.join(__dirname, 'types', 'static.d.ts'), staticTypes);
}

async function copyAdditionalFiles() {
  try {
    // Copy README
    await fs.copyFile(
      path.join(__dirname, '../../README.md'),
      path.join(__dirname, 'README.md')
    ).catch(() => {
      return fs.writeFile(
        path.join(__dirname, 'README.md'),
        `# @coherentjs/runtime

Runtime for Coherent.js that works in any JavaScript environment.

## Features

- 🌐 **Universal**: Runs in browsers, edge workers, Node.js, Deno, Bun
- ⚡ **Zero Dependencies**: No Node.js-specific APIs required
- 🎯 **Framework Agnostic**: Use with any server framework or standalone
- 📦 **Multiple Bundles**: Optimized builds for different environments
- 🔄 **Client-side Hydration**: Full interactivity in browsers
- 🏗️ **Static Generation**: Pre-render to static HTML files
- 🔧 **Web Components**: Native Web Components integration

## Quick Start

### Browser (Script Tag)
\`\`\`html
<script src="https://unpkg.com/@coherentjs/runtime/dist/coherent-standalone.min.js"></script>
<script>
  const app = await Coherent.createApp();
  app.render(() => ({ h1: { text: 'Hello World!' } }), {}, '#app');
</script>
\`\`\`

### ES Modules
\`\`\`javascript
import { createCoherentApp } from '@coherentjs/runtime';

const app = await createCoherentApp();
await app.mount(() => ({ h1: { text: 'Hello World!' } }));
\`\`\`

### Cloudflare Workers
\`\`\`javascript
import { EdgeRuntime } from '@coherentjs/runtime/edge';

export default {
  async fetch(request) {
    const app = EdgeRuntime.createApp();
    app.route('/', () => ({ component: () => ({ h1: { text: 'Hello from the Edge!' } }) }));
    return app.fetch(request);
  }
};
\`\`\`

### Static Site Generation
\`\`\`javascript
import { StaticRuntime } from '@coherentjs/runtime/static';

const site = StaticRuntime.createApp({
  outputDir: 'dist',
  baseUrl: 'https://mysite.com'
});

site.page('/', () => ({ h1: { text: 'Welcome!' } }), { title: 'Home' });
await site.build();
\`\`\`

## Environments Supported

- ✅ Modern Browsers (Chrome, Firefox, Safari, Edge)
- ✅ Cloudflare Workers
- ✅ Deno Deploy
- ✅ Bun
- ✅ Node.js (18+)
- ✅ Electron
- ✅ Tauri
- ✅ Any JavaScript runtime with ES2020+ support

## Documentation

Visit [coherentjs.dev](https://coherentjs.dev) for complete documentation.
`
      );
    });
    
    // Copy LICENSE
    await fs.copyFile(
      path.join(__dirname, '../../LICENSE'),
      path.join(__dirname, 'LICENSE')
    ).catch(() => {
      return fs.writeFile(
        path.join(__dirname, 'LICENSE'),
        'MIT License\n\nCopyright (c) 2025 Coherent.js\n'
      );
    });
  } catch (error) {
    console.warn('Could not copy additional files:', error.message);
  }
}

async function generateExamples() {
  console.log('📚 Generating usage examples...');
  
  // Browser example
  const browserExample = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coherent.js Universal Runtime - Browser Example</title>
</head>
<body>
  <div id="app"></div>
  
  <script type="module">
    import { createCoherentApp } from '../dist/coherent-universal.js';
    
    // Create a simple counter component
    const Counter = ({ count = 0 }) => ({
      div: {
        style: { padding: '20px', textAlign: 'center' },
        children: [
          { h1: { text: \`Count: \${count}\` } },
          { 
            button: { 
              text: 'Increment',
              onclick: (event, state, setState) => {
                setState({ count: (state.count || 0) + 1 });
              }
            } 
          }
        ]
      }
    });
    
    // Create and mount the app
    const app = await createCoherentApp();
    app.component('Counter', Counter);
    await app.mount('Counter', '#app');
  </script>
</body>
</html>`;
  
  await fs.writeFile(path.join(__dirname, 'examples', 'browser.html'), browserExample);
  
  // Cloudflare Worker example
  const workerExample = `import { EdgeRuntime } from '@coherentjs/runtime/edge';

export default {
  async fetch(request) {
    const app = EdgeRuntime.createApp();
    
    // Define a simple page component
    const HomePage = () => ({
      html: {
        head: {
          title: { text: 'Hello from Cloudflare!' }
        },
        body: {
          children: [
            { h1: { text: 'Welcome to Coherent.js on Cloudflare Workers!' } },
            { p: { text: 'This page is rendered at the edge.' } },
            { 
              div: { 
                text: \`Request time: \${new Date().toISOString()}\` 
              } 
            }
          ]
        }
      }
    });
    
    app.route('/', () => ({
      component: HomePage
    }));
    
    app.route('/api/hello', () => ({
      json: { message: 'Hello from the edge!', timestamp: Date.now() }
    }));
    
    return app.fetch(request);
  }
};`;
  
  await fs.writeFile(path.join(__dirname, 'examples', 'cloudflare-worker.js'), workerExample);
  
  // Static site example
  const staticExample = `import { StaticRuntime } from '@coherentjs/runtime/static';

// Create components
const Layout = ({ title, children }) => ({
  html: {
    head: {
      title: { text: title },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    },
    body: {
      children: [
        { header: { h1: { text: 'My Static Site' } } },
        { main: { children } },
        { footer: { p: { text: '© 2025 My Site' } } }
      ]
    }
  }
});

const HomePage = () => Layout({
  title: 'Home',
  children: [
    { h2: { text: 'Welcome!' } },
    { p: { text: 'This is a static site built with Coherent.js' } }
  ]
});

const AboutPage = () => Layout({
  title: 'About', 
  children: [
    { h2: { text: 'About Us' } },
    { p: { text: 'We build awesome static sites!' } }
  ]
});

// Build the site
const site = StaticRuntime.createApp({
  outputDir: 'dist',
  baseUrl: 'https://mysite.com'
});

site.component('Layout', Layout);
site.component('HomePage', HomePage);
site.component('AboutPage', AboutPage);

site.page('/', 'HomePage');
site.page('/about', 'AboutPage');

const result = await site.build();
console.log(\`Built \${result.stats.pagesGenerated} pages in \${result.stats.buildTime}ms\`);`;
  
  await fs.writeFile(path.join(__dirname, 'examples', 'static-site.js'), staticExample);
}

buildUniversalRuntime();