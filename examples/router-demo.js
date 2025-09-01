/**
 * Object-based Router Demo for Coherent.js
 * 
 * @fileoverview Demonstrates pure object-oriented routing with:
 * - Declarative nested route objects
 * - Validation and middleware
 * - Error handling
 * - Pure Node.js HTTP server
 * 
 * @author Coherent.js Team
 * @version 1.0.0
 */

import { createObjectRouter } from '../packages/api/src/router.js';
import { ApiError } from '../packages/api/src/errors.js';

// Sample data stores
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

const posts = [
  { id: 1, title: 'Hello World', content: 'First post', authorId: 1 },
  { id: 2, title: 'API Design', content: 'Object-based routing', authorId: 2 }
];

// Validation schemas
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'email']
};

const postSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    content: { type: 'string', minLength: 1 },
    authorId: { type: 'number' }
  },
  required: ['title', 'content', 'authorId']
};

/**
 * Authentication middleware - validates authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @throws {ApiError} When authorization header is missing
 */
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    throw new ApiError('Authorization required', 401);
  }
  req.user = { id: 1, name: 'John Doe' };
  next();
};

/**
 * Logging middleware - logs HTTP method and URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logMiddleware = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

/**
 * Comprehensive object-based route definition
 * Demonstrates the full capabilities of declarative routing
 */
