/**
 * Tests for Express.js integration with Coherent.js
 */

import { describe, it, expect } from 'vitest';
import { coherentMiddleware, createCoherentHandler, setupCoherentExpress } from '../src/coherent-express.js';
import { renderToString } from '../../core/src/rendering/html-renderer.js';

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
      setupCoherentExpress(mockApp);
    }).not.toThrow();
  });

  it('should handle rendering integration', () => {
    const testComponent = {
      div: {
        className: 'test',
        text: 'Hello Coherent.js!'
      }
    };
    
    const html = renderToString(testComponent);
    expect(html).toContain('Hello Coherent.js!');
  });
});
