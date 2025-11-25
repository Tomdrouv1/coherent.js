import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  escapeHtml,
  unescapeHtml,
  isVoidElement,
  formatAttributes,
  minifyHtml,
  voidElements
} from '../src/core/html-utils.js';

describe('HTML Utils', () => {
  beforeEach(() => {
    // Clear any global registries before each test
    if (typeof global !== 'undefined') {
      delete global.__coherentActionRegistry;
      delete global.__coherentActionRegistryLog;
    }
    if (typeof window !== 'undefined') {
      delete window.__coherentActionRegistry;
    }
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<div>Hello & "world"</div>')).toBe('&lt;div&gt;Hello &amp; &quot;world&quot;&lt;/div&gt;');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's a test")).toBe('It&#39;s a test');
    });

    it('should handle multiple special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should return non-string values unchanged', () => {
      expect(escapeHtml(42)).toBe(42);
      expect(escapeHtml(null)).toBe(null);
      expect(escapeHtml(undefined)).toBe(undefined);
      expect(escapeHtml({})).toEqual({});
      expect(escapeHtml([])).toEqual([]);
    });

    it('should handle strings without special characters', () => {
      expect(escapeHtml('plain text')).toBe('plain text');
    });

    it('should handle already escaped content', () => {
      expect(escapeHtml('&lt;div&gt;')).toBe('&amp;lt;div&amp;gt;');
    });
  });

  describe('unescapeHtml', () => {
    it('should unescape HTML entities', () => {
      expect(unescapeHtml('&lt;div&gt;Hello &amp; &quot;world&quot;&lt;/div&gt;')).toBe('<div>Hello & "world"</div>');
    });

    it('should unescape single quotes', () => {
      expect(unescapeHtml('It&#39;s a test')).toBe("It's a test");
    });

    it('should handle multiple special characters', () => {
      expect(unescapeHtml('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')).toBe('<script>alert("XSS")</script>');
    });

    it('should handle empty strings', () => {
      expect(unescapeHtml('')).toBe('');
    });

    it('should return non-string values unchanged', () => {
      expect(unescapeHtml(42)).toBe(42);
      expect(unescapeHtml(null)).toBe(null);
      expect(unescapeHtml(undefined)).toBe(undefined);
      expect(unescapeHtml({})).toEqual({});
      expect(unescapeHtml([])).toEqual([]);
    });

    it('should handle plain text without entities', () => {
      expect(unescapeHtml('plain text')).toBe('plain text');
    });

    it('should handle partial unescaping', () => {
      expect(unescapeHtml('Hello &amp; world')).toBe('Hello & world');
    });
  });

  describe('isVoidElement', () => {
    it('should identify void elements', () => {
      expect(isVoidElement('br')).toBe(true);
      expect(isVoidElement('img')).toBe(true);
      expect(isVoidElement('input')).toBe(true);
      expect(isVoidElement('hr')).toBe(true);
      expect(isVoidElement('link')).toBe(true);
      expect(isVoidElement('meta')).toBe(true);
      expect(isVoidElement('area')).toBe(true);
      expect(isVoidElement('base')).toBe(true);
      expect(isVoidElement('col')).toBe(true);
      expect(isVoidElement('embed')).toBe(true);
      expect(isVoidElement('param')).toBe(true);
      expect(isVoidElement('source')).toBe(true);
      expect(isVoidElement('track')).toBe(true);
      expect(isVoidElement('wbr')).toBe(true);
    });

    it('should handle case insensitive tag names', () => {
      expect(isVoidElement('BR')).toBe(true);
      expect(isVoidElement('Img')).toBe(true);
      expect(isVoidElement('INPUT')).toBe(true);
      expect(isVoidElement('Hr')).toBe(true);
    });

    it('should reject non-void elements', () => {
      expect(isVoidElement('div')).toBe(false);
      expect(isVoidElement('span')).toBe(false);
      expect(isVoidElement('p')).toBe(false);
      expect(isVoidElement('section')).toBe(false);
      expect(isVoidElement('article')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isVoidElement(null)).toBe(false);
      expect(isVoidElement(undefined)).toBe(false);
      expect(isVoidElement(42)).toBe(false);
      expect(isVoidElement({})).toBe(false);
      expect(isVoidElement([])).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(isVoidElement('')).toBe(false);
    });
  });

  describe('formatAttributes', () => {
    it('should format basic attributes', () => {
      const props = { id: 'test', className: 'container' };
      const result = formatAttributes(props);

      expect(result).toContain('id="test"');
      expect(result).toContain('class="container"');
    });

    it('should convert className to class', () => {
      const props = { className: 'my-class' };
      const result = formatAttributes(props);

      expect(result).toContain('class="my-class"');
      expect(result).not.toContain('className');
    });

    it('should handle boolean attributes', () => {
      const props = { disabled: true, hidden: false };
      const result = formatAttributes(props);

      expect(result).toContain('disabled');
      expect(result).not.toContain('hidden');
    });

    it('should handle numeric values', () => {
      const props = { width: 100, height: 200 };
      const result = formatAttributes(props);

      expect(result).toContain('width="100"');
      expect(result).toContain('height="200"');
    });

    it('should handle string values with quotes', () => {
      const props = { title: 'Test "quote"' };
      const result = formatAttributes(props);

      expect(result).toContain('title="Test &quot;quote&quot;"');
    });

    it('should handle event handlers', () => {
      const handleClick = () => {};
      const props = { onClick: handleClick };

      // Mock global for server-side testing
      global.__coherentActionRegistry = {};

      const result = formatAttributes(props);

      expect(result).toContain('data-action=');
      expect(global.__coherentActionRegistry).toBeDefined();
    });

    it('should handle empty props object', () => {
      const result = formatAttributes({});
      expect(result).toBe('');
    });

    it('should handle null and undefined values', () => {
      const props = { id: 'test', value: null, placeholder: undefined };
      const result = formatAttributes(props);

      expect(result).toContain('id="test"');
      expect(result).not.toContain('value');
      expect(result).not.toContain('placeholder');
    });

    it('should handle special characters in values', () => {
      const props = { alt: 'Image with & and < > characters' };
      const result = formatAttributes(props);

      expect(result).toContain('alt="Image with &amp; and &lt; &gt; characters"');
    });

    it('should handle data attributes', () => {
      const props = { 'data-test': 'value', 'data-id': '123' };
      const result = formatAttributes(props);

      expect(result).toContain('data-test="value"');
      expect(result).toContain('data-id="123"');
    });

    it('should handle aria attributes', () => {
      const props = { 'aria-label': 'Close', 'role': 'button' };
      const result = formatAttributes(props);

      expect(result).toContain('aria-label="Close"');
      expect(result).toContain('role="button"');
    });

    it('should handle function attributes that are not event handlers', () => {
      const getValue = () => 'dynamic-value';
      const props = { value: getValue };
      const result = formatAttributes(props);

      expect(result).toContain('value="dynamic-value"');
    });

    it('should handle function attributes that throw errors', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorFunction = () => {
        throw new Error('Function execution failed');
      };
      const props = { value: errorFunction };
      const result = formatAttributes(props);

      expect(result).toContain('value=""');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error executing function for attribute'),
        expect.objectContaining({
          _error: 'Function execution failed',
          attributeKey: 'value'
        })
      );
      consoleSpy.mockRestore();
    });

    it('should handle all event handler types', () => {
      const handlers = {
        onClick: vi.fn(),
        onChange: vi.fn(),
        onSubmit: vi.fn(),
        onMouseOver: vi.fn(),
        onFocus: vi.fn(),
        onBlur: vi.fn()
      };

      const result = formatAttributes(handlers);

      expect(result).toContain('data-event="Click"');
      expect(result).toContain('data-event="Change"');
      expect(result).toContain('data-event="Submit"');
      expect(result).toContain('data-event="MouseOver"');
      expect(result).toContain('data-event="Focus"');
      expect(result).toContain('data-event="Blur"');
    });

    it('should handle complex objects in attributes', () => {
      const props = { 'data-config': { key: 'value', nested: { prop: true } } };
      const result = formatAttributes(props);

      expect(result).toContain('data-config="[object Object]"');
    });

    it('should handle arrays in attributes', () => {
      const props = { 'data-items': ['item1', 'item2', 'item3'] };
      const result = formatAttributes(props);

      expect(result).toContain('data-items="item1,item2,item3"');
    });

    it('should handle zero and empty string values', () => {
      const props = { value: 0, placeholder: '', count: 0 };
      const result = formatAttributes(props);

      expect(result).toContain('value="0"');
      expect(result).toContain('placeholder=""');
      expect(result).toContain('count="0"');
    });

    it('should log debug information for action registry when debug is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock debug environment
      const originalProcess = process?.env;
      if (typeof process !== 'undefined') {
        process.env = { ...process.env, COHERENT_DEBUG: '1' };
      }

      const handleClick = vi.fn();
      const props = { onClick: handleClick };

      const _result = formatAttributes(props);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialized global action registry')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Added action')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Global registry keys')
      );

      // Restore
      if (originalProcess) {
        process.env = originalProcess;
      }
      consoleSpy.mockRestore();
    });

    it('should maintain action registry log when debug is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock debug environment
      const originalProcess = process?.env;
      if (typeof process !== 'undefined') {
        process.env = { ...process.env, COHERENT_DEBUG: '1' };
      }

      const handleClick = vi.fn();
      const props = { onClick: handleClick };

      const _result = formatAttributes(props);

      expect(global.__coherentActionRegistryLog).toBeDefined();
      expect(Array.isArray(global.__coherentActionRegistryLog)).toBe(true);
      expect(global.__coherentActionRegistryLog.length).toBe(1);
      expect(global.__coherentActionRegistryLog[0]).toMatchObject({
        action: 'add',
        actionId: expect.stringContaining('__coherent_action_'),
        timestamp: expect.any(Number),
        registrySize: 1
      });

      // Restore
      if (originalProcess) {
        process.env = originalProcess;
      }
      consoleSpy.mockRestore();
    });
  });

  describe('minifyHtml', () => {
    it('should return original HTML when minify is disabled', () => {
      const html = '<div>   <span>  Text  </span>   </div>';
      const result = minifyHtml(html, { minify: false });

      expect(result).toBe(html);
    });

    it('should minify HTML by default when minify option is true', () => {
      const html = '<div>   <span>  Text  </span>   </div>';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<div><span> Text </span></div>');
    });

    it('should remove HTML comments', () => {
      const html = '<div><!-- This is a comment -->Content</div>';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<div>Content</div>');
    });

    it('should collapse multiple whitespace characters', () => {
      const html = '<div>    Multiple    spaces    </div>';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<div> Multiple spaces </div>');
    });

    it('should remove whitespace around tags', () => {
      const html = '<div> <span>Text</span> </div>';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<div><span>Text</span></div>');
    });

    it('should handle complex HTML with nested elements', () => {
      const html = `
        <html>
          <head>
            <title>  Test  </title>
          </head>
          <body>
            <div class="container">
              <p>  Content here  </p>
            </div>
          </body>
        </html>
      `;
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<html><head><title> Test </title></head><body><div class="container"><p> Content here </p></div></body></html>');
    });

    it('should handle empty HTML', () => {
      expect(minifyHtml('', { minify: true })).toBe('');
    });

    it('should handle HTML with only whitespace', () => {
      const html = '    \n\t   ';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('');
    });

    it('should preserve script and style content when minifying', () => {
      const html = '<script>  var x = 1;  </script><style>  .test { color: red; }  </style>';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<script> var x = 1; </script><style> .test { color: red; } </style>');
    });

    it('should handle multiline comments', () => {
      const html = '<div><!--\nMulti-line\ncomment\n-->Content</div>';
      const result = minifyHtml(html, { minify: true });

      expect(result).toBe('<div>Content</div>');
    });
  });

  describe('voidElements constant', () => {
    it('should export voidElements as a Set', () => {
      expect(voidElements).toBeInstanceOf(Set);
    });

    it('should contain all expected void elements', () => {
      const expectedElements = [
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'
      ];

      expectedElements.forEach(element => {
        expect(voidElements.has(element)).toBe(true);
      });
    });

    it('should not contain non-void elements', () => {
      expect(voidElements.has('div')).toBe(false);
      expect(voidElements.has('span')).toBe(false);
      expect(voidElements.has('p')).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex attribute formatting with mixed types', () => {
      const props = {
        id: 'test-element',
        className: 'container active',
        disabled: true,
        'data-count': 5,
        onClick: () => {},
        title: 'Test "title" with & symbols'
      };

      // Mock global registry
      global.__coherentActionRegistry = {};

      const result = formatAttributes(props);

      expect(result).toContain('id="test-element"');
      expect(result).toContain('class="container active"');
      expect(result).toContain('disabled');
      expect(result).toContain('data-count="5"');
      expect(result).toContain('data-action=');
      expect(result).toContain('title="Test &quot;title&quot; with &amp; symbols"');
    });

    it('should round-trip HTML escaping and unescaping', () => {
      const original = '<div class="test">Content & "quotes"</div>';
      const escaped = escapeHtml(original);
      const unescaped = unescapeHtml(escaped);

      expect(unescaped).toBe(original);
    });

    it('should handle complete HTML processing pipeline', () => {
      const html = '<div class="container">  <p>  Content & "text"  </p>  </div>';
      const minified = minifyHtml(html, { minify: true });

      expect(minified).toBe('<div class="container"><p> Content & "text" </p></div>');
    });
  });
});
