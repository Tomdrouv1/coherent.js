import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, getCache, resetCache, getRenderingStats } from '../src/rendering/html-renderer.js';

// Mock the performance monitor to avoid actual monitoring during tests
vi.mock('../src/performance/monitor.js', () => ({
  performanceMonitor: {
    recordMetric: vi.fn(),
    recordError: vi.fn(),
    recordRender: vi.fn(),
    startTimer: vi.fn(() => ({ end: vi.fn() })),
    getStats: vi.fn(() => ({}))
  }
}));

describe('HTML Renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('render', () => {
    it('should render simple HTML components', () => {
      const component = { div: 'Hello World' };
      const result = render(component);

      expect(result).toContain('<div>Hello World</div>');
    });

    it('should render components with attributes', () => {
      const component = {
        div: {
          className: 'container',
          id: 'test',
          text: 'Content'
        }
      };
      const result = render(component);

      expect(result).toContain('<div');
      expect(result).toContain('class="container"');
      expect(result).toContain('id="test"');
      expect(result).toContain('>Content</div>');
    });

    it('should render void elements correctly', () => {
      const component = { input: { type: 'text' } };
      const result = render(component);

      expect(result).toContain('<input type="text">');
    });

    it('should handle boolean attributes', () => {
      const component = {
        input: {
          type: 'checkbox',
          checked: true,
          disabled: false,
          required: true
        }
      };
      const result = render(component);

      expect(result).toContain('checked');
      expect(result).toContain('required');
      expect(result).not.toContain('disabled');
    });

    it('should escape HTML content', () => {
      const component = { div: '<script>alert("xss")</script>' };
      const result = render(component);

      expect(result).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should work with enableCache option', () => {
      const component = { div: 'test' };

      const result1 = render(component, { enableCache: true });
      expect(result1).toContain('<div>test</div>');
    });

    it('should work with enableMonitoring option', () => {
      const component = { div: 'test' };
      const result = render(component, { enableMonitoring: true });

      expect(result).toContain('<div>test</div>');
    });
  });

  describe('Void Elements', () => {
    it('renders void elements with attributes and no closing tag', () => {
      expect(render({ meta: { charset: 'utf-8' } })).toBe('<meta charset="utf-8">');
      expect(render({ img: { src: 'x.png', alt: 'x' } })).toBe('<img src="x.png" alt="x">');
      expect(render({ input: { type: 'text', name: 'q' } })).toBe('<input type="text" name="q">');
      expect(render({ link: { rel: 'stylesheet', href: 'a.css' } })).toBe('<link rel="stylesheet" href="a.css">');
    });

    it('renders bare void elements without a closing tag', () => {
      expect(render({ br: {} })).toBe('<br>');
      expect(render({ hr: {} })).toBe('<hr>');
    });

    it('renders void elements correctly inside children', () => {
      const html = render({
        head: {
          children: [
            { meta: { charset: 'utf-8' } },
            { title: { text: 'T' } }
          ]
        }
      });
      expect(html).toBe('<head><meta charset="utf-8"><title>T</title></head>');
    });

    it('drops content on void elements like a browser would', () => {
      expect(render({ br: { text: 'ignored' } })).toBe('<br>');
    });
  });

  describe('Error Handling', () => {
    it('should throw errors for empty objects', () => {
      expect(() => render({})).toThrow('Invalid component structure');
    });

    it('should handle circular references by throwing errors', () => {
      const circular = { div: null };
      circular.div = circular;

      expect(() => render(circular)).toThrow();
    });

    it('should handle very deep nesting', () => {
      let component = { div: 'root' };
      for (let i = 0; i < 10; i++) {
        component = { div: { children: [component] } };
      }

      expect(() => render(component)).not.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should get cache instance', () => {
      const cache = getCache();
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.clear).toBe('function');
    });

    it('should reset cache', () => {
      resetCache();
      const cache = getCache();
      expect(cache).toBeDefined();
    });
  });

  describe('Rendering Stats', () => {
    it('should get rendering statistics', () => {
      const stats = getRenderingStats();
      expect(typeof stats).toBe('object');
    });

    it('should track render calls', () => {
      render({ div: 'test' });
      const stats = getRenderingStats();

      expect(stats).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle simple form components', () => {
      const component = {
        input: { type: 'text', placeholder: 'Enter text' }
      };

      const result = render(component);

      expect(result).toContain('<input type="text" placeholder="Enter text">');
    });
  });
});
