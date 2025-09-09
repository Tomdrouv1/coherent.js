/**
 * Static Runtime - For static site generation
 * Pre-renders components to static HTML files
 */

import { renderToString } from '@coherentjs/core';

export class StaticRuntime {
  constructor(options = {}) {
    this.options = {
      outputDir: 'dist',
      baseUrl: '',
      generateSitemap: true,
      generateManifest: true,
      minifyHtml: true,
      inlineCSS: false,
      ...options
    };
    
    this.componentRegistry = new Map();
    this.pageRegistry = new Map();
    this.staticAssets = new Map();
    this.generatedPages = new Map();
    
    // Track build statistics
    this.buildStats = {
      startTime: Date.now(),
      pagesGenerated: 0,
      assetsProcessed: 0,
      totalSize: 0,
      errors: []
    };
  }

  // Component management
  registerComponent(name, component, options = {}) {
    this.componentRegistry.set(name, {
      component,
      options
    });
    return component;
  }

  getComponent(name) {
    const registration = this.componentRegistry.get(name);
    return registration ? registration.component : null;
  }

  // Page registration
  addPage(route, component, options = {}) {
    this.pageRegistry.set(route, {
      component: typeof component === 'string' ? this.getComponent(component) : component,
      options: {
        title: options.title || 'Page',
        description: options.description || '',
        keywords: options.keywords || '',
        generatePath: options.generatePath || this.routeToPath(route),
        props: options.props || {},
        ...options
      }
    });
  }

  routeToPath(route) {
    // Convert route pattern to static path
    // /users/:id -> /users/[id] (or similar static pattern)
    if (route === '/') return '/index.html';
    
    // Handle dynamic routes
    if (route.includes(':')) {
      // For static generation, dynamic routes need explicit paths
      console.warn(`Dynamic route ${route} requires explicit generatePath`);
      return null;
    }
    
    return route.endsWith('/') ? `${route}index.html` : `${route}.html`;
  }

  // Static asset management
  addAsset(path, content, options = {}) {
    this.staticAssets.set(path, {
      content,
      type: options.type || this.inferContentType(path),
      minify: options.minify !== false,
      ...options
    });
  }

