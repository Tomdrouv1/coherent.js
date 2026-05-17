/**
 * Tests for Express.js integration with Coherent.js
 *
 * Migrated from packages/express/test/express-integration.test.js
 * during Wave 2c (integrations consolidation). Imports the
 * coherent-express helpers from the new integrations package path.
 */

import { describe, it, expect } from 'vitest';
import {
  coherentMiddleware,
  createCoherentHandler,
  setupCoherent
} from '../../src/express/coherent-express.js';
import { render } from '@coherent.js/core';

describe('Express.js Integration', () => {
  it('should create coherentMiddleware', () => {
    const middleware = coherentMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('should create coherentMiddleware with options', () => {
    const middleware = coherentMiddleware({
      enablePerformanceMonitoring: true,
      template: '<html><body>{{content}}</body></html>'
    });
    expect(typeof middleware).toBe('function');
  });

  it('should create coherent handler', () => {
    const handler = createCoherentHandler(() => ({}));
    expect(typeof handler).toBe('function');
  });

  it('should setup coherent express', () => {
    // Mock Express app
    const mockApp = {
      engine: () => {},
      set: () => {},
      use: () => {}
    };

    expect(() => {
      setupCoherent(mockApp);
    }).not.toThrow();
  });

  it('should handle rendering integration', () => {
    const testComponent = {
      div: {
        className: 'test',
        text: 'Hello Coherent.js!'
      }
    };

    const html = render(testComponent);
    expect(html).toContain('Hello Coherent.js!');
  });
});
