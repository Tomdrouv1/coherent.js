/**
 * API example with middleware for Coherent.js
 */

import { createApiRouter } from '../src/api/router.js';
import { withValidation } from '../src/api/validation.js';
import { withAuth, withPermission, withLogging, withCors, withRateLimit, withSanitization } from '../src/api/middleware.js';

// Create an API router
const router = createApiRouter();

// Sample data
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
];

// Mock authentication function
const verifyToken = (token) => {
  if (token === 'admin-token') {
    return { id: 1, name: 'John Doe', role: 'admin' };
  }
  if (token === 'user-token') {
    return { id: 2, name: 'Jane Smith', role: 'user' };
  }
  throw new Error('Invalid token');
};

// Mock permission function
const checkPermission = (user, req) => {
  // Admins can do anything
  if (user.role === 'admin') {
    return true;
  }
  
  // Users can only access their own data
  if (req.method === 'GET' && req.params.id == user.id) {
    return true;
  }
  
  return false;
};

// User schema for validation
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// Register middleware globally
router.use(withLogging());
router.use(withCors({
  origin: 'http://localhost:3000',
  credentials: true
}));
router.use(withRateLimit({
  windowMs: 60000, // 1 minute
  max: 100 // limit each IP to 100 requests per windowMs
}));
router.use(withSanitization());

// Register routes

// GET /users - Get all users (admin only)
router.get('/users', 
  withAuth(verifyToken),
  withPermission((user) => user.role === 'admin'),
  (req, res) => {
    return { users };
  }
);

// GET /users/:id - Get a specific user (authenticated users can access their own data)
router.get('/users/:id', 
  withAuth(verifyToken),
  withPermission(checkPermission),
  (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return { user };
  }
);

// POST /users - Create a new user (admin only)
router.post('/users', 
  withAuth(verifyToken),
  withPermission((user) => user.role === 'admin'),
  withValidation(userSchema),
  (req, res) => {
    const { name, email } = req.body;
    
    // Create new user
    const newUser = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      name,
      email,
      role: 'user'
    };
    
    users.push(newUser);
    
    // Return created user with 201 status
    res.status(201);
    return { user: newUser };
  }
);

// Export the router
export default router;

// Example of how to use with Express:
/*
import express from 'express';
import apiRouter from './api-with-middleware.js';
import { createErrorHandler } from '../src/api/errors.js';

const app = express();
app.use(express.json());

// Mount the API router
app.use('/api', apiRouter.toExpress());

// Global error handler
app.use(createErrorHandler());

app.listen(3000, () => {
  console.log('API server with middleware running on port 3000');
});
*/
