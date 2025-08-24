# Coherent.js Object-Based API Framework Usage Guide

This guide explains how to use the pure object-oriented API framework in Coherent.js, featuring declarative routing, validation, error handling, serialization, and middleware.

## Table of Contents

1. [Object Router](#object-router)
2. [Error Handling](#error-handling)
3. [Validation](#validation)
4. [Serialization](#serialization)
5. [Middleware](#middleware)
6. [Pure Node.js HTTP Server Integration](#pure-nodejs-http-server-integration)
7. [Security Features](#security-features)

## Object Router

The object router provides a pure object-oriented approach to define API routes using nested JavaScript objects.

### Basic Usage

```javascript
import { createObjectRouter } from 'coherent/api';

const routes = {
  api: {
    users: {
      get: {
        handler: (req, res) => ({ users: [] })
      },
      post: {
        handler: (req, res) => ({ user: { id: 1, name: 'John Doe' } })
      },
      ':id': {
        get: {
          handler: (req, res) => ({ user: { id: req.params.id, name: 'John Doe' } })
        }
      }
    }
  }
};

const router = createObjectRouter(routes);
export default router;
```

### HTTP Methods

The object router supports all standard HTTP methods as object keys:

- `get: { handler: ... }`
- `post: { handler: ... }`
- `put: { handler: ... }`
- `delete: { handler: ... }`
- `patch: { handler: ... }`

### Middleware

You can add middleware to routes using the middleware property:

```javascript
const routes = {
  api: {
    users: {
      get: {
        middleware: [
          (req, res, next) => {
            console.log('Request received');
            next();
          }
        ],
        handler: (req, res) => ({ users: [] })
      }
    }
  }
};
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

const routes = {
  api: {
    users: {
      ':id': {
        get: {
          handler: (req, res) => {
            const userId = req.params.id;
            
            if (userId !== '1') {
              throw new NotFoundError('User not found');
            }
            
            return { user: { id: userId, name: 'John Doe' } };
          }
        }
      }
    }
  }
};
```

### Error Handling Middleware

Error handling is enabled by default in object routes, but you can control it:

```javascript
const routes = {
  api: {
    error: {
      get: {
        errorHandling: true, // enabled by default
        handler: async (req, res) => {
          // This might throw an error
          throw new Error('Something went wrong');
        }
      }
    }
  }
};
```

### Express Integration

For Express integration, the object router handles errors automatically:

```javascript
import express from 'express';
import { createObjectRouter } from 'coherent/api';

const app = express();
const router = createObjectRouter(routes);

app.use(router.toExpress());
```

## Validation

The API framework provides schema-based validation utilities.

### Usage

```javascript
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

const routes = {
  api: {
    users: {
      post: {
        validation: userSchema,
        handler: (req, res) => {
          // This will only be called if validation passes
          const { name, email } = req.body;
          return { user: { id: 1, name, email } };
        }
      }
    }
  }
};
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

const routes = {
  api: {
    users: {
      get: {
        middleware: [customMiddleware],
        handler: (req, res) => ({ users: [] })
      }
    }
  }
};
```

## Pure Node.js HTTP Server Integration

The object router creates a pure Node.js HTTP server without external dependencies:

```javascript
import { createObjectRouter } from 'coherent/api';

const routes = {
  api: {
    users: {
      get: {
        handler: (req, res) => ({ users: [] })
      },
      post: {
        validation: userSchema,
        handler: (req, res) => ({ user: { id: 1, name: 'New User' } })
      }
    },
    status: {
      get: {
        handler: (req, res) => ({ status: 'ok', timestamp: new Date() })
      }
    }
  }
};

const router = createObjectRouter(routes);
const server = router.createServer();

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Request Handling

The router automatically:
- **Parses URLs** and matches routes
- **Handles JSON responses** with proper Content-Type headers
- **Applies middleware** in the correct order
- **Validates requests** using JSON Schema
- **Handles errors** with proper HTTP status codes

## Security Features

The Coherent.js API framework includes comprehensive security features built-in:

### Security Headers

All responses include security headers automatically:

```javascript
const { SimpleRouter, processRoutes } = require('../src/api');

const router = new SimpleRouter();

// Security headers are automatically added:
// - Access-Control-Allow-Origin: http://localhost:3000 (configurable)
// - X-Frame-Options: DENY
// - X-Content-Type-Options: nosniff
// - X-XSS-Protection: 1; mode=block
// - Content-Security-Policy: default-src 'self'

const server = router.createServer({
  corsOrigin: 'https://yourdomain.com', // Configure CORS origin
  maxBodySize: 2 * 1024 * 1024, // 2MB request size limit
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 200 // 200 requests per minute per IP
  }
});
```

### Rate Limiting

Built-in rate limiting prevents DoS attacks:

```javascript
// Default: 100 requests per minute per IP
// Customize in server options:
const server = router.createServer({
  rateLimit: {
    windowMs: 300000, // 5 minutes
    maxRequests: 1000 // 1000 requests per 5 minutes
  }
});

// Rate limited requests return 429 status
```

### Input Sanitization

All JSON request bodies are automatically sanitized:

```javascript
const routes = {
  api: {
    users: {
      POST: {
        handler: async (req, res) => {
          // req.body is automatically sanitized:
          // - HTML tags are escaped
          // - Prototype pollution attempts are blocked
          // - Dangerous properties are removed
          
          console.log('Safe data:', req.body);
          return { success: true, user: req.body };
        }
      }
    }
  }
};
```

### Authentication & Authorization

Use built-in security middleware:

```javascript
const { withAuth, withRole, generateToken, hashPassword } = require('../src/api/security');

const routes = {
  api: {
    protected: {
      GET: {
        middleware: [withAuth], // Requires valid JWT token
        handler: async (req, res) => {
          return { message: 'Access granted', user: req.user };
        }
      }
    },
    admin: {
      GET: {
        middleware: [withAuth, withRole('admin')], // Requires admin role
        handler: async (req, res) => {
          return { message: 'Admin access granted' };
        }
      }
    },
    login: {
      POST: {
        handler: async (req, res) => {
          const { username, password } = req.body;
          
          // Verify credentials (implement your logic)
          if (await verifyCredentials(username, password)) {
            const token = generateToken({ username, role: 'user' });
            return { token, user: { username } };
          }
          
          res.statusCode = 401;
          return { error: 'Invalid credentials' };
        }
      }
    }
  }
};
```

### Input Validation

JSON Schema validation with security considerations:

```javascript
const { withValidation } = require('../src/api/security');

const userSchema = {
  type: 'object',
  properties: {
    name: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100,
      pattern: '^[a-zA-Z0-9\\s]+$' // Prevent injection
    },
    email: { 
      type: 'string', 
      format: 'email',
      maxLength: 255
    }
  },
  required: ['name', 'email'],
  additionalProperties: false // Prevent extra properties
};

const routes = {
  api: {
    users: {
      POST: {
        middleware: [withValidation(userSchema)],
        handler: async (req, res) => {
          // req.body is validated and sanitized
          return { success: true, user: req.body };
        }
      }
    }
  }
};
```

### Password Security

Built-in password hashing utilities:

```javascript
const { hashPassword, verifyPassword } = require('../src/api/security');

// Hash passwords before storing
const hashedPassword = await hashPassword('userPassword');

// Verify passwords during login
const isValid = await verifyPassword('userPassword', hashedPassword);
```

### Request Size Limits

Automatic protection against large payloads:

```javascript
// Default: 1MB limit
// Requests exceeding limit return 413 status

const server = router.createServer({
  maxBodySize: 5 * 1024 * 1024 // 5MB limit
});
```

### CORS Configuration

Flexible CORS setup for cross-origin requests:

```javascript
const server = router.createServer({
  corsOrigin: 'https://yourdomain.com', // Single origin
  // or
  corsOrigin: ['https://app.com', 'https://admin.com'], // Multiple origins
  // or
  corsOrigin: '*' // Allow all (not recommended for production)
});
```

## Security Best Practices

1. **Always validate input** - Use JSON Schema validation
2. **Sanitize data** - Built-in sanitization prevents XSS
3. **Use HTTPS** - Deploy with SSL/TLS certificates
4. **Configure CORS** - Set specific allowed origins
5. **Implement authentication** - Use JWT tokens with expiration
6. **Rate limit requests** - Prevent abuse and DoS attacks
7. **Monitor logs** - Track suspicious activity
8. **Keep dependencies updated** - Regular security updates

## Example

See `examples/object-router-demo.js` for a comprehensive example with all features.
