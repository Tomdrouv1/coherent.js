/**
 * Authentication Scaffolding Generator
 * Generates JWT and session-based authentication setup
 */

/**
 * Password-hashing helpers emitted into every auth middleware/plugin file.
 * scrypt is Node's built-in KDF, so generated projects get real hashing
 * with zero extra dependencies. Stored format: "scrypt:<salt>:<hash>" (hex).
 */
function passwordHelpers(ts) {
  return `
const scryptAsync = promisify(scrypt)${ts ? ' as (password: string, salt: string, keylen: number) => Promise<Buffer>' : ''};

export async function hashPassword(password${ts ? ': string' : ''})${ts ? ': Promise<string>' : ''} {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return \`scrypt:\${salt}:\${derived.toString('hex')}\`;
}

export async function verifyPassword(password${ts ? ': string' : ''}, storedHash${ts ? ': unknown' : ''})${ts ? ': Promise<boolean>' : ''} {
  const [scheme, salt, hash] = String(storedHash ?? '').split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  // timingSafeEqual, so the comparison doesn't leak how much of the hash matched
  return expected.length === derived.length && timingSafeEqual(derived, expected);
}
`;
}

const CRYPTO_IMPORTS = `import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';`;

/**
 * Generate JWT authentication middleware
 */
export function generateJWTAuth(runtime, language = 'javascript') {
  const ts = language === 'typescript';
  const helpers = passwordHelpers(ts);
  const jwtConstants = `const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d')${ts ? " as jwt.SignOptions['expiresIn']" : ''};`;
  const tokenPayload = ts
    ? `
export interface TokenPayload {
  id: number;
  email: string;
}
`
    : '';
  const tokenFns = `
export function generateToken(payload${ts ? ': TokenPayload' : ''})${ts ? ': string' : ''} {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token${ts ? ': string' : ''})${ts ? ': TokenPayload | null' : ''} {
  try {
    return jwt.verify(token, JWT_SECRET)${ts ? ' as TokenPayload' : ''};
  } catch (error) {
    return null;
  }
}
`;

  const middlewares = {
    express: `
import jwt from 'jsonwebtoken';
${CRYPTO_IMPORTS}
${ts ? "import type { Request, Response, NextFunction } from 'express';\n" : ''}
${jwtConstants}
${tokenPayload}${ts ? `
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}
` : ''}${helpers}${tokenFns}
export function authMiddleware(req${ts ? ': AuthenticatedRequest' : ''}, res${ts ? ': Response' : ''}, next${ts ? ': NextFunction' : ''})${ts ? ': void' : ''} {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = decoded;
  next();
}

export function optionalAuth(req${ts ? ': AuthenticatedRequest' : ''}, _res${ts ? ': Response' : ''}, next${ts ? ': NextFunction' : ''})${ts ? ': void' : ''} {
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
${CRYPTO_IMPORTS}
${ts ? "import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';\n" : ''}
${jwtConstants}
${tokenPayload}${ts ? `
declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
` : ''}${helpers}${tokenFns}
export async function authPlugin(fastify${ts ? ': FastifyInstance' : ''}, _options${ts ? ': unknown' : ''})${ts ? ': Promise<void>' : ''} {
  fastify.decorate('authenticate', async function(request${ts ? ': FastifyRequest' : ''}, reply${ts ? ': FastifyReply' : ''}) {
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

  fastify.decorate('optionalAuth', async function(request${ts ? ': FastifyRequest' : ''}, _reply${ts ? ': FastifyReply' : ''}) {
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
${CRYPTO_IMPORTS}
${ts ? "import type { Context, Next } from 'koa';\n" : ''}
${jwtConstants}
${tokenPayload}${helpers}${tokenFns}
export async function authMiddleware(ctx${ts ? ': Context' : ''}, next${ts ? ': Next' : ''})${ts ? ': Promise<void>' : ''} {
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

export async function optionalAuth(ctx${ts ? ': Context' : ''}, next${ts ? ': Next' : ''})${ts ? ': Promise<void>' : ''} {
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
${CRYPTO_IMPORTS}
${ts ? "import type { IncomingMessage } from 'node:http';\n" : ''}
${jwtConstants}
${tokenPayload}${helpers}${tokenFns}
export function authenticateRequest(req${ts ? ': IncomingMessage' : ''})${ts ? ': TokenPayload | null' : ''} {
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
export function generateSessionAuth(runtime, language = 'javascript') {
  const ts = language === 'typescript';
  const helpers = passwordHelpers(ts);

  const middlewares = {
    express: `
import session from 'express-session';
${CRYPTO_IMPORTS}
${ts ? "import type { Express, Request, Response, NextFunction } from 'express';\n" : ''}${ts ? `
declare module 'express-session' {
  interface SessionData {
    user?: { id: number; email: string };
  }
}
` : ''}
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
${helpers}
export function setupSession(app${ts ? ': Express' : ''})${ts ? ': void' : ''} {
  app.use(session(sessionConfig));
}

export function authMiddleware(req${ts ? ': Request' : ''}, res${ts ? ': Response' : ''}, next${ts ? ': NextFunction' : ''})${ts ? ': void' : ''} {
  if (!req.session.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

export function optionalAuth(_req${ts ? ': Request' : ''}, _res${ts ? ': Response' : ''}, next${ts ? ': NextFunction' : ''})${ts ? ': void' : ''} {
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
export function generateAuthRoutes(runtime, authType, language = 'javascript') {
  const ts = language === 'typescript';
  const credentialsCast = ts ? ' as { email?: string; name?: string; password?: string }' : '';
  const loginCast = ts ? ' as { email?: string; password?: string }' : '';
  // SQL models return snake_case rows; the Mongo model returns the document as-is.
  const storedHash = 'user.password_hash ?? user.passwordHash';

  const jwtRoutes = {
    express: `
import express from 'express';
${ts ? "import type { Response, Router } from 'express';\n" : ''}import { generateToken, hashPassword, verifyPassword, authMiddleware${ts ? ', type AuthenticatedRequest' : ''} } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

const router${ts ? ': Router' : ''} = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body${credentialsCast};

    // Validate input
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user with a hashed password — never store the plain text
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({ email, name, passwordHash });

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body${loginCast};

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find user and verify password (single 401 either way, so responses
    // don't reveal which of the two failed)
    const user = await UserModel.findByEmail(email);
    const passwordOk = user && await verifyPassword(password, ${storedHash});
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ id: user.id, email: user.email });

    return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req${ts ? ': AuthenticatedRequest' : ''}, res${ts ? ': Response' : ''}) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
`,
    'built-in': `
// Auth routes for built-in HTTP server
${ts ? "import type { IncomingMessage, ServerResponse } from 'node:http';\n" : ''}import { generateToken, verifyToken, hashPassword, verifyPassword } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

// Register handler
export async function registerHandler(req${ts ? ': IncomingMessage' : ''}, res${ts ? ': ServerResponse' : ''}) {
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

      // Create user with a hashed password — never store the plain text
      const passwordHash = await hashPassword(password);
      const user = await UserModel.create({ email, name, passwordHash });

      // Generate token
      const token = generateToken({ id: user.id, email: user.email });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: { id: user.id, email: user.email, name: user.name }, token }));
    } catch (error) {
      console.error('Register error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Registration failed' }));
    }
  });
}

// Login handler
export async function loginHandler(req${ts ? ': IncomingMessage' : ''}, res${ts ? ': ServerResponse' : ''}) {
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

      // Find user and verify password (single 401 either way, so responses
      // don't reveal which of the two failed)
      const user = await UserModel.findByEmail(email);
      const passwordOk = user && await verifyPassword(password, ${storedHash});
      if (!passwordOk) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }

      // Generate token
      const token = generateToken({ id: user.id, email: user.email });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ user: { id: user.id, email: user.email, name: user.name }, token }));
    } catch (error) {
      console.error('Login error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Login failed' }));
    }
  });
}

// Get current user handler
export async function meHandler(req${ts ? ': IncomingMessage' : ''}, res${ts ? ': ServerResponse' : ''}) {
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
    return res.end(JSON.stringify({ user: { id: user.id, email: user.email, name: user.name } }));
  } catch (error) {
    console.error('Get user error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to get user' }));
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
${ts ? "import type { FastifyInstance } from 'fastify';\n" : ''}import { generateToken, hashPassword, verifyPassword } from '../plugins/auth.js';
import { UserModel } from '../db/models/User.js';

export default async function authRoutes(fastify${ts ? ': FastifyInstance' : ''})${ts ? ': Promise<void>' : ''} {
  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, name, password } = request.body${credentialsCast};

      // Validate input
      if (!email || !name || !password) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return reply.code(400).send({ error: 'User already exists' });
      }

      // Create user with a hashed password — never store the plain text
      const passwordHash = await hashPassword(password);
      const user = await UserModel.create({ email, name, passwordHash });

      // Generate token
      const token = generateToken({ id: user.id, email: user.email });

      return { user: { id: user.id, email: user.email, name: user.name }, token };
    } catch (error) {
      fastify.log.error({ err: error }, 'Register error');
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body${loginCast};

      // Validate input
      if (!email || !password) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Find user and verify password (single 401 either way, so responses
      // don't reveal which of the two failed)
      const user = await UserModel.findByEmail(email);
      const passwordOk = user && await verifyPassword(password, ${storedHash});
      if (!passwordOk) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken({ id: user.id, email: user.email });

      return { user: { id: user.id, email: user.email, name: user.name }, token };
    } catch (error) {
      fastify.log.error({ err: error }, 'Login error');
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const authUser = request.user;
      if (!authUser) {
        return reply.code(401).send({ error: 'Not authenticated' });
      }
      const user = await UserModel.findById(authUser.id);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      return { user: { id: user.id, email: user.email, name: user.name } };
    } catch (error) {
      fastify.log.error({ err: error }, 'Get user error');
      return reply.code(500).send({ error: 'Failed to get user' });
    }
  });
}
`,
    koa: `
import Router from '@koa/router';
import { generateToken, hashPassword, verifyPassword, authMiddleware } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

const router = new Router();

// Register
router.post('/register', async (ctx) => {
  try {
    const { email, name, password } = ctx.request.body${credentialsCast};

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

    // Create user with a hashed password — never store the plain text
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({ email, name, passwordHash });

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
    const { email, password } = ctx.request.body${loginCast};

    // Validate input
    if (!email || !password) {
      ctx.status = 400;
      ctx.body = { error: 'Missing required fields' };
      return;
    }

    // Find user and verify password (single 401 either way, so responses
    // don't reveal which of the two failed)
    const user = await UserModel.findByEmail(email);
    const passwordOk = user && await verifyPassword(password, ${storedHash});
    if (!passwordOk) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid credentials' };
      return;
    }

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
    const authUser = ctx.state.user;
    if (!authUser) {
      ctx.status = 401;
      ctx.body = { error: 'Not authenticated' };
      return;
    }
    const user = await UserModel.findById(authUser.id);
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

export default router;
`
  };

  const sessionRoutes = {
    express: `
import express from 'express';
${ts ? "import type { Request, Response, Router } from 'express';\n" : ''}import { authMiddleware, hashPassword, verifyPassword } from '../middleware/auth.js';
import { UserModel } from '../db/models/User.js';

const router${ts ? ': Router' : ''} = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body${credentialsCast};

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user with a hashed password — never store the plain text
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({ email, name, passwordHash });

    req.session.user = { id: user.id, email: user.email };

    return res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body${loginCast};

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find user and verify password (single 401 either way, so responses
    // don't reveal which of the two failed)
    const user = await UserModel.findByEmail(email);
    const passwordOk = user && await verifyPassword(password, ${storedHash});
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = { id: user.id, email: user.email };

    return res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req${ts ? ': Request' : ''}, res${ts ? ': Response' : ''}) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', authMiddleware, async (req${ts ? ': Request' : ''}, res${ts ? ': Response' : ''}) => {
  try {
    const sessionUser = req.session.user;
    if (!sessionUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await UserModel.findById(sessionUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
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
export function generateAuthScaffolding(authType, runtime, language = 'javascript') {
  const isJWT = authType === 'jwt';

  return {
    middleware: isJWT ? generateJWTAuth(runtime, language) : generateSessionAuth(runtime, language),
    routes: generateAuthRoutes(runtime, authType, language),
    dependencies: getAuthDependencies(authType, runtime),
    env: generateAuthEnv(authType)
  };
}
