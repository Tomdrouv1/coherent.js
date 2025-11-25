import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSSManager } from '../src/rendering/css-manager.js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fs module
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn()
  }
}));

describe('CSSManager', () => {
  let cssManager;
  let mockFs;

  beforeEach(() => {
    mockFs = fs;
    vi.clearAllMocks();
    cssManager = new CSSManager();
  });

  describe('Constructor and Initialization', () => {
    it('should create CSS manager with default options', () => {
      expect(cssManager.options.basePath).toBe(process.cwd());
      expect(cssManager.options.minify).toBe(false);
      expect(cssManager.options.cache).toBe(true);
      expect(cssManager.options.autoprefixer).toBe(false);
      expect(cssManager.cache).toBeInstanceOf(Map);
      expect(cssManager.loadedFiles).toBeInstanceOf(Set);
    });

    it('should merge custom options with defaults', () => {
      const customOptions = {
        basePath: '/custom/path',
        minify: true,
        cache: false,
        autoprefixer: true
      };

      const customManager = new CSSManager(customOptions);
      expect(customManager.options.basePath).toBe('/custom/path');
      expect(customManager.options.minify).toBe(true);
      expect(customManager.options.cache).toBe(false);
      expect(customManager.options.autoprefixer).toBe(true);
    });

    it('should handle empty options object', () => {
      const emptyManager = new CSSManager({});
      expect(emptyManager.options.basePath).toBe(process.cwd());
      expect(emptyManager.options.cache).toBe(true);
    });
  });

  describe('CSS File Loading', () => {
    it('should load CSS file content successfully', async () => {
      const mockCSS = 'body { margin: 0; padding: 0; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      const result = await cssManager.loadCSSFile('styles.css');

      expect(result).toBe(mockCSS);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve(process.cwd(), 'styles.css'),
        'utf8'
      );
    });

    it('should resolve file path relative to base path', async () => {
      const customManager = new CSSManager({ basePath: '/app' });
      const mockCSS = '.test { color: red; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      await customManager.loadCSSFile('css/test.css');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.resolve('/app', 'css/test.css'),
        'utf8'
      );
    });

    it('should cache content when caching is enabled', async () => {
      const mockCSS = 'h1 { font-size: 24px; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      // First call
      const result1 = await cssManager.loadCSSFile('header.css');
      expect(result1).toBe(mockCSS);

      // Second call should use cache
      const result2 = await cssManager.loadCSSFile('header.css');
      expect(result2).toBe(mockCSS);

      // Should only read file once
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should not cache when caching is disabled', async () => {
      const noCacheManager = new CSSManager({ cache: false });
      const mockCSS = 'p { line-height: 1.5; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      // First call
      const result1 = await noCacheManager.loadCSSFile('paragraph.css');
      expect(result1).toBe(mockCSS);

      // Second call should read file again
      const result2 = await noCacheManager.loadCSSFile('paragraph.css');
      expect(result2).toBe(mockCSS);

      // Should read file twice
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      mockFs.readFile.mockRejectedValue(error);

      const result = await cssManager.loadCSSFile('nonexistent.css');

      // CSSManager returns empty string on errors and logs warning
      expect(result).toBe('');
    });
  });

  describe('CSS Minification', () => {
    it('should minify CSS when minification is enabled', async () => {
      const minifyingManager = new CSSManager({ minify: true });
      const unminifiedCSS = `
        body {
          margin: 0;
          padding: 0;
          /* Comment */
        }

        h1 {
          color: #ff0000;
          font-size: 24px;
        }
      `;
      const expectedMinified = 'body {margin: 0;padding: 0} h1 {color: #ff0000;font-size: 24px}';
      mockFs.readFile.mockResolvedValue(unminifiedCSS);

      const result = await minifyingManager.loadCSSFile('styles.css');

      expect(result).toBe(expectedMinified);
    });

    it('should not minify CSS when minification is disabled', async () => {
      const unminifiedCSS = `
        body {
          margin: 0;
          padding: 0;
        }
      `;
      mockFs.readFile.mockResolvedValue(unminifiedCSS);

      const result = await cssManager.loadCSSFile('styles.css');

      expect(result).toBe(unminifiedCSS);
    });

    it('should handle empty CSS content', async () => {
      const emptyCSS = '';
      mockFs.readFile.mockResolvedValue(emptyCSS);

      const result = await cssManager.loadCSSFile('empty.css');

      expect(result).toBe('');
    });

    it('should remove CSS comments during minification', async () => {
      const minifyingManager = new CSSManager({ minify: true });
      const cssWithComments = `
        /* This is a comment */
        body { margin: 0; }
        /* Another comment */
        h1 { color: red; }
      `;
      const expected = 'body {margin: 0} h1 {color: red}';
      mockFs.readFile.mockResolvedValue(cssWithComments);

      const result = await minifyingManager.loadCSSFile('comments.css');

      expect(result).toBe(expected);
    });
  });

  describe('Cache Management', () => {
    it('should track loaded files', async () => {
      const mockCSS = '.loaded { content: "tracked"; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      await cssManager.loadCSSFile('tracked.css');

      expect(cssManager.loadedFiles.has('tracked.css')).toBe(true);
    });

    it('should get loaded files list', async () => {
      const mockCSS = '.test { content: "listed"; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      await cssManager.loadCSSFile('file1.css');
      await cssManager.loadCSSFile('file2.css');

      const loadedFiles = cssManager.getLoadedFiles();
      expect(loadedFiles).toContain('file1.css');
      expect(loadedFiles).toContain('file2.css');
      expect(loadedFiles).toHaveLength(2);
    });
  });

  describe('CSS Link Generation', () => {
    it('should generate CSS link tags', () => {
      const filePaths = ['styles.css', 'theme.css'];
      const result = cssManager.generateCSSLinks(filePaths);

      expect(result).toContain('<link rel="stylesheet" href="/styles.css" />');
      expect(result).toContain('<link rel="stylesheet" href="/theme.css" />');
    });

    it('should handle single file path', () => {
      const result = cssManager.generateCSSLinks('single.css');

      expect(result).toContain('<link rel="stylesheet" href="/single.css" />');
    });

    it('should handle absolute URLs', () => {
      const filePaths = ['https://cdn.example.com/styles.css'];
      const result = cssManager.generateCSSLinks(filePaths);

      expect(result).toContain('<link rel="stylesheet" href="https://cdn.example.com/styles.css" />');
    });

    it('should normalize multiple slashes in URLs', () => {
      const result = cssManager.generateCSSLinks(['styles.css'], '//base//');

      expect(result).toContain('<link rel="stylesheet" href="/base/styles.css" />');
    });
  });

  describe('Inline Style Generation', () => {
    it('should generate inline style tags', () => {
      const cssContent = 'body { margin: 0; }';
      const result = cssManager.generateInlineStyles(cssContent);

      expect(result).toBe('<style type="text/css">\nbody { margin: 0; }\n</style>');
    });

    it('should handle empty CSS content', () => {
      const result = cssManager.generateInlineStyles('');
      expect(result).toBe('');
    });

    it('should handle null CSS content', () => {
      const result = cssManager.generateInlineStyles(null);
      expect(result).toBe('');
    });
  });

  describe('HTML Escaping', () => {
    it('should handle HTML entities in URLs', () => {
      const filePaths = ['file&name.css'];
      const result = cssManager.generateCSSLinks(filePaths);

      // Should include the URL as-is (no HTML escaping in this implementation)
      expect(result).toContain('<link rel="stylesheet" href="/file&name.css" />');
    });
  });

  describe('Multiple File Loading', () => {
    it('should load multiple CSS files', async () => {
      const mockCSS1 = '.file1 { color: red; }';
      const mockCSS2 = '.file2 { color: blue; }';
      mockFs.readFile
        .mockResolvedValueOnce(mockCSS1)
        .mockResolvedValueOnce(mockCSS2);

      const result = await cssManager.loadCSSFiles(['file1.css', 'file2.css']);

      expect(result).toContain(mockCSS1);
      expect(result).toContain(mockCSS2);
    });

    it('should handle single file in loadCSSFiles', async () => {
      const mockCSS = '.single { color: green; }';
      mockFs.readFile.mockResolvedValue(mockCSS);

      const result = await cssManager.loadCSSFiles('single.css');

      expect(result).toBe(mockCSS);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await cssManager.loadCSSFile('nonexistent.css');

      // CSSManager returns empty string on errors and logs warning
      expect(result).toBe('');
    });

    it('should handle permission errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('EACCES: permission denied'));

      const result = await cssManager.loadCSSFile('protected.css');

      // CSSManager returns empty string on errors and logs warning
      expect(result).toBe('');
    });
  });
});
