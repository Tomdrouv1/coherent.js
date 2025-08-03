/**
 * API Demo for Coherent.js
 * Demonstrates the new API capabilities
 */

import { createApiRouter, withValidation, withErrorHandling, ApiError, ValidationError } from '../src/api/index.js';

// Create an API router
const router = createApiRouter();

// Sample data
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// Validation schema for user creation
const userCreateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// Validation schema for user updates
const userUpdateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  }
};

// Error handling middleware
const handleErrors = withErrorHandling(async (req, res) => {
  // This would be the actual route handler
  throw new Error('This is a test error');
});

// Register routes

// GET /users - Get all users
router.get('/users', (req, res) => {
  return { users };
});

// GET /users/:id - Get a specific user
router.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  return { user };
});

// POST /users - Create a new user
router.post('/users', 
  withValidation(userCreateSchema),
  (req, res) => {
    const { name, email } = req.body;
    
    // Check if user already exists
    if (users.some(u => u.email === email)) {
      throw new ApiError('User with this email already exists', 409);
    }
    
    // Create new user
    const newUser = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      name,
      email
    };
    
    users.push(newUser);
    
    // Return created user with 201 status
    res.status(201);
    return { user: newUser };
  }
);

// PUT /users/:id - Update a user
router.put('/users/:id', 
  withValidation(userUpdateSchema),
  (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new ApiError('User not found', 404);
    }
    
    // Update user
    const updatedUser = {
      ...users[userIndex],
      ...req.body
    };
    
    users[userIndex] = updatedUser;
    
    return { user: updatedUser };
  }
);

// DELETE /users/:id - Delete a user
router.delete('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new ApiError('User not found', 404);
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  
  return { message: 'User deleted successfully', user: deletedUser };
});

// Error handling demo route
router.get('/error', handleErrors);

// Validation error demo route
router.post('/validation-error', 
  withValidation(userCreateSchema),
  (req, res) => {
    return { message: 'This should not be reached due to validation error' };
  }
);

// Export the router for use with Express, Fastify, etc.
export default router;

// Example of how to use with Express:
/*
import express from 'express';
import apiRouter from './api-demo.js';

const app = express();
app.use(express.json());

app.use('/api', apiRouter.toExpress());

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
*/
