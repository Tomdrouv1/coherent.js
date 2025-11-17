/**
 * Authentication Scaffolding Generator
 * Generates JWT and session-based authentication setup
 */

/**
 * Generate JWT authentication middleware
 */
export function generateJWTAuth(runtime) {
  const middlewares = {
    express: `
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}
`,
    fastify: `
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authPlugin(fastify, options) {
  fastify.decorate('authenticate', async function(request, reply) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      reply.code(401).send({ error: 'Invalid or expired token' });
      return;
    }

    request.user = decoded;
  });

  fastify.decorate('optionalAuth', async function(request, reply) {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        request.user = decoded;
      }
    }
  });
}
`,
    koa: `
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authMiddleware(ctx, next) {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = { error: 'No token provided' };
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    ctx.status = 401;
    ctx.body = { error: 'Invalid or expired token' };
    return;
  }

  ctx.state.user = decoded;
  await next();
}

export async function optionalAuth(ctx, next) {
  const authHeader = ctx.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      ctx.state.user = decoded;
    }
  }

  await next();
}
`,
    'built-in': `
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function authenticateRequest(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyToken(token);
}
`
  };

  return middlewares[runtime] || middlewares['built-in'];
}

/**
 * Generate session-based authentication
 */
export function generateSessionAuth(runtime) {
  const middlewares = {
    express: `
import session from 'express-session';

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
};

export function setupSession(app) {
  app.use(session(sessionConfig));
}

export function authMiddleware(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

export function optionalAuth(req, res, next) {
  // Session is always available, just proceed
  next();
}
`,
    fastify: `
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
};

export async function authPlugin(fastify, options) {
  await fastify.register(fastifyCookie);
  await fastify.register(fastifySession, sessionConfig);

  fastify.decorate('authenticate', async function(request, reply) {
    if (!request.session.user) {
      reply.code(401).send({ error: 'Not authenticated' });
      return;
    }
  });

  fastify.decorate('optionalAuth', async function(request, reply) {
    // Session is always available, just proceed
  });
}
`,
    koa: `
import session from 'koa-session';

export const sessionConfig = {
  key: 'koa.sess',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  signed: true,
};

export function setupSession(app) {
  app.keys = [process.env.SESSION_SECRET || 'your-session-secret-change-this'];
  app.use(session(sessionConfig, app));
}

export async function authMiddleware(ctx, next) {
  if (!ctx.session.user) {
    ctx.status = 401;
    ctx.body = { error: 'Not authenticated' };
    return;
  }
  await next();
}

export async function optionalAuth(ctx, next) {
  // Session is always available, just proceed
  await next();
}
`
  };

  return middlewares[runtime] || '';
}

/**
 * Generate authentication routes
 */
