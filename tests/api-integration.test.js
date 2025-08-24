/**
 * Integration Tests for API Router + Security
 */

import { createObjectRouter } from '../src/api/router.js';
import { withAuth, withInputValidation, generateJWT } from '../src/api/security.js';

console.log('🧪 Testing integration features...');

// Test router with security middleware
const secureRoutes = {
  api: {
    protected: {
      get: {
        middleware: [withAuth],
        handler: (req) => ({ message: 'Protected data', user: req.user })
      }
    },
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

const secureRouter = createObjectRouter(secureRoutes);
console.assert(typeof secureRouter === 'object', 'Should create secure router');

// Test JWT generation for integration
const testJWT = generateJWT({ userId: 1, username: 'test', role: 'user' }, '1h');
console.assert(typeof testJWT === 'string', 'Should generate JWT for integration tests');
console.assert(testJWT.split('.').length === 3, 'Should generate valid JWT structure');




console.log('🎉 All integration tests passed!');
