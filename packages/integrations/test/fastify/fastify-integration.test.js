/**
 * Tests for Fastify integration with Coherent.js
 *
 * Migrated from packages/fastify/test/fastify-integration.test.js during
 * Wave 2c (integrations consolidation). Imports the coherent-fastify helpers
 * from the new integrations package path.
 */

import { describe, it, expect } from 'vitest';
import {
  coherentFastify,
  createHandler,
  setupCoherent
} from '../../src/fastify/coherent-fastify.js';
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
    // setupCoherent is now an alias for the fp-wrapped coherentFastify
    // plugin, so the mock must expose decorateReply + addHook in addition
    // to register. Previously setupCoherent just called fastify.register
    // internally and never touched anything else on the instance.
    const mockFastify = {
      register: () => {},
      decorateReply: () => {},
      addHook: () => {}
    };

    expect(() => {
      setupCoherent(mockFastify, {}, () => {});
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