  inferContentType(path) {
    const ext = path.split('.').pop().toLowerCase();
    const contentTypes = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon'
    };
    return contentTypes[ext] || 'text/plain';
  }

  // HTML template generation
  generateHtmlDocument(content, options = {}) {
    const {
      title = 'Coherent.js App',
      description = '',
      keywords = '',
      lang = 'en',
      charset = 'utf-8',
      viewport = 'width=device-width, initial-scale=1',
      favicon = '/favicon.ico',
      styles = [],
      scripts = [],
      meta = [],
      bodyClass = '',
      hydrate = false,
      componentName = null,
      componentProps = {}
    } = options;

    const metaTags = [
      `<meta charset="${charset}">`,
      `<meta name="viewport" content="${viewport}">`,
      description && `<meta name="description" content="${description}">`,
      keywords && `<meta name="keywords" content="${keywords}">`,
      ...meta.map(m => typeof m === 'string' ? m : `<meta ${Object.entries(m).map(([k, v]) => `${k}="${v}"`).join(' ')}>`)
    ].filter(Boolean).join('\n  ');

    const styleTags = styles.map(style => 
      typeof style === 'string' 
        ? style.startsWith('<') ? style : `<link rel="stylesheet" href="${style}">`
        : `<style>${style.content}</style>`
    ).join('\n  ');

    const scriptTags = [
      ...scripts.map(script => 
        typeof script === 'string' 
          ? script.startsWith('<') ? script : `<script src="${script}"></script>`
          : `<script>${script.content}</script>`
      ),
      // Add hydration script if enabled
      hydrate && this.generateHydrationScript(componentName, componentProps)
    ].filter(Boolean).join('\n  ');

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  ${metaTags}
  <title>${this.escapeHtml(title)}</title>
  <link rel="icon" href="${favicon}">
  ${styleTags}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
  ${content}
  ${scriptTags}
</body>
</html>`;
  }

  generateHydrationScript(componentName) {
    if (!componentName) return '';
    
    return `
  <script type="module">
    import { autoHydrate } from '/coherent-client.js';
    
    // Auto-hydrate on page load
    document.addEventListener('DOMContentLoaded', () => {
      autoHydrate({
        '${componentName}': window.components?.['${componentName}']
      });
    });
  </script>`;
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Build process
  async build() {
    this.buildStats.startTime = Date.now();
    console.log('🏗️  Starting static site generation...');

    try {
      // Generate all pages
      await this.generatePages();
      
      // Process static assets
      await this.processAssets();
      
      // Generate additional files
      if (this.options.generateSitemap) {
        await this.generateSitemap();
      }
      
      if (this.options.generateManifest) {
        await this.generateManifest();
      }
      
      // Generate build report
      const buildTime = Date.now() - this.buildStats.startTime;
      console.log(`✅ Build completed in ${buildTime}ms`);
      console.log(`📄 Generated ${this.buildStats.pagesGenerated} pages`);
      console.log(`📦 Processed ${this.buildStats.assetsProcessed} assets`);
      
      return this.getBuildResult();
      
    } catch (error) {
      this.buildStats.errors.push(error);
      console.error('❌ Build failed:', error);
      throw error;
    }
  }

  async generatePages() {
    for (const [route, pageConfig] of this.pageRegistry) {
      try {
        await this.generatePage(route, pageConfig);
        this.buildStats.pagesGenerated++;
      } catch (error) {
        console.error(`Failed to generate page ${route}:`, error);
        this.buildStats.errors.push({ route, error });
      }
    }
  }

  async generatePage(route, pageConfig) {
    const { component, options } = pageConfig;
    
    if (!component) {
      throw new Error(`No component found for route: ${route}`);
    }

    // Render component to HTML
    const vdom = component(options.props || {});
    const content = renderToString(vdom);
    
    // Wrap in HTML document
    const html = this.generateHtmlDocument(content, {
      title: options.title,
      description: options.description,
      keywords: options.keywords,
      styles: options.styles || [],
      scripts: options.scripts || [],
      meta: options.meta || [],
      hydrate: options.hydrate,
      componentName: options.componentName,
      componentProps: options.props || {},
      ...options.htmlOptions
    });

    // Minify if enabled
    const finalHtml = this.options.minifyHtml ? this.minifyHtml(html) : html;
    
    // Store generated page
    const outputPath = options.generatePath || this.routeToPath(route);
    if (outputPath) {
      this.generatedPages.set(outputPath, {
        html: finalHtml,
        size: finalHtml.length,
        route,
        options
      });
      
      this.buildStats.totalSize += finalHtml.length;
    }
  }

  minifyHtml(html) {
    // Basic HTML minification
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+>/g, '>')
      .replace(/<\s+/g, '<')
      .trim();
  }

  async processAssets() {
    for (const [path, asset] of this.staticAssets) {
      try {
        let content = asset.content;
        
        // Process asset based on type
        if (asset.minify) {
          content = this.minifyAsset(content, asset.type);
        }
        
        // Store processed asset
        this.generatedPages.set(path, {
          content,
          type: asset.type,
          size: content.length
        });
        
        this.buildStats.assetsProcessed++;
        this.buildStats.totalSize += content.length;
        
      } catch (error) {
        console.error(`Failed to process asset ${path}:`, error);
        this.buildStats.errors.push({ path, error });
      }
    }
  }

  minifyAsset(content, type) {
    switch (type) {
      case 'text/css':
        return content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ')
          .replace(/;\s*}/g, '}')
          .replace(/\s*{\s*/g, '{')
          .replace(/;\s*/g, ';')
          .trim();
      
      case 'application/javascript':
        // Basic JS minification (in production, use a proper minifier)
        return content
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
          .replace(/\s+/g, ' ')
          .replace(/\s*([{}();,])\s*/g, '$1')
          .trim();
      
      default:
        return content;
    }
  }

  async generateSitemap() {
    const pages = Array.from(this.generatedPages.keys())
      .filter(path => path.endsWith('.html'));
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(path => `  <url>
    <loc>${this.options.baseUrl}${path.replace('/index.html', '/')}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    this.generatedPages.set('/sitemap.xml', {
      content: sitemap,
      type: 'application/xml',
      size: sitemap.length
    });
  }

  async generateManifest() {
    const manifest = {
      name: this.options.name || 'Coherent.js App',
      short_name: this.options.shortName || 'App',
      description: this.options.description || '',
      start_url: '/',
      display: 'standalone',
      theme_color: this.options.themeColor || '#000000',
      background_color: this.options.backgroundColor || '#ffffff',
      icons: this.options.icons || []
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    
    this.generatedPages.set('/manifest.json', {
      content: manifestJson,
      type: 'application/json',
      size: manifestJson.length
    });
  }

  getBuildResult() {
    return {
      pages: this.generatedPages,
      stats: {
        ...this.buildStats,
        buildTime: Date.now() - this.buildStats.startTime
      },
      success: this.buildStats.errors.length === 0
    };
  }

  // Create static app factory
  createApp() {
    return {
      // Component registration
      component: (name, component, opts) => this.registerComponent(name, component, opts),
      
      // Page registration
      page: (route, component, opts) => this.addPage(route, component, opts),
      
      // Asset management
      asset: (path, content, opts) => this.addAsset(path, content, opts),
      
      // Build process
      build: () => this.build(),
      
      // Utilities
      getRuntime: () => this,
      getStats: () => this.buildStats,
      getPages: () => Array.from(this.pageRegistry.keys()),
      getAssets: () => Array.from(this.staticAssets.keys())
    };
  }

  // Static factory methods
  static createApp(options = {}) {
    const runtime = new StaticRuntime(options);
    return runtime.createApp(options);
  }

  static async buildSite(pages = {}, components = {}, options = {}) {
    const runtime = new StaticRuntime(options);
    
    // Register components
    Object.entries(components).forEach(([name, component]) => {
      runtime.registerComponent(name, component);
    });
    
    // Register pages
    Object.entries(pages).forEach(([route, config]) => {
      runtime.addPage(route, config.component, config.options);
    });
    
    return await runtime.build();
  }
}