const apiDefinition = {

  // Root endpoint - GET /
  get: {
    path: '/',
    handler: (req, res) => ({ 
      message: 'Welcome to Coherent.js Object-based Router!',
      timestamp: new Date().toISOString(),
      features: [
        'Declarative route definitions',
        'Nested route structures',
        'Built-in validation',
        'Middleware support',
        'Express/Fastify integration'
      ]
    })
  },

  // Simple utility endpoints
  ping: {
    get: {
      handler: () => ({ message: 'pong', timestamp: Date.now() })
    }
  },

  time: {
    get: {
      handler: () => ({ 
        time: new Date().toISOString(),
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  },

  echo: {
    post: {
      handler: (req, res) => ({
        echo: req.body,
        method: req.method,
        path: req.url,
        headers: req.headers
      })
    }
  },

  // Error handling demonstration endpoints
  error: {
    // Test generic error
    generic: {
      get: {
        handler: () => {
          throw new Error('This is a generic error for testing');
        }
      }
    },

    // Test API error with custom status
    api: {
      get: {
        handler: () => {
          throw new ApiError('This is a custom API error', 422);
        }
      }
    },

    // Test validation error (will be caught by validation middleware)
    validation: {
      post: {
        validation: {
          type: 'object',
          properties: {
            required_field: { type: 'string', minLength: 5 }
          },
          required: ['required_field']
        },
        handler: () => ({
          message: 'This should not be reached due to validation error'
        })
      }
    },

    // Test async error
    async: {
      get: {
        handler: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          throw new ApiError('Async operation failed', 503);
        }
      }
    },

    // Test error handling disabled for a specific route
    unhandled: {
      get: {
        errorHandling: false,
        handler: () => {
          throw new Error('This error will not be caught by middleware');
        }
      }
    }
  },

  // API namespace with comprehensive features
  api: {
    // Health and status endpoints
    health: {
      get: {
        handler: (req, res) => ({ 
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        })
      }
    },

    status: {
      get: {
        handler: () => ({ 
          status: 'running', 
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        })
      }
    },

    // Users resource with full CRUD operations
    users: {
      // GET /api/users - List all users
      get: {
        handler: (req, res) => ({ 
          users,
          total: users.length,
          timestamp: new Date().toISOString()
        })
      },

      // POST /api/users - Create user
      post: {
        validation: userSchema,
        handler: (req, res) => {
          const { name, email } = req.body;
          
          if (users.some(u => u.email === email)) {
            throw new ApiError('User with this email already exists', 409);
          }
          
          const newUser = {
            id: Math.max(0, ...users.map(u => u.id)) + 1,
            name,
            email,
            created: new Date().toISOString()
          };
          
          users.push(newUser);
          res.status(201);
          return { user: newUser, message: 'User created successfully' };
        }
      },

      // User by ID operations
      ':id': {
        // GET /api/users/:id - Get specific user
        get: {
          handler: (req, res) => {
            const userId = parseInt(req.params.id);
            const user = users.find(u => u.id === userId);
            
            if (!user) {
              throw new ApiError('User not found', 404);
            }
            
            return { user };
          }
        },

        // PUT /api/users/:id - Update user (requires auth)
        put: {
          validation: userSchema,
          middleware: [authMiddleware],
          handler: (req, res) => {
            const userId = parseInt(req.params.id);
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
              throw new ApiError('User not found', 404);
            }
            
            const updatedUser = { 
              ...users[userIndex], 
              ...req.body,
              updated: new Date().toISOString()
            };
            users[userIndex] = updatedUser;
            
            return { user: updatedUser, message: 'User updated successfully' };
          }
        },

        // DELETE /api/users/:id - Delete user (requires auth)
        delete: {
          middleware: [authMiddleware],
          handler: (req, res) => {
            const userId = parseInt(req.params.id);
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
              throw new ApiError('User not found', 404);
            }
            
            const deletedUser = users.splice(userIndex, 1)[0];
            return { message: 'User deleted successfully', user: deletedUser };
          }
        },

        // User's posts - nested resource
        posts: {
          get: {
            handler: (req, res) => {
              const userId = parseInt(req.params.id);
              const userPosts = posts.filter(p => p.authorId === userId);
              return { 
                userId,
                posts: userPosts,
                total: userPosts.length
              };
            }
          }
        }
      }
    },

    // Posts resource with full CRUD operations
    posts: {
      // GET /api/posts - List all posts
      get: {
        handler: (req, res) => ({ 
          posts,
          total: posts.length,
          timestamp: new Date().toISOString()
        })
      },

      // POST /api/posts - Create post (requires auth)
      post: {
        validation: postSchema,
        middleware: [authMiddleware],
        handler: (req, res) => {
          const { title, content, authorId } = req.body;
          
          const newPost = {
            id: Math.max(0, ...posts.map(p => p.id)) + 1,
            title,
            content,
            authorId,
            created: new Date().toISOString()
          };
          
          posts.push(newPost);
          res.status(201);
          return { post: newPost, message: 'Post created successfully' };
        }
      },

      // Post by ID operations
      ':id': {
        get: {
          handler: (req, res) => {
            const postId = parseInt(req.params.id);
            const post = posts.find(p => p.id === postId);
            
            if (!post) {
              throw new ApiError('Post not found', 404);
            }
            
            return { post };
          }
        },

        put: {
          validation: postSchema,
          middleware: [authMiddleware],
          handler: (req, res) => {
            const postId = parseInt(req.params.id);
            const postIndex = posts.findIndex(p => p.id === postId);
            
            if (postIndex === -1) {
              throw new ApiError('Post not found', 404);
            }
            
            const updatedPost = { 
              ...posts[postIndex], 
              ...req.body,
              updated: new Date().toISOString()
            };
            posts[postIndex] = updatedPost;
            
            return { post: updatedPost, message: 'Post updated successfully' };
          }
        },

        delete: {
          middleware: [authMiddleware],
          handler: (req, res) => {
            const postId = parseInt(req.params.id);
            const postIndex = posts.findIndex(p => p.id === postId);
            
            if (postIndex === -1) {
              throw new ApiError('Post not found', 404);
            }
            
            const deletedPost = posts.splice(postIndex, 1)[0];
            return { message: 'Post deleted successfully', post: deletedPost };
          }
        }
      }
    },

    // Calculator utilities
    calc: {
      add: {
        post: {
          handler: (req, res) => {
            const { a, b } = req.body;
            const numA = Number(a);
            const numB = Number(b);
            return {
              operation: 'add',
              a: numA,
              b: numB,
              result: numA + numB,
              timestamp: new Date().toISOString()
            };
          }
        }
      },

      multiply: {
        post: {
          handler: (req, res) => {
            const { a, b } = req.body;
            const numA = Number(a);
            const numB = Number(b);
            return {
              operation: 'multiply',
              a: numA,
              b: numB,
              result: numA * numB,
              timestamp: new Date().toISOString()
            };
          }
        }
      },

      divide: {
        post: {
          handler: (req, res) => {
            const { a, b } = req.body;
            const numA = Number(a);
            const numB = Number(b);
            
            if (numB === 0) {
              throw new ApiError('Division by zero is not allowed', 400);
            }
            
            return {
              operation: 'divide',
              a: numA,
              b: numB,
              result: numA / numB,
              timestamp: new Date().toISOString()
            };
          }
        }
      }
    },

    // Admin section (requires authentication)
    admin: {
      dashboard: {
        middleware: [authMiddleware],
        get: {
          handler: () => ({ 
            message: 'Admin dashboard',
            stats: {
              totalUsers: users.length,
              totalPosts: posts.length,
              serverUptime: process.uptime()
            }
          })
        }
      },

      settings: {
        get: {
          middleware: [authMiddleware],
          handler: () => ({ 
            settings: {
              environment: process.env.NODE_ENV || 'development',
              version: '1.0.0',
              features: ['object-routing', 'validation', 'middleware']
            }
          })
        },

        post: {
          middleware: [authMiddleware],
          validation: {
            type: 'object',
            properties: {
              setting: { type: 'string' },
              value: { type: 'string' }
            },
            required: ['setting', 'value']
          },
          handler: (req, res) => ({ 
            message: 'Settings updated', 
            data: req.body,
            timestamp: new Date().toISOString()
          })
        }
      }
    },
    
    // Add version endpoint to the object definition
    version: {
      get: {
        handler: (req, res) => ({
          version: '1.0.0',
          framework: 'Coherent.js',
          routing: 'object-based'
        })
      }
    }
  }
};

