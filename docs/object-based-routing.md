# Object-based Routing in Coherent.js

Coherent.js now supports defining API routes using pure JavaScript objects, extending the framework's object-oriented philosophy from UI components to backend routing.

## Overview

Object-based routing allows developers to define their entire API structure using declarative JavaScript objects, making route definitions more readable, maintainable, and consistent with Coherent.js's component system.

## Basic Usage

### Simple Route Definition

```javascript
import { createRouter } from '../src/api/router.js';

const routes = {
  // GET /
  get: {
    path: '/',
    handler: (req, res) => ({ message: 'Hello World' })
  },

  // POST /users
  users: {
    post: {
      handler: (req, res) => ({ user: req.body })
    }
  }
};

const router = createRouter(routes);
```

### Nested Routes

```javascript
const apiRoutes = {
  api: {
    v1: {
      users: {
        // GET /api/v1/users
        get: {
          handler: () => ({ users: [] })
        },

        // POST /api/v1/users
        post: {
          validation: userSchema,
          handler: (req, res) => ({ user: req.body })
        },

        // GET /api/v1/users/:id
        ':id': {
          get: {
            handler: (req, res) => ({ user: { id: req.params.id } })
          },

          // GET /api/v1/users/:id/posts
          posts: {
            get: {
              handler: (req, res) => ({ posts: [] })
            }
          }
        }
      }
    }
  }
};
```

## Route Properties

Each route object can contain the following properties:

### Core Properties

- **`handler`**: Function that handles the request
- **`handlers`**: Array of handler functions (middleware chain)
- **`path`**: Explicit path override (optional)
- **`validation`**: JSON Schema for request validation
- **`middleware`**: Route-specific middleware

### Example with All Properties

```javascript
const routes = {
  api: {
    users: {
      post: {
        path: '/create-user', // Override default path
        validation: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' }
          },
          required: ['name', 'email']
        },
        middleware: [authMiddleware, logMiddleware],
        handler: (req, res) => {
          // Main handler logic
          return { user: req.body };
        }
      }
    }
  }
};
```

## Helper Functions

The `route` helper provides convenient functions for creating route objects:

```javascript
import { route } from '@coherent/api/router';

const routes = {
  ...route.get({
    path: '/status',
    handler: () => ({ status: 'ok' })
  }),

  ...route.post({
    path: '/data',
    validation: dataSchema,
    handler: (req, res) => ({ received: req.body })
  }),

  ...route.middleware({
    handler: globalMiddleware
  }),

  ...route.group({
    path: '/admin',
    middleware: [authMiddleware],
    routes: {
      ...route.get({
        path: '/dashboard',
        handler: () => ({ dashboard: 'data' })
      })
    }
  })
};
```

## HTTP Methods

Supported HTTP methods as object keys:

- `get` - GET requests
- `post` - POST requests
- `put` - PUT requests
- `delete` - DELETE requests
- `patch` - PATCH requests

## Middleware Integration

### Global Middleware

```javascript
const routes = {
  middleware: {
    handler: (req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    }
  },

  // Routes here will use the global middleware
  api: {
    // ...
  }
};
```

### Route-specific Middleware

```javascript
const routes = {
  api: {
    protected: {
      get: {
        middleware: [authMiddleware, rateLimitMiddleware],
        handler: (req, res) => ({ data: 'protected' })
      }
    }
  }
};
```

## Validation

Object-based routing integrates seamlessly with Coherent.js validation:

```javascript
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    age: { type: 'number', minimum: 0 }
  },
  required: ['name', 'email']
};

const routes = {
  users: {
    post: {
      validation: userSchema,
      handler: (req, res) => {
        // req.body is already validated
        return { user: req.body };
      }
    }
  }
};
```

## Framework Integration

### Express.js

```javascript
import express from 'express';
import { createRouter } from '@coherent/api/router';

const app = express();
app.use(express.json());

const router = createRouter(routes);
app.use(router.toExpress());

app.listen(3000);
```

### Fastify

```javascript
import Fastify from 'fastify';
import { createRouter } from '@coherent/api/router';

const fastify = Fastify();
const router = createRouter(routes);

fastify.register(router.toFastify());
fastify.listen({ port: 3000 });
```

## Advanced Features

### Route Groups

```javascript
const routes = {
  api: {
    v1: {
      // Group-level middleware
      middleware: [versionMiddleware],
      
      users: {
        get: { handler: getUsersV1 }
      }
    },

    v2: {
      middleware: [versionMiddleware],
      
      users: {
        get: { handler: getUsersV2 }
      }
    }
  }
};
```

### Dynamic Paths

```javascript
const routes = {
  api: {
    users: {
      ':userId': {
        get: {
          handler: (req, res) => ({ userId: req.params.userId })
        },

        posts: {
          ':postId': {
            get: {
              handler: (req, res) => ({
                userId: req.params.userId,
                postId: req.params.postId
              })
            }
          }
        }
      }
    }
  }
};
```

## Error Handling

Object-based routing includes automatic error handling:

```javascript
const routes = {
  api: {
    users: {
      get: {
        errorHandling: true, // Default: true
        handler: (req, res) => {
          // Errors are automatically caught and handled
          throw new ApiError('Something went wrong', 500);
        }
      }
    }
  }
};
```

## Complete Example

See the comprehensive example in `examples/router-demo.js` which demonstrates:

- **Full CRUD operations** for users and posts
- **Nested resources** (user posts)
- **Authentication middleware** for protected routes
- **JSON Schema validation** for request bodies
- **Calculator utilities** with error handling
- **Admin section** with authorization
- **Express.js integration** with automatic server startup

Run the example:
```bash
node examples/router-demo.js
```

This will start a server on port 3000 with 20+ endpoints showcasing all object-based routing features.

## Comparison with Traditional Routing

### Traditional Method Chaining

```javascript
// Traditional approach
const router = createApiRouter();
router.get('/api/users', getUsersHandler);
router.post('/api/users', validateUser, createUserHandler);
router.get('/api/users/:id', getUserHandler);
router.get('/api/users/:id/posts', getUserPostsHandler);
```

### Object-based Approach

```javascript
// Object-based approach
const routes = {
  api: {
    users: {
      get: { handler: getUsersHandler },
      post: { 
        validation: userSchema,
        handler: createUserHandler 
      },
      ':id': {
        get: { handler: getUserHandler },
        posts: {
          get: { handler: getUserPostsHandler }
        }
      }
    }
  }
};

const router = createRouter(routes);
```

## Benefits

1. **Declarative**: Routes are defined as data structures
2. **Hierarchical**: Natural nesting reflects URL structure  
3. **Consistent**: Matches Coherent.js component philosophy
4. **Maintainable**: Easy to see entire API structure at a glance
5. **Flexible**: Supports all existing router features
6. **Type-safe**: Can be easily typed with TypeScript

## Migration Guide

Existing Coherent.js applications can gradually migrate to object-based routing:

1. Start with new routes using object syntax
2. Gradually convert existing routes
3. Both approaches can coexist in the same application

```javascript
// Mixed approach during migration
const router = createApiRouter();

// Traditional routes
router.get('/legacy', legacyHandler);

// Object-based routes
const newRoutes = {
  api: {
    v2: {
      users: {
        get: { handler: newUsersHandler }
      }
    }
  }
};

transformRouteObject(newRoutes, router);
```

This object-based routing system brings the same declarative, object-oriented approach that makes Coherent.js components so intuitive to the backend API layer.
