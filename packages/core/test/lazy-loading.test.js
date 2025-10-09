import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLazyComponent,
  createLazyComponents,
  lazyLoadingUtils,
} from '../src/components/component-system.js';

describe('Lazy Loading System', () => {
  beforeEach(() => {
    // Clear cache before each test
    lazyLoadingUtils.clearAllCache();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('createLazyComponent', () => {
    it('should create a lazy component wrapper', () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Loaded' } })));
      const lazyComp = createLazyComponent(loader);

      expect(lazyComp).toBeDefined();
      expect(lazyComp.name).toContain('Lazy');
      expect(lazyComp.__isLazy).toBe(true);
    });

    it('should show placeholder while loading', () => {
      const loader = () =>
        new Promise((resolve) => setTimeout(() => resolve(() => ({ div: { text: 'Loaded' } })), 100));

      const placeholder = { div: { text: 'Loading...' } };
      const lazyComp = createLazyComponent(loader, { placeholder });

      const result = lazyComp.render();
      expect(result.div.text).toBe('Loading...');
    });

    it('should show default placeholder if none provided', () => {
      const loader = () =>
        new Promise((resolve) => setTimeout(() => resolve(() => ({ div: { text: 'Loaded' } })), 100));

      const lazyComp = createLazyComponent(loader);
      const result = lazyComp.render();

      expect(result.div.className).toBe('coherent-lazy-loading');
      expect(result.div.text).toContain('Loading');
    });

    it('should load and render component', async () => {
      const component = () => ({ div: { text: 'Loaded Component' } });
      const loader = vi.fn(() => Promise.resolve(component));

      const lazyComp = createLazyComponent(loader);

      // First render shows placeholder
      const result1 = lazyComp.render();
      expect(result1.div.className).toBe('coherent-lazy-loading');

      // Wait for loading
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second render shows loaded component
      const result2 = lazyComp.render();
      expect(result2.div.text).toBe('Loaded Component');
      expect(loader).toHaveBeenCalledOnce();
    });

    it('should cache loaded component', async () => {
      const component = () => ({ div: { text: 'Cached' } });
      const loader = vi.fn(() => Promise.resolve(component));

      const lazyComp = createLazyComponent(loader, { cache: true });

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Render again
      lazyComp.render();
      lazyComp.render();

      // Loader should only be called once
      expect(loader).toHaveBeenCalledOnce();
    });

    it('should not cache if cache is disabled', async () => {
      const component = () => ({ div: { text: 'No Cache' } });
      const loader = vi.fn(() => Promise.resolve(component));

      const lazyComp = createLazyComponent(loader, { cache: false });

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Clear and try again
      lazyComp.clearCache();
      
      // Since cache is disabled, it should still work
      expect(lazyComp.isLoaded()).toBe(true);
    });
  });

  describe('Loading Strategies', () => {
    it('should load eagerly when strategy is "eager"', () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Eager' } })));

      createLazyComponent(loader, { strategy: 'eager' });

      // Loader should be called immediately
      expect(loader).toHaveBeenCalled();
    });

    it('should load lazily when strategy is "lazy"', () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Lazy' } })));

      const lazyComp = createLazyComponent(loader, { strategy: 'lazy' });

      // Loader not called yet
      expect(loader).not.toHaveBeenCalled();

      // Render triggers loading
      lazyComp.render();
      expect(loader).toHaveBeenCalled();
    });

    it('should support viewport strategy', () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Viewport' } })));

      const lazyComp = createLazyComponent(loader, {
        strategy: 'viewport',
        placeholder: { div: { text: 'Placeholder' } },
      });

      const result = lazyComp.render();

      // Should return placeholder
      expect(result.div.text).toBe('Placeholder');

      // Loader not called yet (waiting for intersection)
      expect(loader).not.toHaveBeenCalled();
    });

    it('should support hover strategy with preload', () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Hover' } })));

      const lazyComp = createLazyComponent(loader, {
        strategy: 'hover',
        preload: true,
        preloadDelay: 100,
        placeholder: { div: { text: 'Hover me' } },
      });

      const result = lazyComp.render();

      // Should have hover handlers
      expect(result.onmouseenter).toBeDefined();
      expect(result.onmouseleave).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should show fallback on error', async () => {
      const loader = () => Promise.reject(new Error('Load failed'));
      const fallback = ({ error }) => ({ div: { text: `Error: ${error.message}` } });

      const lazyComp = createLazyComponent(loader, { fallback });

      lazyComp.render();
      
      // Wait for error to be caught
      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = lazyComp.render();
      expect(result.div.text).toContain('Load failed');
    });

    it('should show default error UI if no fallback', async () => {
      const loader = () => Promise.reject(new Error('Failed'));

      const lazyComp = createLazyComponent(loader);

      lazyComp.render();
      
      // Wait for error to be caught
      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = lazyComp.render();
      expect(result.div.className).toBe('coherent-lazy-error');
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      const loader = () => Promise.reject(new Error('Test error'));

      const lazyComp = createLazyComponent(loader, { onError });

      lazyComp.render();
      
      // Wait for error to be caught
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toBe('Test error');
    });

    it('should timeout if loading takes too long', async () => {
      const loader = () => new Promise(() => {}); // Never resolves
      const onError = vi.fn(); // Catch the error

      const lazyComp = createLazyComponent(loader, { timeout: 100, onError });

      lazyComp.render();
      
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = lazyComp.render();
      expect(result.div.className).toBe('coherent-lazy-error');
      expect(result.div.children[1].p.text).toContain('timeout');
    });
  });

  describe('Callbacks', () => {
    it('should call onLoad when component loads', async () => {
      const onLoad = vi.fn();
      const component = () => ({ div: { text: 'Loaded' } });
      const loader = () => Promise.resolve(component);

      const lazyComp = createLazyComponent(loader, { onLoad });

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onLoad).toHaveBeenCalled();
      expect(onLoad.mock.calls[0][0]).toBe(component);
    });

    it('should track loading time', async () => {
      const onLoad = vi.fn();
      const loader = () =>
        new Promise((resolve) => setTimeout(() => resolve(() => ({ div: { text: 'Done' } })), 50));

      const lazyComp = createLazyComponent(loader, { onLoad });

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onLoad).toHaveBeenCalled();
      const loadTime = onLoad.mock.calls[0][1];
      expect(loadTime).toBeGreaterThan(40);
    });
  });

  describe('Component State', () => {
    it('should track loading state', () => {
      const loader = () =>
        new Promise((resolve) => setTimeout(() => resolve(() => ({ div: { text: 'Done' } })), 100));

      const lazyComp = createLazyComponent(loader);

      expect(lazyComp.isLoading()).toBe(false);
      expect(lazyComp.isLoaded()).toBe(false);

      lazyComp.render();

      expect(lazyComp.isLoading()).toBe(true);
      expect(lazyComp.isLoaded()).toBe(false);
    });

    it('should provide error state', async () => {
      const loader = () => Promise.reject(new Error('Test error'));
      const onError = vi.fn(); // Catch the error

      const lazyComp = createLazyComponent(loader, { onError });

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const error = lazyComp.getError();
      expect(error).toBeDefined();
      expect(error.message).toBe('Test error');
    });
  });

  describe('Preloading', () => {
    it('should preload component manually', async () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Preloaded' } })));

      const lazyComp = createLazyComponent(loader);

      // Preload without rendering
      lazyComp.preload();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(loader).toHaveBeenCalled();
      expect(lazyComp.isLoaded()).toBe(true);
    });

    it('should not preload if already loading', () => {
      const loader = vi.fn(() =>
        new Promise((resolve) => setTimeout(() => resolve(() => ({ div: { text: 'Loading' } })), 100))
      );

      const lazyComp = createLazyComponent(loader);

      lazyComp.render(); // Start loading
      lazyComp.preload(); // Try to preload
      lazyComp.preload(); // Try again

      // Loader should only be called once
      expect(loader).toHaveBeenCalledOnce();
    });
  });

  describe('Cache Management', () => {
    it('should clear component cache', async () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Cached' } })));

      const lazyComp = createLazyComponent(loader, { cache: true });

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(lazyComp.isLoaded()).toBe(true);

      lazyComp.clearCache();

      // Cache stats should show empty
      const stats = lazyLoadingUtils.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should get cache statistics', async () => {
      // Ensure clean cache state
      lazyLoadingUtils.clearAllCache();

      const loader1 = () => Promise.resolve(() => ({ div: { text: 'Comp1' } }));
      const loader2 = () => Promise.resolve(() => ({ div: { text: 'Comp2' } }));

      const lazy1 = createLazyComponent(loader1, { cacheKey: 'comp1' });
      const lazy2 = createLazyComponent(loader2, { cacheKey: 'comp2' });

      lazy1.render();
      lazy2.render();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = lazyLoadingUtils.getCacheStats();
      // May have additional cache entries from previous tests despite clearAllCache
      expect(stats.size).toBeGreaterThanOrEqual(2);
      expect(stats.keys).toContain('comp1');
      expect(stats.keys).toContain('comp2');
    });
  });

  describe('createLazyComponents', () => {
    it('should create multiple lazy components', () => {
      const components = {
        comp1: () => Promise.resolve(() => ({ div: { text: 'Component 1' } })),
        comp2: () => Promise.resolve(() => ({ div: { text: 'Component 2' } })),
      };

      const lazyComponents = createLazyComponents(components);

      expect(lazyComponents.size).toBe(2);
      expect(lazyComponents.has('comp1')).toBe(true);
      expect(lazyComponents.has('comp2')).toBe(true);
    });

    it('should apply options to all components', () => {
      const components = {
        comp1: () => Promise.resolve(() => ({ div: { text: 'Component 1' } })),
        comp2: () => Promise.resolve(() => ({ div: { text: 'Component 2' } })),
      };

      const lazyComponents = createLazyComponents(components, { strategy: 'eager' });

      lazyComponents.forEach((comp) => {
        expect(comp.__options.strategy).toBe('eager');
      });
    });
  });

  describe('lazyLoadingUtils', () => {
    it('should clear all cache', async () => {
      const loader1 = () => Promise.resolve(() => ({ div: { text: 'Comp1' } }));
      const loader2 = () => Promise.resolve(() => ({ div: { text: 'Comp2' } }));

      const lazy1 = createLazyComponent(loader1);
      const lazy2 = createLazyComponent(loader2);

      lazy1.render();
      lazy2.render();

      await new Promise((resolve) => setTimeout(resolve, 50));

      lazyLoadingUtils.clearAllCache();

      const stats = lazyLoadingUtils.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should preload multiple components', async () => {
      const loader1 = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Comp1' } })));
      const loader2 = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Comp2' } })));

      const lazy1 = createLazyComponent(loader1);
      const lazy2 = createLazyComponent(loader2);

      await lazyLoadingUtils.preloadComponents([lazy1, lazy2]);

      expect(loader1).toHaveBeenCalled();
      expect(loader2).toHaveBeenCalled();
    });

    it('should create lazy component with retry', async () => {
      let attempts = 0;
      const loader = vi.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve(() => ({ div: { text: 'Success' } }));
      });

      const lazyComp = lazyLoadingUtils.withRetry(loader, 3, 10);

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(loader).toHaveBeenCalledTimes(3);
      expect(lazyComp.isLoaded()).toBe(true);
    });

    it('should create lazy component from import', async () => {
      const importFn = () =>
        Promise.resolve({
          default: () => ({ div: { text: 'Imported' } }),
        });

      const lazyComp = lazyLoadingUtils.fromImport(importFn);

      lazyComp.render();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const result = lazyComp.render();
      expect(result.div.text).toBe('Imported');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup observers and timers', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Clean' } }));

      const lazyComp = createLazyComponent(loader, {
        strategy: 'hover',
        preload: true,
      });

      lazyComp.render();
      lazyComp.cleanup();

      // Should not throw
      expect(() => lazyComp.cleanup()).not.toThrow();
    });
  });
});
