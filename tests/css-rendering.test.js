/**
 * Integration tests for CSS rendering functionality
 * Tests the complete CSS integration with HTML rendering
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  renderHTML,
  renderHTMLSync,
  render
} from '../packages/core/src/rendering/html-renderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures', 'css-rendering');

// Test components
const SimpleComponent = () => ({
  div: {
    className: 'container',
    children: [
      { h1: { className: 'title', text: 'Hello World' } },
      { p: { className: 'description', text: 'This is a test component.' } }
    ]
  }
});

const ComplexComponent = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Test Page' } },
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
          ]
        }
      },
      {
        body: {
          className: 'app',
          children: [
            {
              header: {
                className: 'header',
                children: [
                  { nav: { className: 'nav', children: [{ text: 'Navigation' }] } }
                ]
              }
            },
            {
              main: {
                className: 'main',
                children: [
                  SimpleComponent()
                ]
              }
            },
            {
              footer: {
                className: 'footer',
                children: [{ p: { text: 'Footer content' } }]
              }
            }
          ]
        }
      }
    ]
  }
});

describe('CSS Rendering Integration', () => {
  let testStylesDir;
  let mainCSSPath;
  let componentCSSPath;
  let themeCSSPath;

  beforeEach(async () => {
    // Create test directory structure
    testStylesDir = join(fixturesDir, 'styles');
    await fs.mkdir(testStylesDir, { recursive: true });

    // Create test CSS files
    mainCSSPath = join(testStylesDir, 'main.css');
    await fs.writeFile(mainCSSPath, `
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        line-height: 1.6;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      .title {
        color: #333;
        font-size: 2rem;
        margin-bottom: 1rem;
      }
    `);

    componentCSSPath = join(testStylesDir, 'components.css');
    await fs.writeFile(componentCSSPath, `
      .header {
        background: #007bff;
        color: white;
        padding: 1rem 0;
      }
      
      .nav {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }
      
      .main {
        min-height: 50vh;
        padding: 2rem 0;
      }
      
      .footer {
        background: #f8f9fa;
        text-align: center;
        padding: 2rem 0;
        margin-top: 2rem;
      }
      
      .description {
        color: #666;
        font-size: 1.1rem;
      }
    `);

    themeCSSPath = join(testStylesDir, 'theme.css');
    await fs.writeFile(themeCSSPath, `
      :root {
        --primary-color: #007bff;
        --secondary-color: #6c757d;
        --success-color: #28a745;
        --danger-color: #dc3545;
      }
      
      .btn {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        cursor: pointer;
      }
      
      .btn:hover {
        background: #0056b3;
      }
    `);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(fixturesDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
    
    vi.clearAllMocks();
  });

  describe('renderHTML with CSS files', () => {
    it('should render HTML with single CSS file', async () => {
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath]
      });

      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain('<style>');
      expect(html).toContain('font-family: Arial, sans-serif');
      expect(html).toContain('max-width: 1200px');
      expect(html).toContain('<div class="container">');
      expect(html).toContain('<h1 class="title">Hello World</h1>');
    });

    it('should render HTML with multiple CSS files', async () => {
      const html = await renderHTML(ComplexComponent(), {
        cssFiles: [mainCSSPath, componentCSSPath]
      });

      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain('font-family: Arial, sans-serif'); // from main.css
      expect(html).toContain('background: #007bff');           // from components.css
      expect(html).toContain('<header class="header">');
      expect(html).toContain('<main class="main">');
      expect(html).toContain('<footer class="footer">');
    });

    it('should handle CSS files with external links', async () => {
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath],
        cssLinks: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
          'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'
        ]
      });

      expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com');
      expect(html).toContain('<link rel="stylesheet" href="https://cdn.jsdelivr.net');
      expect(html).toContain('<style>');
      expect(html).toContain('font-family: Arial, sans-serif');
    });

    it('should handle CSS files with inline styles', async () => {
      const inlineCSS = `
        .custom-class {
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          padding: 2rem;
          border-radius: 1rem;
        }
        .highlight {
          color: #e74c3c;
          font-weight: bold;
        }
      `;

      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath],
        cssInline: inlineCSS
      });

      expect(html).toContain('font-family: Arial, sans-serif'); // from CSS file
      expect(html).toContain('background: linear-gradient');    // from inline CSS
      expect(html).toContain('.highlight');                     // from inline CSS
    });

    it('should inject CSS into existing head element', async () => {
      const html = await renderHTML(ComplexComponent(), {
        cssFiles: [mainCSSPath],
        cssInline: '.test { color: red; }'
      });

      // Should contain the original head content
      expect(html).toContain('<title>Test Page</title>');
      expect(html).toContain('<meta charset="utf-8">');
      
      // Should contain injected CSS before closing head tag
      const headCloseIndex = html.indexOf('</head>');
      const cssIndex = html.indexOf('<style>');
      expect(cssIndex).toBeLessThan(headCloseIndex);
      expect(cssIndex).toBeGreaterThan(-1);
    });

    it('should create head element when none exists', async () => {
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath]
      });

      expect(html).toContain('<head>');
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('<style>');
      expect(html).toContain('</head>');
    });

    it('should minify CSS when requested', async () => {
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath],
        cssMinify: true
      });

      // Minified CSS should not contain extra whitespace
      expect(html).toContain('body{font-family:Arial,sans-serif');
      expect(html).toContain('.container{max-width:1200px');
      expect(html).not.toMatch(/\s{2,}/); // No multiple consecutive spaces
    });

    it('should handle non-existent CSS files gracefully', async () => {
      await expect(renderHTML(SimpleComponent(), {
        cssFiles: ['/non/existent/file.css']
      })).rejects.toThrow();
    });
  });

  describe('renderHTMLSync with CSS', () => {
    it('should render synchronously with CSS links only', () => {
      const html = renderHTMLSync(SimpleComponent(), {
        cssLinks: ['https://example.com/style.css'],
        cssInline: '.test { color: blue; }'
      });

      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain('<link rel="stylesheet" href="https://example.com/style.css">');
      expect(html).toContain('<style>.test { color: blue; }</style>');
      expect(html).toContain('<div class="container">');
    });

    it('should warn and return promise when CSS files are detected', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = renderHTMLSync(SimpleComponent(), {
        cssFiles: [mainCSSPath]
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSS files detected, use renderHTML()')
      );
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('render alias function', () => {
    it('should work as alias for renderHTML', async () => {
      const html = await render(SimpleComponent(), {
        cssFiles: [mainCSSPath],
        cssInline: '.alias-test { color: green; }'
      });

      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain('font-family: Arial, sans-serif');
      expect(html).toContain('.alias-test { color: green; }');
    });
  });

  describe('CSS order and precedence', () => {
    it('should maintain correct CSS loading order', async () => {
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath, componentCSSPath],
        cssLinks: ['https://example.com/reset.css'],
        cssInline: '.override { color: red; }'
      });

      const content = html.toString();
      
      // CSS files should come first
      const mainCSSIndex = content.indexOf('font-family: Arial');
      const componentCSSIndex = content.indexOf('background: #007bff');
      
      // Then external links
      const linkIndex = content.indexOf('https://example.com/reset.css');
      
      // Then inline styles
      const inlineIndex = content.indexOf('.override { color: red; }');

      expect(mainCSSIndex).toBeLessThan(componentCSSIndex);
      expect(componentCSSIndex).toBeLessThan(linkIndex);
      expect(linkIndex).toBeLessThan(inlineIndex);
    });

    it('should handle CSS cascade correctly', async () => {
      // Create CSS with conflicting rules
      const conflictCSSPath = join(testStylesDir, 'conflict.css');
      await fs.writeFile(conflictCSSPath, `
        .title {
          color: blue;
          font-size: 1.5rem;
        }
      `);

      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [mainCSSPath, conflictCSSPath],
        cssInline: '.title { color: red; }'  // Should override due to cascade
      });

      // Should contain all conflicting rules
      expect(html).toContain('color: #333');    // from main.css
      expect(html).toContain('color: blue');    // from conflict.css
      expect(html).toContain('color: red');     // from inline (highest specificity)
    });
  });

  describe('Performance and caching', () => {
    it('should cache CSS files between renders', async () => {
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      // Render same component multiple times
      await renderHTML(SimpleComponent(), { cssFiles: [mainCSSPath] });
      await renderHTML(SimpleComponent(), { cssFiles: [mainCSSPath] });
      await renderHTML(SimpleComponent(), { cssFiles: [mainCSSPath] });

      // CSS file should only be read once due to caching
      const cssReadCalls = readFileSpy.mock.calls.filter(call => 
        call[0].toString().includes('main.css')
      );
      expect(cssReadCalls.length).toBeLessThanOrEqual(1);
    });

    it('should handle large CSS files efficiently', async () => {
      // Create a large CSS file
      const largeCSSPath = join(testStylesDir, 'large.css');
      const largeCSS = Array.from({ length: 1000 }, (_, i) => 
        `.class-${i} { color: hsl(${i * 0.36}, 70%, 50%); }`
      ).join('\n');
      
      await fs.writeFile(largeCSSPath, largeCSS);

      const startTime = performance.now();
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [largeCSSPath],
        cssMinify: true
      });
      const endTime = performance.now();

      expect(html).toContain('.class-0{color:hsl(0,70%,50%)}');
      expect(html).toContain('.class-999{color:hsl(359.64,70%,50%)}');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty CSS files', async () => {
      const emptyCSSPath = join(testStylesDir, 'empty.css');
      await fs.writeFile(emptyCSSPath, '');

      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [emptyCSSPath]
      });

      expect(html).toContain('<style></style>');
      expect(html).toContain('<div class="container">');
    });

    it('should handle CSS files with syntax errors', async () => {
      const invalidCSSPath = join(testStylesDir, 'invalid.css');
      await fs.writeFile(invalidCSSPath, `
        .valid { color: blue; }
        .invalid { color: ; } /* syntax error */
        .another-valid { color: green; }
      `);

      // Should still load the file but keep invalid CSS as-is
      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [invalidCSSPath]
      });

      expect(html).toContain('.valid { color: blue; }');
      expect(html).toContain('.invalid { color: ; }'); // Invalid CSS preserved
      expect(html).toContain('.another-valid { color: green; }');
    });

    it('should handle special characters in CSS', async () => {
      const specialCSSPath = join(testStylesDir, 'special.css');
      await fs.writeFile(specialCSSPath, `
        .unicode { content: "Unicode: ñáéíóú"; }
        .quotes { content: 'Single "double" quotes'; }
        .symbols { background: url("data:image/svg+xml;utf8,<svg>...</svg>"); }
      `);

      const html = await renderHTML(SimpleComponent(), {
        cssFiles: [specialCSSPath]
      });

      expect(html).toContain('Unicode: ñáéíóú');
      expect(html).toContain('Single "double" quotes');
      expect(html).toContain('data:image/svg+xml');
    });

    it('should handle concurrent CSS loading', async () => {
      const promises = Array.from({ length: 10 }, () =>
        renderHTML(SimpleComponent(), {
          cssFiles: [mainCSSPath, componentCSSPath],
          cssInline: '.concurrent-test { color: orange; }'
        })
      );

      const results = await Promise.all(promises);

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });

      expect(firstResult).toContain('font-family: Arial, sans-serif');
      expect(firstResult).toContain('background: #007bff');
      expect(firstResult).toContain('.concurrent-test { color: orange; }');
    });
  });
});