# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- Vitest 4.0.15 (replaces Jest)
- Config: `/home/tomdrouv1/Dev/Perso/coherent.js/vitest.config.js` (root)
- Node environment (not jsdom or browser)
- Process pool isolation enabled: `pool: 'forks'`, `isolate: true`

**Assertion Library:**
- Vitest built-in (chai-like) assertions
- Methods: `expect().toBe()`, `expect().toEqual()`, `expect().toMatch()`, `expect().toBeInstanceOf()`, etc.

**Run Commands:**
```bash
pnpm test                   # Run all tests once
pnpm test:watch           # Watch mode for development
pnpm test:coverage        # Generate coverage report
pnpm test:packages        # Run tests in all packages
pnpm test:ui              # Open Vitest UI dashboard
pnpm --filter @coherent.js/core run test  # Run specific package tests
```

**Coverage Requirements:**
- V8 provider with reports in text, json, html, lcov formats
- Target: Not enforced globally (configurable per package)
- Exclude: `node_modules/**`, `dist/**`, `coverage/**`, `**/*.test.js`, `**/*.config.js`, `**/build.mjs`

## Test File Organization

**Location:**
- Co-located with packages: `packages/*/test/` directories
- Separate from source (`/src`) but within same package
- Some tests also in `test/` directories at package root

**Naming:**
- `.test.js` suffix: `rendering.test.js`, `components.test.js`, `error-handler.test.js`
- `.spec.js` suffix also supported but not common in this codebase
- Test name matches module being tested: `html-renderer.test.js` tests `html-renderer.js`

**Structure:**
```
packages/
├── core/
│   ├── src/
│   │   ├── rendering/
│   │   │   └── html-renderer.js
│   │   └── components/
│   │       └── component-system.js
│   └── test/
│       ├── html-renderer.test.js
│       ├── components.test.js
│       └── error-handler.test.js
└── client/
    ├── src/
    │   └── hydration.js
    └── test/
        ├── core-logic.test.js
        ├── vdom-diffing.test.js
        └── hydration-enhanced.test.js
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Component Rendering', () => {
  it('renders basic component correctly', () => {
    const BasicComponent = {
      div: {
        className: 'test',
        text: 'Hello, World!'
      }
    };

    const html = render(BasicComponent, {
      enableCache: true,
      enableMonitoring: false,
      encapsulate: false
    });

    expect(html).toBe('<div class="test">Hello, World!</div>');
  });

  it('renders component with children correctly', () => {
    // Test implementation
  });
});
```

**Patterns:**
- Top-level `describe()` blocks for test suites
- Nested `describe()` for logical grouping (e.g., by feature or error type)
- One `it()` per scenario/assertion
- Clear, descriptive test names following "should X when Y" pattern

**Lifecycle:**
- `beforeEach()`: Setup shared test state, mock environment
- `afterEach()`: Cleanup, restore mocks, clear state
- No `before()`/`after()` for global suite setup (not commonly used)

## Test Structure Pattern Examples

**Component Rendering Tests:**
```javascript
describe('Virtual DOM Diffing and Component Lifecycle', () => {
  beforeEach(() => {
    setupBrowserEnvironment();  // Mock window, document, Node
  });

  it('should test virtual DOM structure analysis', () => {
    const oldVDom = {
      div: { className: 'container', id: 'main', children: [...] }
    };
    // Test implementation
  });
});
```

**Error Handling Tests:**
```javascript
import {
  CoherentError,
  ComponentValidationError
} from '../src/utils/error-handler.js';

describe('Error Handler', () => {
  describe('CoherentError', () => {
    it('should create basic CoherentError', () => {
      const error = new CoherentError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoherentError);
      expect(error.name).toBe('CoherentError');
    });
  });
});
```

**Component System Tests:**
```javascript
describe('Component system', () => {
  it('creates basic component instance', () => {
    const Button = createComponent(({ text = 'Click me' }) => ({
      button: { text }
    }));

    expect(Button).toBeDefined();
    expect(typeof Button.render).toBe('function');
  });
});
```

## Mocking

**Framework:** Vitest's `vi` object

**Patterns:**
```javascript
import { describe, it, expect, vi } from 'vitest';

// Mock function creation
vi.fn()
vi.fn(() => 'return value')
vi.fn((_name, _value) => { return true; })  // With underscore for unused params

// Mock method calls
element.setAttribute = vi.fn();
element.getAttribute = vi.fn((name) => props[name] || null);

// Spy on method calls
expect(element.setAttribute).toHaveBeenCalled();
expect(element.setAttribute).toHaveBeenCalledWith('class', 'active');
```

