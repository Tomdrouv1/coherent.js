/**
 * Tests for Fastify integration with Coherent.js
 */

import { describe, it, expect } from 'vitest';
import { coherentFastify, createHandler, setupCoherent } from '../src/coherent-fastify.js';
import { render } from '@coherent.js/core';

describe('Fastify Integration', () => {
  it('should create coherentFastify plugin', () => {
    expect(typeof coherentFastify).toBe('function');
  });

  it('should execute coherentFastify with options', () => {
    // Mock Fastify instance for testing
    const mockFastify = {
      decorateReply: () => {},
      addHook: () => {},
      register: () => {}
    };

    expect(() => {
      coherentFastify(mockFastify, {
        enablePerformanceMonitoring: true,
        template: '<html><body>{{content}}</body></html>'
      }, () => {});
    }).not.toThrow();
  });

  it('should create coherent fastify handler', () => {
    const handler = createHandler(() => ({}));
    expect(typeof handler).toBe('function');
  });

  it('should setup coherent fastify', () => {
    // Mock Fastify instance
    const mockFastify = {
      register: () => {}
    };

    expect(() => {
      setupCoherent(mockFastify);
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

  it('should handle complete integration scenario', () => {
    // Test plugin functionality conceptually
    const mockFastify = {
      decorateReply: () => {},
      addHook: () => {},
      register: () => {}
    };

    expect(() => {
      coherentFastify(mockFastify, {}, () => {});
    }).not.toThrow();
  });
});
