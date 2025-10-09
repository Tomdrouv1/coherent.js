import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createLazyComponent,
  withLazyLoading,
  batchLazyLoad,
  preloadComponent,
  initializeLazyLoading
} from '../src/components/lazy-loading.js';

describe('Lazy Loading System', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('createLazyComponent', () => {
    it('should create a lazy component wrapper', () => {
      const loader = vi.fn(() => Promise.resolve(() => ({ div: { text: 'Loaded' } })));
      const lazyComp = createLazyComponent(loader);

      expect(lazyComp).toBeDefined();
      expect(typeof lazyComp).toBe('function');
    });

    it('should return placeholder initially', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Loaded' } }));
      const lazyComp = createLazyComponent(loader);

      const result = lazyComp();
      expect(result.div.className).toBe('coherent-lazy-placeholder');
    });

    it('should use custom placeholder', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Loaded' } }));
      const placeholder = () => ({ span: { text: 'Custom Loading...' } });
      const lazyComp = createLazyComponent(loader, { placeholder });

      const result = lazyComp();
      expect(result.span.text).toBe('Custom Loading...');
    });

    it('should load component with eager strategy', async () => {
      const component = () => ({ div: { text: 'Eager Loaded' } });
      const loader = vi.fn(() => Promise.resolve(component));

      const lazyComp = createLazyComponent(loader, { strategy: 'eager' });

      // Trigger render to start eager loading
      lazyComp();

      // Give time for eager loading
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(loader).toHaveBeenCalled();
    });

    it('should expose getState method', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Test' } }));
      const lazyComp = createLazyComponent(loader);

      const state = lazyComp.getState();
      expect(state).toBeDefined();
      expect(state.status).toBe('pending');
    });

    it('should expose reset method', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Test' } }));
      const lazyComp = createLazyComponent(loader);

      expect(typeof lazyComp.reset).toBe('function');
      expect(() => lazyComp.reset()).not.toThrow();
    });

    it('should expose load method', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Test' } }));
      const lazyComp = createLazyComponent(loader);

      expect(typeof lazyComp.load).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback on load failure', async () => {
      const onError = vi.fn();
      const loader = () => Promise.reject(new Error('Load failed'));

      const lazyComp = createLazyComponent(loader, {
        strategy: 'eager',
        onError,
        retryOnError: false
      });

      // Trigger render to start loading
      lazyComp();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toBe('Load failed');
    });

    it('should show error component on failure', async () => {
      const loader = () => Promise.reject(new Error('Failed'));

      const lazyComp = createLazyComponent(loader, {
        strategy: 'eager',
        retryOnError: false,
        onError: () => {} // Suppress error
      });

      // Trigger render to start loading
      lazyComp();
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = lazyComp();
      expect(result.div.className).toBe('coherent-lazy-error');
    });
  });

  describe('Callbacks', () => {
    it('should call onLoad callback when component loads', async () => {
      const onLoad = vi.fn();
      const component = () => ({ div: { text: 'Loaded' } });
      const loader = () => Promise.resolve(component);

      const lazyComp = createLazyComponent(loader, {
        strategy: 'eager',
        onLoad
      });

      // Trigger render to start loading
      lazyComp();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onLoad).toHaveBeenCalled();
    });
  });

  describe('withLazyLoading', () => {
    it('should create lazy component from regular component', () => {
      const Component = () => ({ div: { text: 'Component' } });
      const lazyComp = withLazyLoading(Component);

      expect(typeof lazyComp).toBe('function');
    });

    it('should accept options', () => {
      const Component = () => ({ div: { text: 'Component' } });
      const lazyComp = withLazyLoading(Component, { strategy: 'idle' });

      expect(typeof lazyComp).toBe('function');
    });
  });

  describe('batchLazyLoad', () => {
    it('should create multiple lazy components', () => {
      const components = [
        { loader: () => Promise.resolve(() => ({ div: { text: 'Comp1' } })) },
        { loader: () => Promise.resolve(() => ({ div: { text: 'Comp2' } })) }
      ];

      const lazyComponents = batchLazyLoad(components);

      expect(Array.isArray(lazyComponents)).toBe(true);
      expect(lazyComponents.length).toBe(2);
      expect(typeof lazyComponents[0]).toBe('function');
      expect(typeof lazyComponents[1]).toBe('function');
    });

    it('should apply options to components', () => {
      const components = [
        {
          loader: () => Promise.resolve(() => ({ div: { text: 'Comp1' } })),
          options: { strategy: 'eager' }
        }
      ];

      const lazyComponents = batchLazyLoad(components);
      expect(lazyComponents.length).toBe(1);
    });
  });

  describe('preloadComponent', () => {
    it('should preload component', async () => {
      const component = () => ({ div: { text: 'Preloaded' } });
      const loader = vi.fn(() => Promise.resolve(component));

      const result = await preloadComponent(loader);

      expect(loader).toHaveBeenCalled();
      expect(result).toBe(component);
    });
  });

  describe('initializeLazyLoading', () => {
    it('should not throw when called', () => {
      expect(() => initializeLazyLoading()).not.toThrow();
    });
  });

  describe('Helper Methods', () => {
    it('should expose setupViewportObserver', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Test' } }));
      const lazyComp = createLazyComponent(loader);

      expect(typeof lazyComp.setupViewportObserver).toBe('function');
    });

    it('should expose setupPreload', () => {
      const loader = () => Promise.resolve(() => ({ div: { text: 'Test' } }));
      const lazyComp = createLazyComponent(loader);

      expect(typeof lazyComp.setupPreload).toBe('function');
    });
  });
});