**Browser Environment Mocks:**
```javascript
const setupBrowserEnvironment = () => {
  global.window = {
    __coherentEventRegistry: {},
    __coherentActionRegistry: {},
    addEventListener: vi.fn()
  };

  global.document = {
    createElement: vi.fn((tag) => ({
      tagName: tag.toUpperCase(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(() => null),
      removeAttribute: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      replaceChild: vi.fn(),
      textContent: '',
      children: [],
      childNodes: [],
      parentNode: null,
      remove: vi.fn(),
      addEventListener: vi.fn()
    })),
    createTextNode: vi.fn((text) => ({
      textContent: text,
      nodeType: 3,
      parentNode: null,
      remove: vi.fn()
    })),
    createDocumentFragment: vi.fn(() => ({
      appendChild: vi.fn()
    }))
  };

  global.Node = {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1
  };
};
```

**Mock Data Objects:**
```javascript
const createMockReq = (method = 'GET', url = '/', body = {}) => ({
  method,
  url,
  body,
  headers: {},
  params: {},
  query: {},
  connection: { remoteAddress: '127.0.0.1' }
});

const createMockRes = () => {
  let statusCode = 200;
  let headers = {};
  let responseData = '';

  return {
    writeHead: (code, hdrs = {}) => { statusCode = code; headers = { ...headers, ...hdrs }; },
    setHeader: (name, value) => { headers[name] = value; },
    end: (data = '') => { responseData = data; },
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getData: () => responseData
  };
};
```

**Mock Adapter Pattern:**
```javascript
class MockAdapter {
  constructor() {
    this.connected = false;
    this.queries = [];
  }

  async createPool() {
    return new MockPool();
  }

  async query(pool, sql, params = [], options = {}) {
    this.queries.push({ sql, params, options });

    if (sql.includes('INSERT')) {
      return { insertId: 1, affectedRows: 1 };
    } else if (sql.includes('UPDATE') || sql.includes('DELETE')) {
      return { affectedRows: 1 };
    } else {
      return {
        rows: [{ id: 1, name: 'Test User' }],
        rowCount: 1
      };
    }
  }
}
```

**What to Mock:**
- External dependencies and APIs
- DOM APIs in non-browser tests
- Database adapters and connections
- HTTP requests/responses
- Event listeners and timers
- File system operations

**What NOT to Mock:**
- Core business logic functions (test the real implementation)
- Data transformation functions (test real behavior)
- Helper utilities (use real versions)
- Error classes (test actual error handling)

## Fixtures and Factories

**Test Data:**
```javascript
// Simple test components
const BasicComponent = {
  div: {
    className: 'test',
    text: 'Hello, World!'
  }
};

// Complex nested structures for testing
const ComplexComponent = {
  article: {
    className: 'post',
    children: [
      {
        header: {
          children: [
            { h1: { text: 'Article Title' } },
            { time: { datetime: '2023-01-01', text: 'Jan 1, 2023' } }
          ]
        }
      },
      { main: { children: [{ p: { text: 'Content' } }] } }
    ]
  }
};

// Factory functions for test data
const createMockDOMElement = (tagName = 'div', props = {}) => ({
  tagName: tagName.toUpperCase(),
  nodeType: 1,
  textContent: props.textContent || '',
  className: props.className || '',
  id: props.id || '',
  attributes: new Map(),
  children: props.children || [],
  childNodes: props.childNodes || [],
  parentNode: props.parentNode || null,
  setAttribute: vi.fn(),
  getAttribute: vi.fn((name) => props[name] || null),
  removeAttribute: vi.fn(),
  // ... other methods
});
```

**Location:**
- Fixtures co-located in test files or in separate `fixtures/` subdirectories
- Reusable mocks exported from dedicated files: `createMockReq()`, `createMockRes()`, `setupBrowserEnvironment()`
- Factory functions follow `create*()` naming pattern

**Test Utilities:**
Available in `@coherent.js/testing` package (`/home/tomdrouv1/Dev/Perso/coherent.js/packages/testing/src/test-utils.js`):
```javascript
// Fire events on elements
fireEvent(element, eventType, eventData)
fireEvent_click(element, eventData)
fireEvent_change(element, value)
fireEvent_submit(element, eventData)
fireEvent_keyDown(element, key)
fireEvent_focus(element)
fireEvent_blur(element)

// Wait for async conditions
waitFor(condition, { timeout: 1000, interval: 50 })
```

## Coverage

**Configuration:**
- V8 provider (in-process, fast)
- Reports: text, json, html, lcov
- Coverage collected automatically when `--coverage` flag used

