/**
 * Tests for Next.js integration with Coherent.js
 */

import { describe, it, expect } from 'vitest';
import { createCoherentNextHandler, createCoherentAppRouterHandler } from '../src/coherent-nextjs.js';
import { render } from '../../core/src/rendering/html-renderer.js';

describe('Next.js Integration', () => {
  it('should create coherent next handler', () => {
    const handler = createCoherentNextHandler(() => ({}));
    expect(typeof handler).toBe('function');
  });

  it('should create coherent app router handler', () => {
    const handler = createCoherentAppRouterHandler(() => ({}));
    expect(typeof handler).toBe('function');
  });

  it('should create handlers with options', () => {
    const handler1 = createCoherentNextHandler(() => ({}), {
      enablePerformanceMonitoring: true,
      template: '<html><body>{{content}}</body></html>'
    });
    
    const handler2 = createCoherentAppRouterHandler(() => ({}), {
      enablePerformanceMonitoring: true,
      template: '<html><body>{{content}}</body></html>'
    });
    
    expect(typeof handler1).toBe('function');
    expect(typeof handler2).toBe('function');
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

  it('should handle complete integration scenario', () => {
    // This is a conceptual test - in a real scenario we would
    // need to set up a full Next.js server and make requests
    
    const mockReq = { method: 'GET', url: '/' };
    const mockRes = {
      setHeader: () => mockRes,
      status: () => mockRes,
      json: () => mockRes,
      send: () => mockRes,
      end: () => {}
    };
    
    const handler = createCoherentNextHandler(() => ({ div: { text: 'Test' } }));
    
    expect(() => {
      handler(mockReq, mockRes);
    }).not.toThrow();
  });
});
