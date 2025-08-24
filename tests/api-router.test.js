/**
 * Tests for Object-based API Router
 */

import { createObjectRouter } from '../src/api/router.js';

console.log('🧪 Testing object router creation...');

const testRoutes = {
  api: {
    users: {
      get: {
        handler: () => ({ users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] })
      },
      post: {
        handler: (req) => ({ success: true, user: req.body })
      }
    }
  }
};

const router = createObjectRouter(testRoutes);
console.assert(typeof router === 'object', 'Should create router object');
console.assert(typeof router.createServer === 'function', 'Should have createServer method');

const server = router.createServer();
console.assert(server && typeof server.listen === 'function', 'Should create HTTP server');

console.log('🎉 All object router tests passed!');