export function generateAuthRoutes(runtime, authType) {
  const userAccess = runtime === 'koa' ? 'ctx.state.user' : 'req.user';
  const sessionUser = runtime === 'koa' ? 'ctx.session.user' : 'req.session.user';

  const jwtRoutes = {
    express: `
import express from 'express';
import { generateToken } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Validate input
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user (you should hash the password!)
    const user = await UserModel.create({ email, name });

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password (you should implement proper password checking!)

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(${userAccess}.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
`,
    'built-in': `
// Auth routes for built-in HTTP server
import { generateToken, verifyToken } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

// Register handler
export async function registerHandler(req, res) {
  try {
    // Parse JSON body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { email, name, password } = JSON.parse(body);

        // Validate input
        if (!email || !name || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing required fields' }));
        }

        // Check if user exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'User already exists' }));
        }

        // Create user (you should hash the password!)
        const user = await UserModel.create({ email, name });

        // Generate token
        const token = generateToken({ id: user.id, email: user.email });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: user.id, email: user.email, name: user.name }, token }));
      } catch (error) {
        console.error('Register error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Registration failed' }));
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Registration failed' }));
  }
}

// Login handler
export async function loginHandler(req, res) {
  try {
    // Parse JSON body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body);

        // Validate input
        if (!email || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing required fields' }));
        }

        // Find user
        const user = await UserModel.findByEmail(email);
        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid credentials' }));
        }

        // Verify password (you should implement proper password checking!)

        // Generate token
        const token = generateToken({ id: user.id, email: user.email });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user: { id: user.id, email: user.email, name: user.name }, token }));
      } catch (error) {
        console.error('Login error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Login failed' }));
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Login failed' }));
  }
}

// Get current user handler
export async function meHandler(req, res) {
  try {
    // Verify token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No token provided' }));
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: { id: user.id, email: user.email, name: user.name } }));
  } catch (error) {
    console.error('Get user error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to get user' }));
  }
}

// For built-in HTTP server compatibility
export function setupAuthRoutes() {
  return [
    {
      path: '/api/auth/register',
      method: 'POST',
      handler: registerHandler
    },
    {
      path: '/api/auth/login',
      method: 'POST',
      handler: loginHandler
    },
    {
      path: '/api/auth/me',
      method: 'GET',
      handler: meHandler
    }
  ];
}
`,
    fastify: `
import { generateToken } from '../plugins/auth.js';
import { UserModel } from '../db/models/User.js';

export default async function authRoutes(fastify, options) {
  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, name, password } = request.body;

      // Validate input
      if (!email || !name || !password) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return reply.code(400).send({ error: 'User already exists' });
      }

      // Create user (you should hash the password!)
      const user = await UserModel.create({ email, name });

      // Generate token
      const token = generateToken({ id: user.id, email: user.email });

      return { user: { id: user.id, email: user.email, name: user.name }, token };
    } catch (error) {
      fastify.log.error('Register error:', error);
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      // Validate input
      if (!email || !password) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Verify password (you should implement proper password checking!)

      // Generate token
      const token = generateToken({ id: user.id, email: user.email });

      return { user: { id: user.id, email: user.email, name: user.name }, token };
    } catch (error) {
      fastify.log.error('Login error:', error);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = await UserModel.findById(request.user.id);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      return { user: { id: user.id, email: user.email, name: user.name } };
    } catch (error) {
      fastify.log.error('Get user error:', error);
      return reply.code(500).send({ error: 'Failed to get user' });
    }
  });
}
`,
    koa: `
import Router from '@koa/router';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

const router = new Router();

// Register
router.post('/register', async (ctx) => {
  try {
    const { email, name, password } = ctx.request.body;

    // Validate input
    if (!email || !name || !password) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      ctx.status = 400;
      ctx.body = { error: 'User already exists' };
      return;
    }

    // Create user (you should hash the password!)
    const user = await UserModel.create({ email, name });

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    ctx.body = { user: { id: user.id, email: user.email, name: user.name }, token };
  } catch (error) {
    console.error('Register error:', error);
    ctx.status = 500;
    ctx.body = { error: 'Registration failed' };
  }
});

// Login
router.post('/login', async (ctx) => {
  try {
    const { email, password } = ctx.request.body;

    // Validate input
    if (!email || !password) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid credentials' };
      return;
    }

    // Verify password (you should implement proper password checking!)

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    ctx.body = { user: { id: user.id, email: user.email, name: user.name }, token };
  } catch (error) {
    console.error('Login error:', error);
    ctx.status = 500;
    ctx.body = { error: 'Login failed' };
  }
});

// Get current user
router.get('/me', authMiddleware, async (ctx) => {
  try {
    const user = await UserModel.findById(${userAccess}.id);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: 'User not found' };
      return;
    }
    ctx.body = { user: { id: user.id, email: user.email, name: user.name } };
  } catch (error) {
    console.error('Get user error:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to get user' };
  }
});

export default function registerAuthRoutes(router) {
  router.post('/auth/register', registerHandler);
  router.post('/auth/login', loginHandler);
  router.get('/auth/me', authMiddleware, meHandler);
}
`
  };

  const sessionRoutes = {
    express: `
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await UserModel.create({ email, name });

    ${sessionUser} = { id: user.id, email: user.email };

    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    ${sessionUser} = { id: user.id, email: user.email };

    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(${sessionUser}.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
`
  };

  if (authType === 'jwt') {
    return jwtRoutes[runtime] || jwtRoutes.express;
  } else {
    return sessionRoutes[runtime] || '';
  }
}

/**
 * Get auth-specific dependencies
 */
export function getAuthDependencies(authType, runtime) {
  if (authType === 'jwt') {
    return {
      jsonwebtoken: '^9.0.2'
    };
  } else if (authType === 'session') {
    const deps = {
      express: {
        'express-session': '^1.18.0'
      },
      fastify: {
        '@fastify/session': '^10.9.0',
        '@fastify/cookie': '^10.0.1'
      },
      koa: {
        'koa-session': '^6.4.0'
      }
    };
    return deps[runtime] || {};
  }
  return {};
}

/**
 * Generate auth environment variables
 */
export function generateAuthEnv(authType) {
  if (authType === 'jwt') {
    return `
# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
`;
  } else if (authType === 'session') {
    return `
# Session Configuration
SESSION_SECRET=your-session-secret-change-this-in-production
`;
  }
  return '';
}

/**
 * Generate complete auth scaffolding
 */
export function generateAuthScaffolding(authType, runtime) {
  const isJWT = authType === 'jwt';

  return {
    middleware: isJWT ? generateJWTAuth(runtime) : generateSessionAuth(runtime),
    routes: generateAuthRoutes(runtime, authType),
    dependencies: getAuthDependencies(authType, runtime),
    env: generateAuthEnv(authType)
  };
}
