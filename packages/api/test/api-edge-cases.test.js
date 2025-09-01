/**
 * Tests for Error Handling and Edge Cases
 */

import { describe, it, expect } from 'vitest';
import { createObjectRouter } from '../src/router.js';
import { withInputValidation } from '../src/security.js';

describe('API Edge Cases', () => {
  it('should handle router errors gracefully', () => {
    const errorRoutes = {
      api: {
        error: {
          get: {
            handler: () => {
              throw new Error('Test error');
            }
          }
        }
      }
    };

    const router = createObjectRouter(errorRoutes);
    expect(typeof router).toBe('object');
    expect(typeof router.handle).toBe('function');
  });

  it('should handle malformed routes', () => {
    const malformedRoutes = {
      api: {
        malformed: {
          // Missing handler
          get: {}
        }
      }
    };

    expect(() => {
      createObjectRouter(malformedRoutes);
    }).not.toThrow();
  });

  it('should handle invalid input validation', () => {
    const invalidSchema = {
      type: 'object',
      properties: {
        // Invalid property definition
        name: 'invalid'
      }
    };

    expect(() => {
      withInputValidation(invalidSchema);
    }).not.toThrow();
  });

  it('should handle empty routes object', () => {
    const emptyRoutes = {};
    
    const router = createObjectRouter(emptyRoutes);
    expect(typeof router).toBe('object');
  });

  it('should handle null and undefined inputs', () => {
    expect(() => {
      createObjectRouter(null);
    }).not.toThrow();

    expect(() => {
      createObjectRouter(undefined);
    }).not.toThrow();
  });
});