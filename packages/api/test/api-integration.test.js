/**
 * Integration Tests for API Router + Security
 */

import { describe, it, expect } from 'vitest';
import { createRouter } from '../src/router.js';
import { withAuth, withInputValidation, generateJWT } from '../src/security.js';

describe('API Integration Features', () => {
  it('should create router with security middleware', () => {
    const secureRoutes = {
      api: {
        protected: {
          get: {
            middleware: [withAuth],
            handler: (req) => ({ message: 'Protected data', user: req.user })
          }
        }
      }
    };

    const secureRouter = createRouter(secureRoutes);
    expect(typeof secureRouter).toBe('object');
    expect(typeof secureRouter.handle).toBe('function');
  });

  it('should create router with input validation middleware', () => {
    const validatedRoutes = {
      api: {
        validated: {
          post: {
            middleware: [withInputValidation({
              name: { type: 'string', required: true, minLength: 1 }
            })],
            handler: (req) => ({ received: req.body })
          }
        }
      }
    };

    const router = createRouter(validatedRoutes);
    expect(typeof router).toBe('object');
    expect(typeof router.handle).toBe('function');
  });

  it('should generate and handle JWT tokens', () => {
    const payload = { userId: 123, role: 'admin' };
    const token = generateJWT(payload, '1h', 'test-secret');
    
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('should create auth middleware', () => {
    const authMiddleware = withAuth();
    expect(typeof authMiddleware).toBe('function');
  });

  it('should create validation middleware', () => {
    const schema = {
      name: { type: 'string', required: true }
    };
    const validationMiddleware = withInputValidation(schema);
    expect(typeof validationMiddleware).toBe('function');
  });
});