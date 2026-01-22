import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ModuleTracker,
  moduleTracker,
  createHotContext,
} from '../../src/hmr/module-tracker.js';

describe('ModuleTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ModuleTracker();
    // Setup minimal DOM mock
    global.document = {
      querySelector: vi.fn(() => null),
    };
  });

  afterEach(() => {
    tracker.clear();
    delete global.document;
  });

  describe('createHotContext', () => {
    it('should return an object with accept, dispose, and data', () => {
      const hot = tracker.createHotContext('/src/test.js');

      expect(hot).toHaveProperty('data');
      expect(typeof hot.accept).toBe('function');
      expect(typeof hot.dispose).toBe('function');
      expect(typeof hot.acceptDeps).toBe('function');
      expect(typeof hot.prune).toBe('function');
      expect(typeof hot.invalidate).toBe('function');
    });

    it('should return empty data object initially', () => {
      const hot = tracker.createHotContext('/src/test.js');
      expect(hot.data).toEqual({});
    });

    it('should persist data object across hot context calls', () => {
      const hot1 = tracker.createHotContext('/src/test.js');
      hot1.data.counter = 42;
      hot1.data.items = ['a', 'b'];

      const hot2 = tracker.createHotContext('/src/test.js');
      expect(hot2.data.counter).toBe(42);
      expect(hot2.data.items).toEqual(['a', 'b']);
      expect(hot1.data).toBe(hot2.data); // Same reference
    });

    it('should isolate data between different modules', () => {
      const hot1 = tracker.createHotContext('/src/module1.js');
      const hot2 = tracker.createHotContext('/src/module2.js');

      hot1.data.value = 'module1';
      hot2.data.value = 'module2';

      expect(hot1.data.value).toBe('module1');
      expect(hot2.data.value).toBe('module2');
    });
  });

  describe('accept', () => {
    it('should register accept callback', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();

      hot.accept(callback);

      expect(tracker.canHotUpdate('/src/test.js')).toBe(true);
    });

    it('should register accept without callback', () => {
      const hot = tracker.createHotContext('/src/test.js');

      hot.accept();

      expect(tracker.canHotUpdate('/src/test.js')).toBe(true);
    });

    it('should call accept callback on executeAccept', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();
      hot.accept(callback);

      const newModule = { default: () => {} };
      tracker.executeAccept('/src/test.js', newModule);

      expect(callback).toHaveBeenCalledWith(newModule);
    });
  });

  describe('acceptDeps', () => {
    it('should register acceptDeps callback with single dep', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();

      hot.acceptDeps('./dep.js', callback);

      expect(tracker.canHotUpdate('/src/test.js')).toBe(true);
    });

    it('should register acceptDeps callback with array of deps', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();

      hot.acceptDeps(['./dep1.js', './dep2.js'], callback);

      expect(tracker.canHotUpdate('/src/test.js')).toBe(true);
    });

    it('should call acceptDeps callback with updated modules', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();
      hot.acceptDeps(['./dep1.js', './dep2.js'], callback);

      const updatedDeps = {
        './dep1.js': { value: 1 },
        './dep2.js': { value: 2 },
      };
      tracker.executeAcceptDeps('/src/test.js', updatedDeps);

      expect(callback).toHaveBeenCalledWith([{ value: 1 }, { value: 2 }]);
    });
  });

  describe('dispose', () => {
    it('should register dispose callback', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();

      hot.dispose(callback);

      const moduleData = tracker.getModuleData('/src/test.js');
      expect(moduleData.dispose).toBe(callback);
    });

    it('should call dispose callback with data object', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.data.savedState = 'test';

      const callback = vi.fn();
      hot.dispose(callback);

      tracker.executeDispose('/src/test.js');

      expect(callback).toHaveBeenCalledWith(hot.data);
      expect(callback.mock.calls[0][0].savedState).toBe('test');
    });

    it('should return data object from executeDispose', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.data.value = 123;
      hot.dispose(() => {});

      const result = tracker.executeDispose('/src/test.js');

      expect(result.value).toBe(123);
    });

    it('should allow modifying data in dispose callback', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.data.count = 5;
      hot.dispose((data) => {
        data.count += 1;
        data.fromDispose = true;
      });

      tracker.executeDispose('/src/test.js');

      expect(hot.data.count).toBe(6);
      expect(hot.data.fromDispose).toBe(true);
    });

    it('should handle dispose errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const hot = tracker.createHotContext('/src/test.js');
      hot.dispose(() => {
        throw new Error('Dispose error');
      });

      // Should not throw
      expect(() => tracker.executeDispose('/src/test.js')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('prune', () => {
    it('should register prune callback', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();

      hot.prune(callback);

      const moduleData = tracker.getModuleData('/src/test.js');
      expect(moduleData.prune).toBe(callback);
    });

    it('should call prune callback on executePrune', () => {
      const hot = tracker.createHotContext('/src/test.js');
      const callback = vi.fn();
      hot.prune(callback);

      tracker.executePrune('/src/test.js');

      expect(callback).toHaveBeenCalled();
    });

    it('should remove module from tracking after prune', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.prune(() => {});

      tracker.executePrune('/src/test.js');

      expect(tracker.hasModule('/src/test.js')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should send invalidate message to WebSocket', () => {
      const mockSocket = {
        readyState: WebSocket.OPEN,
        send: vi.fn(),
      };
      tracker.setSocket(mockSocket);

      const hot = tracker.createHotContext('/src/test.js');
      hot.invalidate('Cannot update');

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'invalidate',
          moduleId: '/src/test.js',
          message: 'Cannot update',
        })
      );
    });

    it('should log invalidation', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const hot = tracker.createHotContext('/src/test.js');
      hot.invalidate('Cannot update');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HMR] Module /src/test.js invalidated')
      );
      consoleSpy.mockRestore();
    });

    it('should not throw if socket is null', () => {
      tracker.setSocket(null);
      const hot = tracker.createHotContext('/src/test.js');

      expect(() => hot.invalidate()).not.toThrow();
    });
  });

  describe('canHotUpdate', () => {
    it('should return false for unregistered module', () => {
      expect(tracker.canHotUpdate('/src/unknown.js')).toBe(false);
    });

    it('should return true when accept is registered', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.accept();

      expect(tracker.canHotUpdate('/src/test.js')).toBe(true);
    });

    it('should return true when acceptDeps is registered', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.acceptDeps('./dep.js', () => {});

      expect(tracker.canHotUpdate('/src/test.js')).toBe(true);
    });

    it('should return false when only dispose is registered', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.dispose(() => {});

      expect(tracker.canHotUpdate('/src/test.js')).toBe(false);
    });
  });

  describe('isHmrBoundary', () => {
    it('should return true if module has accept handler', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.accept();

      expect(tracker.isHmrBoundary('/src/test.js')).toBe(true);
    });

    it('should return true if moduleExports has __hmrBoundary', () => {
      const moduleExports = { __hmrBoundary: true };

      expect(tracker.isHmrBoundary('/src/test.js', moduleExports)).toBe(true);
    });

    it('should return false if moduleExports.__hmrBoundary is not true', () => {
      const moduleExports = { __hmrBoundary: false };

      expect(tracker.isHmrBoundary('/src/test.js', moduleExports)).toBe(false);
    });

    it('should return true if component exists in DOM', () => {
      global.document.querySelector = vi.fn(() => ({})); // Found element

      expect(tracker.isHmrBoundary('/src/components/Counter.js')).toBe(true);
      expect(global.document.querySelector).toHaveBeenCalledWith(
        '[data-coherent-component="Counter"]'
      );
    });

    it('should return false if no boundary indicators', () => {
      expect(tracker.isHmrBoundary('/src/utils/helper.js')).toBe(false);
    });
  });

  describe('executeAccept', () => {
    it('should return false if no accept handler', () => {
      tracker.createHotContext('/src/test.js');

      expect(tracker.executeAccept('/src/test.js', {})).toBe(false);
    });

    it('should return true after calling accept handler', () => {
      const hot = tracker.createHotContext('/src/test.js');
      hot.accept(vi.fn());

      expect(tracker.executeAccept('/src/test.js', {})).toBe(true);
    });

    it('should handle accept errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const hot = tracker.createHotContext('/src/test.js');
      hot.accept(() => {
        throw new Error('Accept error');
      });

      expect(tracker.executeAccept('/src/test.js', {})).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('hasModule', () => {
    it('should return false for unknown module', () => {
      expect(tracker.hasModule('/src/unknown.js')).toBe(false);
    });

    it('should return true for registered module', () => {
      tracker.createHotContext('/src/test.js');

      expect(tracker.hasModule('/src/test.js')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all module registrations', () => {
      tracker.createHotContext('/src/module1.js');
      tracker.createHotContext('/src/module2.js');

      tracker.clear();

      expect(tracker.hasModule('/src/module1.js')).toBe(false);
      expect(tracker.hasModule('/src/module2.js')).toBe(false);
    });
  });
});

describe('moduleTracker singleton', () => {
  afterEach(() => {
    moduleTracker.clear();
  });

  it('should be a ModuleTracker instance', () => {
    expect(moduleTracker).toBeInstanceOf(ModuleTracker);
  });

  it('should be the same instance across imports', () => {
    const hot1 = moduleTracker.createHotContext('/src/test.js');
    hot1.data.value = 'singleton';

    const hot2 = moduleTracker.createHotContext('/src/test.js');
    expect(hot2.data.value).toBe('singleton');
  });
});

describe('createHotContext convenience function', () => {
  afterEach(() => {
    moduleTracker.clear();
  });

  it('should create context via singleton', () => {
    const hot = createHotContext('/src/test.js');

    expect(hot.data).toBeDefined();
    expect(typeof hot.accept).toBe('function');
    expect(moduleTracker.hasModule('/src/test.js')).toBe(true);
  });

  it('should share data with singleton', () => {
    const hot1 = createHotContext('/src/test.js');
    hot1.data.shared = true;

    const hot2 = moduleTracker.createHotContext('/src/test.js');
    expect(hot2.data.shared).toBe(true);
  });
});

describe('HMR lifecycle integration', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ModuleTracker();
    global.document = {
      querySelector: vi.fn(() => null),
    };
  });

  afterEach(() => {
    tracker.clear();
    delete global.document;
  });

  it('should handle complete HMR cycle: register -> dispose -> accept', () => {
    // 1. Initial module registration
    const hot = tracker.createHotContext('/src/Counter.js');
    hot.data.count = 0;

    const acceptCallback = vi.fn((newModule) => {
      // Re-hydration logic would go here
      hot.data.count = (newModule.initialCount || 0) + hot.data.count;
    });

    const disposeCallback = vi.fn((data) => {
      // Save current state
      data.savedCount = data.count + 1;
    });

    hot.accept(acceptCallback);
    hot.dispose(disposeCallback);

    // 2. Module update arrives, execute dispose
    tracker.executeDispose('/src/Counter.js');
    expect(disposeCallback).toHaveBeenCalledWith(hot.data);
    expect(hot.data.savedCount).toBe(1);

    // 3. Execute accept with new module
    const newModule = { initialCount: 10 };
    tracker.executeAccept('/src/Counter.js', newModule);
    expect(acceptCallback).toHaveBeenCalledWith(newModule);

    // 4. State should persist through the cycle
    expect(hot.data.count).toBe(10); // 10 (new) + 0 (old count)
    expect(hot.data.savedCount).toBe(1);
  });

  it('should allow re-registering handlers after update', () => {
    const hot = tracker.createHotContext('/src/test.js');
    const callback1 = vi.fn();
    hot.accept(callback1);

    // Simulate module re-evaluation
    const hot2 = tracker.createHotContext('/src/test.js');
    const callback2 = vi.fn();
    hot2.accept(callback2);

    tracker.executeAccept('/src/test.js', {});

    // Only the new callback should be called
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
});