**View Coverage:**
```bash
pnpm test:coverage              # Run with coverage
# Output in coverage/ directory
# Open coverage/index.html in browser for detailed report
```

**Exclusions:**
- `node_modules/**`
- `dist/**`
- `coverage/**`
- `**/*.test.js` (test files themselves)
- `**/*.config.js` (config files)
- `**/build.mjs` (build scripts)

## Test Types

**Unit Tests:**
- Scope: Single function or small module
- Approach: Test pure functions with various inputs
- Example: `createElement()` rendering behavior, error cases
- Typical in: core rendering logic, utilities, validators

**Integration Tests:**
- Scope: Multiple modules working together
- Approach: Test full workflows and system interactions
- Example: Component with hydration, form submission with validation
- Files: Often named `integration.test.js` or `integration-real.test.js`

**E2E Tests:**
- Framework: Not detected in this codebase (Vitest not suitable for browser E2E)
- Note: Complex interactions tested via integration tests instead

**Example Test Files:**
```
packages/core/test/
├── components.test.js          # Unit tests for component system
├── rendering.test.js           # Unit tests for rendering
├── error-handler.test.js       # Unit tests for error handling
├── html-renderer.test.js       # Unit tests for HTML rendering
├── performance.test.js         # Unit tests for performance utils
├── css-manager.test.js         # Unit tests for CSS management
└── vdom-diffing.test.js        # Integration test for virtual DOM

packages/client/test/
├── core-logic.test.js          # Unit tests for core hydration logic
├── vdom-diffing.test.js        # Integration test for virtual DOM
├── hydration-enhanced.test.js  # Integration test for hydration
└── integration-real.test.js    # Full integration test
```

## Common Patterns

**Async Testing:**
```javascript
it('should test makeHydratable wrapper logic', async () => {
  const hydrationModule = await import('../src/hydration.js');

  const hydratable = makeHydratable(originalComponent, {
    componentName: 'TestComponent',
    initialState: { count: 0 }
  });

  const hydrationData = hydratable.getHydrationData({ text: 'test' }, { count: 5 });
  expect(hydrationData).toMatchObject({
    componentName: 'TestComponent',
    // ...
  });
});

// Promise-based async
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

**Error Testing:**
```javascript
it('should test error handling in hydration functions', async () => {
  const { hydrate, hydrateAll } = await import('../src/hydration.js');

  // Test error is thrown
  expect(() => hydrateAll([], [1, 2])).toThrow('Number of elements must match number of components');
  expect(() => hydrateAll([1], [])).toThrow('Number of elements must match number of components');

  // Test graceful degradation
  const result = hydrate(null, null);
  expect(result).toBe(null);
});

// Async error handling
it('should handle async errors', async () => {
  try {
    await asyncFunctionThatThrows();
    expect(true).toBe(false); // Should not reach here
  } catch (error) {
    expect(error.message).toContain('expected text');
  }
});
```

**Mocking and Spying:**
```javascript
describe('Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses mocked functions', () => {
    const mockHandler = vi.fn();
    mockHandler('test');

    expect(mockHandler).toHaveBeenCalled();
    expect(mockHandler).toHaveBeenCalledWith('test');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
```

**Property-based Testing (Data-driven):**
```javascript
it('should test component validation logic', () => {
  const testCases = [
    { input: null, shouldBeValid: false },
    { input: undefined, shouldBeValid: false },
    { input: 'string', shouldBeValid: false },
    { input: 123, shouldBeValid: false },
    { input: [], shouldBeValid: false },
    { input: {}, shouldBeValid: true },
    { input: { div: { text: 'test' } }, shouldBeValid: true }
  ];

  testCases.forEach(({ input, shouldBeValid }) => {
    const isValid = Boolean(input && typeof input === 'object' && !Array.isArray(input));
    expect(isValid).toBe(shouldBeValid);
  });
});
```

## Configuration

**Global Test Timeout:**
- Default: 10 seconds (`testTimeout: 10000`)
- Hook timeout: 10 seconds (`hookTimeout: 10000`)
- Teardown timeout: 5 seconds (`teardownTimeout: 5000`)
- Used for complex rendering tests or database operations

**CI Behavior:**
- Retry flaky tests: 2 retries in CI, 0 locally
- Reporters: verbose, json, junit in CI; default locally
- Output files: `test-results/results.json`, `test-results/junit.xml`
- No cache in CI (`--no-cache` flag)

**Process Isolation:**
- `pool: 'forks'`: Use process forking for isolation
- `isolate: true`: Isolate each test
- `clearMocks: true`: Clear all mocks between tests
- `restoreMocks: true`: Restore mock implementations between tests

---

*Testing analysis: 2026-01-21*
