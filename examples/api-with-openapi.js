/**
 * API example with OpenAPI documentation for Coherent.js
 */

import { createApiRouter } from '../src/api/router.js';
import { withValidation } from '../src/api/validation.js';
import { withOpenApi } from '../src/api/openapi.js';

// Create an API router
const router = createApiRouter();

// Sample data
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

// User schema for validation
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

// OpenAPI documentation for GET /users
const listUsersOpenApi = withOpenApi({
  summary: 'List all users',
  description: 'Returns a list of all users in the system',
  responses: {
    '200': {
      description: 'A list of users',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' }
              },
              required: ['id', 'name', 'email']
            }
          }
        }
      }
    }
  }
});

// Register routes

// GET /users - Get all users
router.get('/users', 
  listUsersOpenApi,
  (req, res) => {
    return { users };
  }
);

// OpenAPI documentation for GET /users/:id
const getUserOpenApi = withOpenApi({
  summary: 'Get a user by ID',
  description: 'Returns a single user by their ID',
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: {
        type: 'integer'
      }
    }
  ],
  responses: {
    '200': {
      description: 'A single user',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' }
            },
            required: ['id', 'name', 'email']
          }
        }
      }
    },
    '404': {
      description: 'User not found'
    }
  }
});

// GET /users/:id - Get a specific user
router.get('/users/:id', 
  getUserOpenApi,
  (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return { user };
  }
);

// OpenAPI documentation for POST /users
const createUserOpenApi = withOpenApi({
  summary: 'Create a new user',
  description: 'Creates a new user in the system',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' }
          },
          required: ['name', 'email']
        }
      }
    }
  },
  responses: {
    '201': {
      description: 'The created user',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' }
            },
            required: ['id', 'name', 'email']
          }
        }
      }
    },
    '400': {
      description: 'Validation error'
    }
  }
});

// POST /users - Create a new user
router.post('/users', 
  createUserOpenApi,
  withValidation(userSchema),
  (req, res) => {
    const { name, email } = req.body;
    
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

// Export the router
export default router;

// Example of how to use with Express and OpenAPI documentation:
/*
import express from 'express';
import apiRouter from './api-with-openapi.js';
import { createOpenApiHandler, createSwaggerUIHandler } from '../src/api/openapi.js';

const app = express();
app.use(express.json());

// Mount the API router
app.use('/api', apiRouter.toExpress());

// Add OpenAPI documentation endpoints
const appInfo = {
  title: 'User API',
  version: '1.0.0',
  description: 'API for managing users'
};

// Get registered routes (this would need to be implemented in the router)
const routes = [];

app.get('/api/docs/json', createOpenApiHandler(appInfo, routes));
app.get('/api/docs', createSwaggerUIHandler());

app.listen(3000, () => {
  console.log('API server with OpenAPI documentation running on port 3000');
});
*/