// Create the main router
const router = createObjectRouter(apiDefinition);

// Create pure Node.js HTTP server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = router.createServer();
  
  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, () => {
    console.log(`🚀 Comprehensive Object-based API server running on port ${PORT}`);
    console.log('\n📋 Available endpoints:');
    console.log('  GET  /                    - Welcome message');
    console.log('  GET  /ping                - Simple ping');
    console.log('  GET  /time                - Current time');
    console.log('  POST /echo                - Echo request');
    console.log('  GET  /error/generic       - Test generic error handling');
    console.log('  GET  /error/api           - Test API error handling');
    console.log('  POST /error/validation    - Test validation error handling');
    console.log('  GET  /error/async         - Test async error handling');
    console.log('  GET  /error/unhandled     - Test unhandled error (no middleware)');
    console.log('  GET  /api/health          - Health check');
    console.log('  GET  /api/status          - Server status');
    console.log('  GET  /api/users           - List users');
    console.log('  POST /api/users           - Create user');
    console.log('  GET  /api/users/:id       - Get user by ID');
    console.log('  PUT  /api/users/:id       - Update user (auth required)');
    console.log('  DELETE /api/users/:id     - Delete user (auth required)');
    console.log('  GET  /api/users/:id/posts - Get user posts');
    console.log('  GET  /api/posts           - List posts');
    console.log('  POST /api/posts           - Create post (auth required)');
    console.log('  GET  /api/posts/:id       - Get post by ID');
    console.log('  PUT  /api/posts/:id       - Update post (auth required)');
    console.log('  DELETE /api/posts/:id     - Delete post (auth required)');
    console.log('  POST /api/calc/add        - Add two numbers');
    console.log('  POST /api/calc/multiply   - Multiply two numbers');
    console.log('  POST /api/calc/divide     - Divide two numbers');
    console.log('  GET  /api/admin/dashboard - Admin dashboard (auth required)');
    console.log('  GET  /api/admin/settings  - Admin settings (auth required)');
    console.log('  POST /api/admin/settings  - Update settings (auth required)');
    console.log('  GET  /version             - Framework version');
    
    console.log('\n🧪 Test commands:');
    console.log(`  curl http://localhost:${PORT}/`);
    console.log(`  curl http://localhost:${PORT}/api/health`);
    console.log(`  curl http://localhost:${PORT}/api/users`);
    console.log(`  curl -X POST http://localhost:${PORT}/api/calc/add -H "Content-Type: application/json" -d '{"a":5,"b":3}'`);
    console.log(`  curl -X POST http://localhost:${PORT}/api/users -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.com"}'`);
    console.log(`  curl -H "Authorization: Bearer token" http://localhost:${PORT}/api/admin/dashboard`);
    
    console.log('\n✨ Features demonstrated:');
    console.log('  • Declarative object-based route definitions');
    console.log('  • Nested route structures matching URL hierarchy');
    console.log('  • Built-in JSON Schema validation');
    console.log('  • Route-specific and global middleware');
    console.log('  • Authentication and authorization');
    console.log('  • Full CRUD operations');
    console.log('  • Error handling with custom ApiError');
    console.log('  • Pure Node.js HTTP server');
    console.log('  • Zero external dependencies');
  });
}

export default router;
