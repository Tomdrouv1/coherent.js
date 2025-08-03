# Coherent.js API Framework Usage Guide

This guide explains how to use the new API framework features in Coherent.js, including routing, validation, error handling, serialization, OpenAPI documentation, middleware, and adapters.

## Table of Contents

1. [API Router](#api-router)
2. [Error Handling](#error-handling)
3. [Validation](#validation)
4. [Serialization](#serialization)
5. [OpenAPI Documentation](#openapi-documentation)
6. [Middleware](#middleware)
7. [API Adapters](#api-adapters)
8. [Integration with Express](#integration-with-express)
9. [Integration with Fastify](#integration-with-fastify)

## API Router

The API router provides a simple way to define routes for your API endpoints.

### Basic Usage

```javascript
import { createApiRouter } from 'coherent/api';

const router = createApiRouter();

// Define routes
router.get('/users', (req, res) => {
  return { users: [] };
});

router.post('/users', (req, res) => {
  // Create a new user
  return { user: { id: 1, name: 'John Doe' } };
});

router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  return { user: { id: userId, name: 'John Doe' } };
});

export default router;
```

### HTTP Methods

The router supports all standard HTTP methods:

- `router.get(path, handler)`
- `router.post(path, handler)`
- `router.put(path, handler)`
- `router.delete(path, handler)`
- `router.patch(path, handler)`

### Middleware

You can add middleware to routes:

```javascript
router.get('/users', 
  (req, res, next) => {
    // Middleware function
    console.log('Request received');
    next();
  },
  (req, res) => {
    return { users: [] };
  }
);
```

## Error Handling

The API framework provides standardized error classes and handling utilities.

### Error Classes

- `ApiError` - Base API error class
- `ValidationError` - Validation error
- `AuthenticationError` - Authentication error
- `AuthorizationError` - Authorization error
- `NotFoundError` - Not found error
- `ConflictError` - Conflict error

### Usage

```javascript
import { ApiError, NotFoundError } from 'coherent/api';

router.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  
  if (userId !== '1') {
    throw new NotFoundError('User not found');
  }
  
  return { user: { id: userId, name: 'John Doe' } };
});
```

### Error Handling Middleware

You can wrap route handlers with error handling middleware:

```javascript
import { withErrorHandling } from 'coherent/api';

const handleErrors = withErrorHandling(async (req, res) => {
  // This might throw an error
  throw new Error('Something went wrong');
});

router.get('/error', handleErrors);
```

### Global Error Handler

For Express integration, you can use the global error handler:

```javascript
import { createErrorHandler } from 'coherent/api';

app.use(createErrorHandler());
```

## Validation

The API framework provides schema-based validation utilities.

### Usage

```javascript
import { withValidation } from 'coherent/api';

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

router.post('/users', 
  withValidation(userSchema),
  (req, res) => {
    // This will only be called if validation passes
    const { name, email } = req.body;
    return { user: { id: 1, name, email } };
  }
);
```

### Query and Parameter Validation

You can also validate query parameters and path parameters:

```javascript
import { withQueryValidation, withParamsValidation } from 'coherent/api';

const querySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', minimum: 1, maximum: 100 }
  }
};

const paramsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^\d+$' }
  }
};

router.get('/users', 
  withQueryValidation(querySchema),
  (req, res) => {
    const { limit } = req.query;
    return { users: [], limit };
  }
);

router.get('/users/:id', 
  withParamsValidation(paramsSchema),
  (req, res) => {
    const { id } = req.params;
    return { user: { id, name: 'John Doe' } };
  }
);
```

## Serialization

The API framework provides utilities for serializing complex data types like Date, Map, and Set objects.

### Usage

```javascript
import { serializeForJSON } from 'coherent/api';

router.get('/events', (req, res) => {
  const events = [
    {
      id: 1,
      name: 'Event 1',
      date: new Date('2023-01-01T12:00:00Z'),
      tags: new Set(['important', 'meeting']),
      metadata: new Map([['location', 'Room A'], ['organizer', 'John Doe']])
    }
  ];
  
  // Serialize complex data types for JSON response
  return serializeForJSON({ events });
});
```

### Serialization Functions

- `serializeDate(date)` - Serialize a Date object to ISO string
- `deserializeDate(dateString)` - Deserialize an ISO date string to Date object
- `serializeMap(map)` - Serialize a Map to plain object
- `deserializeMap(obj)` - Deserialize a plain object to Map
- `serializeSet(set)` - Serialize a Set to array
- `deserializeSet(arr)` - Deserialize an array to Set
- `serializeForJSON(data)` - Recursively serialize complex data for JSON

### Serialization Middleware

You can use the serialization middleware to add serialization helpers to request and response objects:

```javascript
import { withSerialization } from 'coherent/api';

router.get('/events', 
  withSerialization(),
  (req, res) => {
    const date = res.serialize.date(new Date());
    const map = res.serialize.map(new Map([['key', 'value']]));
    const set = res.serialize.set(new Set(['item1', 'item2']));
    
    return { date, map, set };
  }
);
```

## OpenAPI Documentation

The API framework provides utilities for generating OpenAPI documentation automatically.

### Usage

```javascript
import { withOpenApi } from 'coherent/api';

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
              }
            }
          }
        }
      }
    }
  }
});

router.get('/users', 
  listUsersOpenApi,
  (req, res) => {
    return { users: [] };
  }
);
```

### OpenAPI Functions

- `withOpenApi(options)` - Middleware to add OpenAPI metadata to routes
- `generateOpenApiSpec(appInfo, routes)` - Generate OpenAPI specification from routes
- `createOpenApiHandler(appInfo, routes)` - Create handler for OpenAPI JSON endpoint
- `createSwaggerUIHandler()` - Create handler for Swagger UI endpoint

### Integration with Express

```javascript
import express from 'express';
import apiRouter from './api-router.js';
import { createOpenApiHandler, createSwaggerUIHandler } from 'coherent/api';

const app = express();

// Mount the API router
app.use('/api', apiRouter.toExpress());

// Add OpenAPI documentation endpoints
const appInfo = {
  title: 'My API',
  version: '1.0.0',
  description: 'API documentation'
};

// Get registered routes (implementation depends on router)
const routes = [];

app.get('/api/docs/json', createOpenApiHandler(appInfo, routes));
app.get('/api/docs', createSwaggerUIHandler());

app.listen(3000);
```

## Middleware

The API framework provides a comprehensive middleware system for common API concerns.

### Authentication Middleware

```javascript
import { withAuth } from 'coherent/api';

const verifyToken = (token) => {
  // Verify token and return user object
  if (isValidToken(token)) {
    return getUserFromToken(token);
  }
  throw new Error('Invalid token');
};

router.get('/users', 
  withAuth(verifyToken),
  (req, res) => {
    // req.user is available here
    return { users: [] };
  }
);
```

### Authorization Middleware

```javascript
import { withPermission } from 'coherent/api';

const checkPermission = (user, req) => {
  // Check if user has permission for this request
  return user.role === 'admin';
};

router.delete('/users/:id', 
  withPermission(checkPermission),
  (req, res) => {
    // Only users with permission can access this
    return { message: 'User deleted' };
  }
);
```

### Logging Middleware

```javascript
import { withLogging } from 'coherent/api';

// Apply globally
router.use(withLogging({ level: 'info' }));

// Or apply to specific routes
router.get('/users', 
  withLogging(),
  (req, res) => {
    return { users: [] };
  }
);
```

### CORS Middleware

```javascript
import { withCors } from 'coherent/api';

// Apply globally
router.use(withCors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Rate Limiting Middleware

```javascript
import { withRateLimit } from 'coherent/api';

// Apply globally
router.use(withRateLimit({
  windowMs: 60000, // 1 minute
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

### Input Sanitization Middleware

```javascript
import { withSanitization } from 'coherent/api';

// Apply globally
router.use(withSanitization({
  sanitizeBody: true,
  sanitizeQuery: true,
  sanitizeParams: true
}));
```

### Custom Middleware

```javascript
import { createApiMiddleware } from 'coherent/api';

const customMiddleware = createApiMiddleware((req, res, next) => {
  // Custom logic here
  console.log('Custom middleware executed');
  next();
});

router.get('/users', 
  customMiddleware,
  (req, res) => {
    return { users: [] };
  }
);
```

## API Adapters

The API framework provides adapters for different API patterns like REST, RPC, and GraphQL.

### REST Adapter

The REST adapter automatically generates CRUD endpoints for a resource:

```javascript
import { RestAdapter } from 'coherent/api';

// Mock model
const userModel = {
  findAll: async () => [{ id: 1, name: 'John Doe' }],
  create: async (data) => ({ id: 2, ...data }),
  findById: async (id) => ({ id, name: 'Item ' + id }),
  update: async (id, data) => ({ id, ...data }),
  patch: async (id, data) => ({ id, ...data }),
  delete: async (id) => true
};

// Create REST adapter
const userRestAdapter = new RestAdapter({
  resource: 'users',
  model: userModel,
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' }
    },
    required: ['name', 'email']
  }
});

// Register routes
userRestAdapter.registerRoutes(router, '/api');
```

This automatically creates the following endpoints:
- `GET /api/users` - List all users
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a specific user
- `PATCH /api/users/:id` - Partially update a specific user
- `DELETE /api/users/:id` - Delete a specific user

### RPC Adapter

The RPC adapter handles remote procedure calls:

```javascript
import { RpcAdapter } from 'coherent/api';

// Mock methods
const rpcMethods = {
  add: async (params) => params.a + params.b,
  greet: async (params) => `Hello, ${params.name}!`
};

// Create RPC adapter
const rpcAdapter = new RpcAdapter({
  methods: rpcMethods
});

// Register routes
rpcAdapter.registerRoutes(router, '/api');
```

This creates a single endpoint `POST /api/rpc` that handles all RPC calls:

```javascript
// Example RPC call
fetch('/api/rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'add',
    params: { a: 1, b: 2 }
  })
});
```

### GraphQL Adapter

The GraphQL adapter handles GraphQL queries and mutations:

```javascript
import { GraphqlAdapter } from 'coherent/api';

// Mock schema and resolvers
const graphqlSchema = `
  type Query {
    hello: String
  }
`;

const graphqlResolvers = {
  Query: {
    hello: () => 'Hello world!'
  }
};

// Create GraphQL adapter
const graphqlAdapter = new GraphqlAdapter({
  schema: graphqlSchema,
  resolvers: graphqlResolvers
});

// Register routes
graphqlAdapter.registerRoutes(router, '/api');
```

This creates two endpoints:
- `POST /api/graphql` - Handle GraphQL queries and mutations
- `GET /api/graphql` - Serve GraphQL playground (in development)

## Integration with Express

The API router can be easily integrated with Express:

```javascript
import express from 'express';
import apiRouter from './api-router.js';

const app = express();
app.use(express.json());

// Mount the API router
app.use('/api', apiRouter.toExpress());

// Global error handler
app.use(createErrorHandler());

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Integration with Fastify

The API router can also be integrated with Fastify:

```javascript
import fastify from 'fastify';
import apiRouter from './api-router.js';

const app = fastify();

// Register the API router as a plugin
app.register(apiRouter.toFastify());

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running on ${address}`);
});
```

## Example

See the full example in `examples/api-demo.js` for a complete implementation of all API features.
See `examples/api-with-serialization.js` for an example with serialization.
See `examples/api-with-openapi.js` for an example with OpenAPI documentation.
See `examples/api-with-middleware.js` for an example with middleware.
See `examples/api-with-adapters.js` for an example with API adapters.
