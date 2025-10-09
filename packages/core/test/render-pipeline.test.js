import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createRenderPipeline,
  middleware,
  hooks,
  customRenderers,
  createCustomRenderer
} from '../src/rendering/render-pipeline.js';

describe('Render Pipeline', () => {
  describe('createRenderPipeline', () => {
    it('should create render pipeline', () => {
      const pipeline = createRenderPipeline();

      expect(pipeline).toBeDefined();
      expect(typeof pipeline.render).toBe('function');
    });

    it('should render simple component', async () => {
      const pipeline = createRenderPipeline();
      const component = { div: { text: 'Hello World' } };

      const result = await pipeline.render(component);
      expect(result).toBe('<div>Hello World</div>');
    });

    it('should render nested components', async () => {
      const pipeline = createRenderPipeline();
      const component = {
        div: {
          children: [
            { p: { text: 'Paragraph 1' } },
            { p: { text: 'Paragraph 2' } }
          ]
        }
      };

      const result = await pipeline.render(component);
      expect(result).toContain('<p>Paragraph 1</p>');
      expect(result).toContain('<p>Paragraph 2</p>');
    });

    it('should escape HTML by default', async () => {
      const pipeline = createRenderPipeline();
      const component = { div: { text: '<script>alert("xss")</script>' } };

      const result = await pipeline.render(component);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should not escape HTML when disabled', async () => {
      const pipeline = createRenderPipeline({ escapeHTML: false });
      const component = { div: { html: '<strong>Bold</strong>' } };

      const result = await pipeline.render(component);
      expect(result).toContain('<strong>Bold</strong>');
    });

    it('should render attributes', async () => {
      const pipeline = createRenderPipeline();
      const component = {
        div: {
          id: 'test',
          className: 'container',
          'data-value': '123',
          text: 'Content'
        }
      };

      const result = await pipeline.render(component);
      expect(result).toContain('id="test"');
      expect(result).toContain('className="container"');
      expect(result).toContain('data-value="123"');
    });

    it('should render boolean attributes', async () => {
      const pipeline = createRenderPipeline();
      const component = {
        input: {
          type: 'checkbox',
          checked: true,
          disabled: false
        }
      };

      const result = await pipeline.render(component);
      expect(result).toContain('checked');
      expect(result).not.toContain('disabled');
    });

    it('should render self-closing tags', async () => {
      const pipeline = createRenderPipeline();
      const component = { img: { src: 'test.jpg', alt: 'Test' } };

      const result = await pipeline.render(component);
      expect(result).toContain('<img');
      expect(result).toContain('/>');
      expect(result).not.toContain('</img>');
    });

    it('should skip event handlers', async () => {
      const pipeline = createRenderPipeline();
      const component = {
        button: {
          text: 'Click',
          onclick: () => alert('clicked')
        }
      };

      const result = await pipeline.render(component);
      expect(result).not.toContain('onclick');
      expect(result).toBe('<button>Click</button>');
    });
  });

  describe('Hooks', () => {
    it('should execute beforeRender hooks', async () => {
      const beforeHook = vi.fn((context) => {
        return { ...context, metadata: { modified: true } };
      });

      const pipeline = createRenderPipeline({
        beforeRender: [beforeHook]
      });

      const component = { div: { text: 'Test' } };
      await pipeline.render(component);

      expect(beforeHook).toHaveBeenCalled();
    });

    it('should execute afterRender hooks', async () => {
      const afterHook = vi.fn((context) => {
        return { ...context, result: context.result + '<!-- modified -->' };
      });

      const pipeline = createRenderPipeline({
        afterRender: [afterHook]
      });

      const component = { div: { text: 'Test' } };
      const result = await pipeline.render(component);

      expect(afterHook).toHaveBeenCalled();
      expect(result).toContain('<!-- modified -->');
    });

    it('should execute multiple hooks in order', async () => {
      const order = [];

      const hook1 = vi.fn((context) => {
        order.push(1);
        return context;
      });

      const hook2 = vi.fn((context) => {
        order.push(2);
        return context;
      });

      const pipeline = createRenderPipeline({
        beforeRender: [hook1, hook2]
      });

      await pipeline.render({ div: { text: 'Test' } });

      expect(order).toEqual([1, 2]);
    });

    it('should add hooks dynamically', async () => {
      const pipeline = createRenderPipeline();
      const hook = vi.fn();

      pipeline.addHook('before', hook);
      await pipeline.render({ div: { text: 'Test' } });

      expect(hook).toHaveBeenCalled();
    });
  });

  describe('Middleware', () => {
    it('should execute middleware', async () => {
      const mw = vi.fn((component, context) => {
        const tag = Object.keys(component)[0];
        return {
          [tag]: {
            ...component[tag],
            'data-processed': 'true'
          }
        };
      });

      const pipeline = createRenderPipeline({
        middleware: [mw]
      });

      const component = { div: { text: 'Test' } };
      const result = await pipeline.render(component);

      expect(mw).toHaveBeenCalled();
      expect(result).toContain('data-processed="true"');
    });

    it('should execute multiple middleware in order', async () => {
      const order = [];

      const mw1 = vi.fn((component) => {
        order.push(1);
        return component;
      });

      const mw2 = vi.fn((component) => {
        order.push(2);
        return component;
      });

      const pipeline = createRenderPipeline({
        middleware: [mw1, mw2]
      });

      await pipeline.render({ div: { text: 'Test' } });

      expect(order).toEqual([1, 2]);
    });

    it('should add middleware dynamically', async () => {
      const pipeline = createRenderPipeline();
      const mw = vi.fn((component) => component);

      pipeline.addMiddleware(mw);
      await pipeline.render({ div: { text: 'Test' } });

      expect(mw).toHaveBeenCalled();
    });
  });

  describe('Custom Renderers', () => {
    it('should use custom renderer', async () => {
      const customRenderer = (props) => {
        return `<custom>${props.text}</custom>`;
      };

      const pipeline = createRenderPipeline({
        customRenderers: {
          custom: customRenderer
        }
      });

      const component = { custom: { text: 'Custom content' } };
      const result = await pipeline.render(component);

      expect(result).toBe('<custom>Custom content</custom>');
    });

    it('should register custom renderer dynamically', async () => {
      const pipeline = createRenderPipeline();

      pipeline.registerRenderer('special', (props) => {
        return `<div class="special">${props.text}</div>`;
      });

      const component = { special: { text: 'Special' } };
      const result = await pipeline.render(component);

      expect(result).toContain('class="special"');
    });

    it('should pass render context to custom renderer', async () => {
      const renderer = vi.fn((props, context) => {
        expect(context.depth).toBeDefined();
        return `<div>${props.text}</div>`;
      });

      const pipeline = createRenderPipeline({
        customRenderers: {
          test: renderer
        }
      });

      await pipeline.render({ test: { text: 'Test' } });
      expect(renderer).toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should cache render results', async () => {
      const pipeline = createRenderPipeline({ enableCache: true });
      const component = { div: { text: 'Cached' } };

      const result1 = await pipeline.render(component);
      const result2 = await pipeline.render(component);

      expect(result1).toBe(result2);

      const stats = pipeline.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      const pipeline = createRenderPipeline({ enableCache: true });
      const component = { div: { text: 'Test' } };

      await pipeline.render(component);
      pipeline.clearCache();

      const stats = pipeline.getStats();
      expect(stats.cacheSize).toBe(0);
    });

    it('should use shouldCache function', async () => {
      const shouldCache = vi.fn(() => false);

      const pipeline = createRenderPipeline({
        enableCache: true,
        shouldCache
      });

      await pipeline.render({ div: { text: 'Test' } });

      expect(shouldCache).toHaveBeenCalled();
      const stats = pipeline.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should track render statistics', async () => {
      const pipeline = createRenderPipeline({
        performance: { enabled: true }
      });

      await pipeline.render({ div: { text: 'Test' } });
      await pipeline.render({ p: { text: 'Test' } });

      const stats = pipeline.getStats();
      expect(stats.renders).toBe(2);
      expect(stats.averageRenderTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect slow renders', async () => {
      const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const pipeline = createRenderPipeline({
        performance: {
          enabled: true,
          logSlowRenders: true,
          threshold: 0 // All renders are "slow"
        }
      });

      await pipeline.render({ div: { text: 'Test' } });

      const stats = pipeline.getStats();
      expect(stats.slowRenders).toBeGreaterThan(0);

      logSpy.mockRestore();
    });
  });

  describe('Common Middleware', () => {
    it('addClassName middleware', async () => {
      const pipeline = createRenderPipeline({
        middleware: [middleware.addClassName('added-class')]
      });

      const component = { div: { text: 'Test', className: 'original' } };
      const result = await pipeline.render(component);

      expect(result).toContain('original added-class');
    });

    it('addDataAttributes middleware', async () => {
      const pipeline = createRenderPipeline({
        middleware: [middleware.addDataAttributes({ 'data-test': 'value' })]
      });

      const component = { div: { text: 'Test' } };
      const result = await pipeline.render(component);

      expect(result).toContain('data-test="value"');
    });

    it('conditional middleware', async () => {
      const condition = (component) => {
        const tag = Object.keys(component)[0];
        return tag === 'div';
      };

      const transform = (component) => {
        return { span: component.div };
      };

      const pipeline = createRenderPipeline({
        middleware: [middleware.conditional(condition, transform)]
      });

      const result = await pipeline.render({ div: { text: 'Test' } });
      expect(result).toContain('<span>');
    });
  });

  describe('Common Hooks', () => {
    it('debugLog hook', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const pipeline = createRenderPipeline({
        beforeRender: [hooks.debugLog()]
      });

      await pipeline.render({ div: { text: 'Test' } });

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('injectMetadata hook', async () => {
      const metadata = { timestamp: Date.now() };

      const pipeline = createRenderPipeline({
        beforeRender: [hooks.injectMetadata(metadata)]
      });

      const verifyHook = vi.fn((context) => {
        expect(context.metadata.timestamp).toBeDefined();
      });

      pipeline.addHook('before', verifyHook);

      await pipeline.render({ div: { text: 'Test' } });
      expect(verifyHook).toHaveBeenCalled();
    });
  });

  describe('Custom Renderers Helpers', () => {
    it('markdown renderer', async () => {
      const pipeline = createRenderPipeline({
        customRenderers: {
          markdown: customRenderers.markdown
        }
      });

      const component = {
        markdown: {
          text: '# Heading\n**bold** *italic*'
        }
      };

      const result = await pipeline.render(component);
      expect(result).toContain('<h1>Heading</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('codeBlock renderer', async () => {
      const pipeline = createRenderPipeline({
        customRenderers: {
          code: customRenderers.codeBlock
        }
      });

      const component = {
        code: {
          text: 'const x = 42;',
          language: 'javascript'
        }
      };

      const result = await pipeline.render(component);
      expect(result).toContain('<pre><code');
      expect(result).toContain('language-javascript');
    });

    it('icon renderer', async () => {
      const pipeline = createRenderPipeline({
        customRenderers: {
          icon: customRenderers.icon
        }
      });

      const component = {
        icon: {
          name: 'home',
          size: '24',
          color: 'blue'
        }
      };

      const result = await pipeline.render(component);
      expect(result).toContain('<svg');
      expect(result).toContain('icon-home');
      expect(result).toContain('24');
    });
  });

  describe('Error Handling', () => {
    it('should handle hook errors', async () => {
      const errorHook = () => {
        throw new Error('Hook error');
      };

      const pipeline = createRenderPipeline({
        beforeRender: [errorHook]
      });

      await expect(pipeline.render({ div: { text: 'Test' } })).rejects.toThrow('Hook error');
    });

    it('should handle middleware errors', async () => {
      const errorMiddleware = () => {
        throw new Error('Middleware error');
      };

      const pipeline = createRenderPipeline({
        middleware: [errorMiddleware]
      });

      await expect(pipeline.render({ div: { text: 'Test' } })).rejects.toThrow('Middleware error');
    });

    it('should log errors in debug mode', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorHook = () => {
        throw new Error('Test error');
      };

      const pipeline = createRenderPipeline({
        debug: true,
        beforeRender: [errorHook]
      });

      await expect(pipeline.render({ div: { text: 'Test' } })).rejects.toThrow();
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('Options', () => {
    it('should expose options', () => {
      const pipeline = createRenderPipeline({
        escapeHTML: false,
        enableCache: true
      });

      const options = pipeline.options;
      expect(options.escapeHTML).toBe(false);
      expect(options.enableCache).toBe(true);
    });
  });
});
