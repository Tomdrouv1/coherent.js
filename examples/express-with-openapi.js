/**
 * Express server with Coherent.js API and OpenAPI example
 */

import express from 'express';
import apiWithOpenApi from './api-with-openapi.js';
import { createErrorHandler } from '../src/api/errors.js';
import { createOpenApiHandler, createSwaggerUIHandler } from '../src/api/openapi.js';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the API with OpenAPI router
app.use('/api', apiWithOpenApi.toExpress());

// Add OpenAPI documentation endpoints
const appInfo = {
  title: 'User API',
  version: '1.0.0',
  description: 'API for managing users'
};

// For now, we'll create a simple array of routes for demonstration
// In a real implementation, the router would track its routes
const routes = [
  {
    method: 'GET',
    path: '/users',
    openapi: {
      summary: 'List all users',
      description: 'Returns a list of all users in the system',
      responses: {
        '200': {
          description: 'A list of users'
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/users/:id',
    openapi: {
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
          description: 'A single user'
        },
        '404': {
          description: 'User not found'
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/users',
    openapi: {
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
          description: 'The created user'
        },
        '400': {
          description: 'Validation error'
        }
      }
    }
  }
];

app.get('/api/docs/json', createOpenApiHandler(appInfo, routes));
app.get('/api/docs', createSwaggerUIHandler());

// Global error handler
app.use(createErrorHandler());

// Start the server
app.listen(port, () => {
  console.log(`🚀 Coherent.js API with OpenAPI server running at http://localhost:${port}`);
  console.log(`📝 Test the API with the following endpoints:`);
  console.log(`   GET    http://localhost:${port}/api/users`);
  console.log(`   POST   http://localhost:${port}/api/users`);
  console.log(`   GET    http://localhost:${port}/api/users/1`);
  console.log(`   GET    http://localhost:${port}/api/docs - OpenAPI documentation`);
  console.log(`   GET    http://localhost:${port}/api/docs/json - OpenAPI JSON specification`);
});
