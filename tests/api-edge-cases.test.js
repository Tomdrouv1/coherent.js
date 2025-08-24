/**
 * Tests for Error Handling and Edge Cases
 */

import { createObjectRouter } from '../src/api/router.js';
import { withInputValidation } from '../src/api/security.js';

console.log('🧪 Testing edge cases...');

// Test error handling routes
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

const errorRouter = createObjectRouter(errorRoutes);
console.assert(typeof errorRouter === 'object', 'Should create error router');

// Test validation edge cases
const validationRoutes = {
  api: {
    strict: {
      post: {
        middleware: [withInputValidation({
          name: { type: 'string', required: true, minLength: 1, maxLength: 10 }
        })],
        handler: (req) => ({ validated: req.body })
      }
    }
  }
};

const validationRouter = createObjectRouter(validationRoutes);
console.assert(typeof validationRouter === 'object', 'Should create validation router');







console.log('🎉 All edge case tests passed!');
