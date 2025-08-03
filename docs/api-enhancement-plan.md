# Coherent.js API Enhancement Plan

## Current State Analysis

### Existing API Capabilities

1. **Core Rendering**
   - `renderToString(component, context?)` - Renders components to HTML strings
   - `renderToStream(component, context?)` - Renders components to Node.js streams
   - Performance monitoring and caching

2. **Component System**
   - `createComponent(renderFunction)` - Component creation
   - `withState(initialState)` - State management
   - `memo(component, keyFunction?)` - Memoization
   - `compose(...components)` - Component composition

3. **Framework Integrations**
   - Express.js middleware and handlers
   - Fastify plugin and handlers
   - Next.js API route handlers and components

### Current Limitations for API Development

1. **No built-in routing system**
2. **No request/response validation**
3. **No serialization/deserialization utilities**
4. **No OpenAPI/Swagger integration**
5. **No built-in error handling patterns**
6. **No middleware system for API-specific concerns**
7. **No built-in support for REST/GraphQL/RPC patterns**

## Proposed API Enhancements

### 1. API Router Module

A lightweight routing system similar to Express Router but designed for API endpoints:

```javascript
import { createApiRouter } from 'coherent-js/api';

const router = createApiRouter();

router.get('/users', (req, res) => {
  return {
    users: [
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' }
    ]
  };
});

router.post('/users', (req, res) => {
  const { name } = req.body;
  // Create user logic
  return { id: 3, name };
});
```

### 2. Request/Response Validation

Built-in validation using a schema-based approach:

```javascript
import { withValidation } from 'coherent-js/api';

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

const validatedHandler = withValidation(userSchema, (req, res) => {
  // req.body is guaranteed to match the schema
  return createUser(req.body);
});
```

### 3. Serialization Utilities

Automatic serialization of complex objects, dates, and custom types:

```javascript
import { withSerialization } from 'coherent-js/api';

const apiHandler = withSerialization((req, res) => {
  return {
    users: User.findAll(),
    timestamp: new Date(),
    // Complex objects automatically serialized
  };
});
```

### 4. Error Handling Patterns

Standardized error handling with automatic HTTP status codes:

```javascript
import { withErrorHandling } from 'coherent-js/api';

const errorHandler = withErrorHandling((req, res) => {
  if (!req.user) {
    throw new ApiError('Unauthorized', 401);
  }
  
  return getData();
});
```

### 5. OpenAPI/Swagger Integration

Automatic generation of OpenAPI documentation:

```javascript
import { withOpenApi } from 'coherent-js/api';

const documentedHandler = withOpenApi({
  summary: 'Get all users',
  description: 'Returns a list of all users in the system',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: userSchema
          }
        }
      }
    }
  }
}, (req, res) => {
  return User.findAll();
});
```

### 6. Middleware System

API-specific middleware for common concerns:

```javascript
import { createApiMiddleware } from 'coherent-js/api';

const authMiddleware = createApiMiddleware((req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    throw new ApiError('Missing authorization token', 401);
  }
  
  req.user = verifyToken(token);
  next();
});

const router = createApiRouter();
router.use(authMiddleware);
```

### 7. REST/GraphQL/RPC Adapters

Adapters for different API patterns:

```javascript
// REST Adapter
import { createRestAdapter } from 'coherent-js/api';

const restApi = createRestAdapter({
  resource: 'users',
  model: UserModel,
  // Automatically generates GET /users, POST /users, GET /users/:id, etc.
});

// GraphQL Adapter
import { createGraphqlAdapter } from 'coherent-js/api';

const graphqlApi = createGraphqlAdapter({
  schema: userSchema,
  resolvers: userResolvers
});
```

## Implementation Roadmap

### Phase 1: Core API Utilities (Completed)

1. **API Router Module**
   - Basic routing (GET, POST, PUT, DELETE)
   - Path parameters and query parameters
   - Route grouping and nesting

2. **Request/Response Validation**
   - Schema validation using JSON Schema
   - Automatic error responses for validation failures

3. **Error Handling**
   - Standardized error classes
   - Automatic HTTP status codes
   - Error serialization

4. **Serialization Utilities**
   - Date handling
   - Complex object serialization
   - Custom serializer registration

5. **OpenAPI/Swagger Integration**
   - OpenAPI 3.0 generation
   - Automatic documentation endpoint
   - Swagger UI integration

### Phase 2: Developer Experience (Completed)

1. **Middleware System**
   - Request/response transformation
   - Authentication/authorization
   - Logging and monitoring

2. **Documentation Generation**
   - Enhanced OpenAPI features
   - Custom documentation endpoints

### Phase 3: Advanced Features (Completed)

1. **API Adapters**
   - REST adapter with CRUD operations
   - GraphQL adapter
   - RPC adapter

2. **Performance Features**
   - Request caching
   - Rate limiting
   - Compression

3. **Security Features**
   - CORS handling
   - Security headers
   - Input sanitization

## Integration with Existing Framework

The new API modules integrate seamlessly with existing Coherent.js features:

1. **Express Integration**
   - Enhanced middleware with API features
   - Automatic routing registration

2. **Fastify Integration**
   - Plugins for API features
   - Schema-based validation integration

3. **Next.js Integration**
   - API route handlers with enhanced features
   - Serverless deployment optimization

## Example Usage

```javascript
// Basic API endpoint
import { createApiRouter, withValidation, withErrorHandling } from 'coherent-js/api';

const router = createApiRouter();

const userCreateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

router.post('/users', 
  withValidation(userCreateSchema),
  withErrorHandling(async (req, res) => {
    const user = await User.create(req.body);
    return { user };
  })
);

// Integration with Express
import express from 'express';
import { setupCoherentExpress } from 'coherent-js/express';

const app = express();
setupCoherentExpress(app);

app.use('/api', router.toExpress());

app.listen(3000);
```

This enhancement makes Coherent.js a full-featured framework for API development while maintaining its core philosophy of simplicity and performance.
