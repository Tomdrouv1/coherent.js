/**
 * Unit tests for CSS Manager functionality
 * Tests CSS file loading, caching, minification, and HTML generation
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
  CSSManager, 
  createCSSManager, 
  defaultCSSManager,
  cssUtils 
} from '../src/rendering/css-manager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures', 'css');

// Test fixtures
const testCSS = `
/* Test CSS file */
.test-class {
  color: red;
  background-color: blue;
  padding: 10px;
  margin: 5px;
}

.another-class {
  font-size: 16px;
  line-height: 1.5;
  text-align: center;
}
`;

const minifiedTestCSS = '.test-class{color:red;background-color:blue;padding:10px;margin:5px}.another-class{font-size:16px;line-height:1.5;text-align:center}';

describe('CSSManager', () => {
  let testCSSFile;
  let cssManager;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(fixturesDir, { recursive: true });
    
    // Create test CSS file
    testCSSFile = join(fixturesDir, 'test.css');
    await fs.writeFile(testCSSFile, testCSS);
    
    // Create fresh CSS manager for each test
    cssManager = createCSSManager({
      baseDir: fixturesDir,
      enableCache: true,
      minify: false
    });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(fixturesDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
    
    // Clear any mocks
    vi.clearAllMocks();
  });

  describe('CSSManager creation', () => {
    it('should create a CSS manager with default options', () => {
      const manager = createCSSManager();
      expect(manager).toBeInstanceOf(CSSManager);
    });

    it('should create a CSS manager with custom options', () => {
      const manager = createCSSManager({
        baseDir: '/custom/path',
        enableCache: false,
        minify: true
      });
      expect(manager).toBeInstanceOf(CSSManager);
    });

    it('should export default CSS manager instance', () => {
      expect(defaultCSSManager).toBeInstanceOf(CSSManager);
    });
  });

  describe('loadCSSFile', () => {
    it('should load CSS file successfully', async () => {
      const css = await cssManager.loadCSSFile('test.css');
      expect(css).toBe(testCSS);
    });

    it('should handle absolute paths', async () => {
      const css = await cssManager.loadCSSFile(testCSSFile);
      expect(css).toBe(testCSS);
    });

    it('should cache loaded CSS files', async () => {
      const spy = vi.spyOn(fs, 'readFile');
      
      // Load file twice
      await cssManager.loadCSSFile('test.css');
      await cssManager.loadCSSFile('test.css');
      
      // Should only read file once due to caching
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throw error for non-existent file', async () => {
      await expect(cssManager.loadCSSFile('nonexistent.css')).rejects.toThrow();
    });

    it('should handle empty CSS files', async () => {
      const emptyFile = join(fixturesDir, 'empty.css');
      await fs.writeFile(emptyFile, '');
      
      const css = await cssManager.loadCSSFile('empty.css');
      expect(css).toBe('');
    });
  });

  describe('minifyCSS', () => {
    it('should minify CSS content', () => {
      const minified = cssManager.minifyCSS(testCSS);
      expect(minified).toBe(minifiedTestCSS);
    });

    it('should handle empty CSS', () => {
      const minified = cssManager.minifyCSS('');
      expect(minified).toBe('');
    });

    it('should remove comments', () => {
      const cssWithComments = `
        /* This is a comment */
        .class {
          color: red; /* inline comment */
        }
        /* Another comment */
      `;
      
      const minified = cssManager.minifyCSS(cssWithComments);
      expect(minified).toBe('.class{color:red}');
    });

    it('should preserve content inside quotes', () => {
      const cssWithQuotes = `.class { content: "Hello /* not a comment */"; }`;
      const minified = cssManager.minifyCSS(cssWithQuotes);
      expect(minified).toBe(`.class{content:"Hello /* not a comment */"}`);
    });
  });

  describe('generateCSSLinks', () => {
    it('should generate link tags for CSS files', () => {
      const links = cssManager.generateCSSLinks(['style1.css', 'style2.css']);
      expect(links).toBe(
        '<link rel="stylesheet" href="/style1.css">\n<link rel="stylesheet" href="/style2.css">'
      );
    });

    it('should handle custom base URL', () => {
      const links = cssManager.generateCSSLinks(['style.css'], '/assets/');
      expect(links).toBe('<link rel="stylesheet" href="/assets/style.css">');
    });

    it('should handle absolute URLs', () => {
      const links = cssManager.generateCSSLinks(['https://example.com/style.css']);
      expect(links).toBe('<link rel="stylesheet" href="https://example.com/style.css">');
    });

    it('should handle empty array', () => {
      const links = cssManager.generateCSSLinks([]);
      expect(links).toBe('');
    });
  });

  describe('generateInlineStyles', () => {
    it('should generate style tag for CSS content', () => {
      const styles = cssManager.generateInlineStyles('.test { color: red; }');
      expect(styles).toBe('<style>.test { color: red; }</style>');
    });

    it('should handle empty CSS', () => {
      const styles = cssManager.generateInlineStyles('');
      expect(styles).toBe('<style></style>');
    });

    it('should escape potential script content', () => {
      const maliciousCSS = '.test { color: red; } </style><script>alert("xss")</script><style>';
      const styles = cssManager.generateInlineStyles(maliciousCSS);
      expect(styles).not.toContain('<script>');
      expect(styles).toContain('&lt;script&gt;');
    });
  });

  describe('caching behavior', () => {
    it('should cache CSS files when enabled', async () => {
      const cachedManager = createCSSManager({
        baseDir: fixturesDir,
        enableCache: true
      });
      
      const spy = vi.spyOn(fs, 'readFile');
      
      // Load same file multiple times
      await cachedManager.loadCSSFile('test.css');
      await cachedManager.loadCSSFile('test.css');
      await cachedManager.loadCSSFile('test.css');
      
      // Should only read once due to caching
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not cache CSS files when disabled', async () => {
      const noCacheManager = createCSSManager({
        baseDir: fixturesDir,
        enableCache: false
      });
      
      const spy = vi.spyOn(fs, 'readFile');
      
      // Load same file multiple times
      await noCacheManager.loadCSSFile('test.css');
      await noCacheManager.loadCSSFile('test.css');
      
      // Should read file each time
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock fs.readFile to throw an error
      vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Permission denied'));
      
      await expect(cssManager.loadCSSFile('test.css')).rejects.toThrow('Permission denied');
    });

    it('should handle invalid file paths', async () => {
      await expect(cssManager.loadCSSFile(null)).rejects.toThrow();
      await expect(cssManager.loadCSSFile(undefined)).rejects.toThrow();
    });
  });
});

describe('cssUtils', () => {
  describe('processCSSOptions', () => {
    it('should process CSS options from render options', () => {
      const options = {
        cssFiles: ['main.css'],
        cssLinks: ['https://example.com/style.css'],
        cssInline: '.test { color: red; }',
        cssMinify: true
      };
      
      const cssOptions = cssUtils.processCSSOptions(options);
      expect(cssOptions).toEqual({
        files: ['main.css'],
        links: ['https://example.com/style.css'],
        inline: '.test { color: red; }',
        minify: true
      });
    });

    it('should handle missing CSS options', () => {
      const cssOptions = cssUtils.processCSSOptions({});
      expect(cssOptions).toEqual({
        files: [],
        links: [],
        inline: '',
        minify: false
      });
    });

    it('should handle partial CSS options', () => {
      const cssOptions = cssUtils.processCSSOptions({
        cssFiles: ['style.css']
      });
      expect(cssOptions).toEqual({
        files: ['style.css'],
        links: [],
        inline: '',
        minify: false
      });
    });
  });

  describe('generateCSSHtml', () => {
    let tempCSSFile;
    
    beforeEach(async () => {
      await fs.mkdir(fixturesDir, { recursive: true });
      tempCSSFile = join(fixturesDir, 'temp.css');
      await fs.writeFile(tempCSSFile, '.temp { color: green; }');
    });

    it('should generate HTML for all CSS sources', async () => {
      const cssOptions = {
        files: ['temp.css'],
        links: ['https://example.com/style.css'],
        inline: '.inline { color: blue; }',
        minify: false
      };
      
      const testManager = createCSSManager({
        baseDir: fixturesDir,
        enableCache: false
      });
      
      const html = await cssUtils.generateCSSHtml(cssOptions, testManager);
      
      expect(html).toContain('<style>.temp { color: green; }</style>');
      expect(html).toContain('<link rel="stylesheet" href="https://example.com/style.css">');
      expect(html).toContain('<style>.inline { color: blue; }</style>');
    });

    it('should handle empty CSS options', async () => {
      const cssOptions = {
        files: [],
        links: [],
        inline: '',
        minify: false
      };
      
      const html = await cssUtils.generateCSSHtml(cssOptions, cssManager);
      expect(html).toBe('');
    });

    it('should minify CSS when requested', async () => {
      const cssOptions = {
        files: ['temp.css'],
        links: [],
        inline: '.inline { color: blue; }',
        minify: true
      };
      
      const testManager = createCSSManager({
        baseDir: fixturesDir,
        enableCache: false,
        minify: true
      });
      
      const html = await cssUtils.generateCSSHtml(cssOptions, testManager);
      
      expect(html).toContain('<style>.temp{color:green}</style>');
      expect(html).toContain('<style>.inline{color:blue}</style>');
    });
  });
});

describe('Integration tests', () => {
  let testDir;
  let mainCSS;
  let componentCSS;
  
  beforeEach(async () => {
    testDir = join(__dirname, 'fixtures', 'integration');
    await fs.mkdir(testDir, { recursive: true });
    
    mainCSS = join(testDir, 'main.css');
    componentCSS = join(testDir, 'components.css');
    
    await fs.writeFile(mainCSS, `
      body { font-family: Arial, sans-serif; }
      .container { max-width: 1200px; margin: 0 auto; }
    `);
    
    await fs.writeFile(componentCSS, `
      .btn { padding: 0.5rem 1rem; border: none; }
      .btn-primary { background: blue; color: white; }
    `);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it('should handle complex CSS loading scenario', async () => {
    const manager = createCSSManager({
      baseDir: testDir,
      enableCache: true,
      minify: true
    });
    
    const cssOptions = {
      files: ['main.css', 'components.css'],
      links: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap'],
      inline: '.custom { color: red; font-weight: bold; }',
      minify: true
    };
    
    const html = await cssUtils.generateCSSHtml(cssOptions, manager);
    
    // Should contain all CSS sources
    expect(html).toContain('font-family:Arial,sans-serif');  // minified main.css
    expect(html).toContain('background:blue');              // minified components.css
    expect(html).toContain('https://fonts.googleapis.com'); // external link
    expect(html).toContain('.custom{color:red');            // minified inline CSS
  });

  it('should maintain correct CSS order', async () => {
    const manager = createCSSManager({
      baseDir: testDir,
      enableCache: false
    });
    
    const cssOptions = {
      files: ['main.css', 'components.css'],
      links: ['https://example.com/reset.css'],
      inline: '.override { color: red; }',
      minify: false
    };
    
    const html = await cssUtils.generateCSSHtml(cssOptions, manager);
    
    // CSS should be in correct order: files first, then links, then inline
    const mainIndex = html.indexOf('font-family: Arial');
    const componentIndex = html.indexOf('.btn {');
    const linkIndex = html.indexOf('https://example.com/reset.css');
    const inlineIndex = html.indexOf('.override');
    
    expect(mainIndex).toBeLessThan(componentIndex);
    expect(componentIndex).toBeLessThan(linkIndex);
    expect(linkIndex).toBeLessThan(inlineIndex);
  });
});