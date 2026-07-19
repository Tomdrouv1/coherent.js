/**
 * Runtime Scaffolding Generator
 * Generates server setup code for different runtime environments
 */

import { getCLIVersion } from '../utils/version.js';

// Get current CLI version automatically
const cliVersion = getCLIVersion();

/**
 * Generate built-in HTTP server setup
 */
export function generateBuiltInServer(options = {}) {
  const { port = 3000, hasApi = false, hasDatabase = false, hasAuth = false } = options;

  const imports = [
    `import http from 'node:http';`,
    `import fs from 'node:fs';`,
    `import path from 'node:path';`,
    `import { render } from '@coherent.js/core';`
  ];

  if (hasApi) imports.push(`import { setupRoutes } from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) imports.push(`import { setupAuthRoutes } from './api/auth.js';`);

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const PORT = Number(process.env.PORT) || ${port};

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}${hasApi ? `// Setup API routes
const apiRoutes = setupRoutes();
` : ''}${hasAuth ? `// Setup auth routes
const authRoutes = setupAuthRoutes();
` : ''}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', \`http://\${req.headers.host}\`);

${hasApi || hasAuth ? `  // Handle API routes
  if (url.pathname.startsWith('/api')) {
    const allRoutes = [...${hasApi ? 'apiRoutes' : '[]'}, ...${hasAuth ? 'authRoutes' : '[]'}];
    for (const route of allRoutes) {
      const match = matchRoute(route.path, url.pathname, req.method, route.method);
      if (match) {
        Object.assign(req, { params: match.params });
        return route.handler(req, res);
      }
    }
  }

` : ''}  // Serve components for hydration
  if (url.pathname.startsWith('/components/')) {
    const filePath = path.join(process.cwd(), 'src', url.pathname);
    try {
      const content = await fs.promises.readFile(filePath);
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      return res.end(content);
    } catch {
      res.writeHead(404);
      return res.end('Not Found');
    }
  }

  // Serve static files
  if (url.pathname.startsWith('/public')) {
    const filePath = path.join(process.cwd(), url.pathname);
    try {
      const content = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      return res.end(content);
    } catch {
      res.writeHead(404);
      return res.end('Not Found');
    }
  }

  // Render page
  try {
    const html = render(HomePage({}));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coherent.js App</title>
</head>
<body>
  \${html}
</body>
</html>\`);
  } catch (error) {
    console.error('Render error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

${hasApi || hasAuth ? `// Route matching helper
function matchRoute(routePattern, urlPath, requestMethod, routeMethod) {
  // Check HTTP method
  if (requestMethod !== routeMethod) {
    return null;
  }

  // Split paths into segments
  const routeSegments = routePattern.split('/').filter(Boolean);
  const urlSegments = urlPath.split('/').filter(Boolean);

  // Check if lengths match
  if (routeSegments.length !== urlSegments.length) {
    return null;
  }

  const params = {};

  // Match each segment
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i];
    const urlSegment = urlSegments[i];

    // Check for parameter (e.g., :id)
    if (routeSegment.startsWith(':')) {
      const paramName = routeSegment.substring(1);
      params[paramName] = urlSegment;
    } else if (routeSegment !== urlSegment) {
      // Literal segment doesn't match
      return null;
    }
  }

  return { params };
}

` : ''}server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
`;

  return server;
}

/**
 * Generate Express server setup
 */
export function generateExpressServer(options = {}) {
  const { port = 3000, hasApi = false, hasDatabase = false, hasAuth = false, isTypeScript = false } = options;

  const imports = [
    `import express from 'express';`,
    `import { render } from '@coherent.js/core';`
  ];

  if (hasApi) imports.push(`import apiRoutes from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) {
    imports.push(`import authRoutes from './api/auth.js';`);
    imports.push(`import { authMiddleware } from './middleware/auth.js';`);
  }

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const app = express();
const PORT = Number(process.env.PORT) || ${port};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}${hasAuth ? `// Public auth routes (register/login; /me protects itself with authMiddleware)
app.use('/api/auth', authRoutes);
// Protect anything under /api/protected/* with the JWT middleware.
// Add new protected routes here, not as a top-level app.use().
app.use('/api/protected', authMiddleware);
` : ''}
${hasApi ? `// API routes - convert Coherent.js router to Express middleware
app.use('/api', apiRoutes.toExpressRouter(express));
` : ''}
// Main route - render Coherent.js component to HTML
app.get('/', (_req, res) => {
  const content = render(HomePage({}));
  const html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coherent.js App</title>
</head>
<body>
  \${content}
</body>
</html>\`;
  res.type('html').send(html);
});

// Error handling (Express identifies error middleware by its 4-parameter signature)
app.use((${isTypeScript
    ? 'err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction'
    : 'err, _req, res, _next'}) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
`;

  return server;
}

/**
 * Generate Fastify server setup
 */
export function generateFastifyServer(options = {}) {
  const { port = 3000, hasApi = false, hasDatabase = false, hasAuth = false } = options;

  const imports = [
    `import Fastify from 'fastify';`,
    `import { setupCoherent } from '@coherent.js/integrations/fastify';`
  ];

  if (hasApi) imports.push(`import apiRoutes from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) {
    imports.push(`import { authPlugin } from './plugins/auth.js';`);
    imports.push(`import authRoutes from './api/auth.js';`);
  }

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const fastify = Fastify({
  logger: true
});

// Default HTML shell wrapping rendered components. Override per-route by
// passing a custom \`template\` to setupCoherent or by responding with a
// pre-rendered string.
const APP_HTML_TEMPLATE = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coherent.js App</title>
</head>
<body>
{{content}}
</body>
</html>\`;

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}${hasAuth ? `// Register auth plugin
await fastify.register(authPlugin);
` : ''}
// Setup Coherent.js (registers as a plugin; setupCoherent forwards avvio's done callback)
await fastify.register(setupCoherent, { template: APP_HTML_TEMPLATE });

// Serve static files (resolve against project root, not src/index.js's directory)
await fastify.register(import('@fastify/static'), {
  root: new URL('../public', import.meta.url).pathname,
  prefix: '/public/'
});

${hasAuth ? `// Auth routes (prefix /api/auth → /register, /login, /me)
await fastify.register(authRoutes, { prefix: '/api/auth' });
` : ''}${hasApi ? `// API routes — delegate /api/* to the Coherent.js object router.
// The passthrough content parser leaves the request stream intact so the
// router can parse the body itself; hijack() hands the response over too.
await fastify.register(async (scope) => {
  scope.removeAllContentTypeParsers();
  scope.addContentTypeParser('*', (_request, payload, done) => done(null, payload));
  scope.all('/*', (request, reply) => {
    reply.hijack();
    request.raw.url = (request.raw.url || '').replace(/^\\/api/, '') || '/';
    return apiRoutes.handle(request.raw, reply.raw);
  });
}, { prefix: '/api' });
` : ''}
// Main route - return Coherent.js component (auto-rendered by plugin)
fastify.get('/', async () => {
  return HomePage({});
});

// Start server
try {
  await fastify.listen({ port: Number(process.env.PORT) || ${port} });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
`;

  return server;
}

/**
 * Generate Koa server setup
 */
export function generateKoaServer(options = {}) {
  const { port = 3000, hasApi = false, hasDatabase = false, hasAuth = false } = options;

  const imports = [
    `import Koa from 'koa';`,
    `import Router from '@koa/router';`,
    `import { koaBody } from 'koa-body';`,
    `import serve from 'koa-static';`,
    `import { setupCoherent } from '@coherent.js/integrations/koa';`
  ];

  if (hasApi) imports.push(`import apiRoutes from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) {
    imports.push(`import authRouter from './api/auth.js';`);
    imports.push(`import { authMiddleware } from './middleware/auth.js';`);
  }

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const app = new Koa();
const router = new Router();

const PORT = Number(process.env.PORT) || ${port};

// Default HTML shell wrapping rendered components. Override per-route by
// passing a custom \`template\` to setupCoherent or by setting ctx.body to a
// pre-rendered string.
const APP_HTML_TEMPLATE = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coherent.js App</title>
</head>
<body>
{{content}}
</body>
</html>\`;

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}
${hasApi ? `// API routes — delegate /api/* to the Coherent.js object router.
// Mounted before koaBody() so the router can parse the request body itself;
// ctx.respond = false hands the raw response over to the router.
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api')) {
    ctx.respond = false;
    ctx.req.url = (ctx.req.url || '').replace(/^\\/api/, '') || '/';
    await apiRoutes.handle(ctx.req, ctx.res);
    return;
  }
  await next();
});

` : ''}// Middleware
app.use(koaBody());
app.use(serve('./public'));

// Setup Coherent.js (wraps rendered components in APP_HTML_TEMPLATE)
setupCoherent(app, { template: APP_HTML_TEMPLATE });

${hasAuth ? `// Auth routes (public). Mount before the protected scope.
router.use('/api/auth', authRouter.routes(), authRouter.allowedMethods());
// Protected routes — anything declared under /api/protected/* requires a valid token.
// Add new protected routes here, not as a top-level app.use().
router.use('/api/protected', authMiddleware);
` : ''}
// Main route - set body to Coherent.js component (auto-rendered by middleware)
router.get('/', async (ctx) => {
  ctx.body = HomePage({});
});

app.use(router.routes());
app.use(router.allowedMethods());

// Error handling
app.on('error', (err, ctx) => {
  console.error('Server error:', err, ctx);
});

app.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
`;

  return server;
}

/**
 * Get runtime-specific dependencies
 */
export function getRuntimeDependencies(runtime) {
  const deps = {
    'built-in': {},
    express: {
      express: '^5.0.0',
      '@coherent.js/integrations': `^${cliVersion}`
    },
    fastify: {
      fastify: '^5.0.0',
      '@fastify/static': '^8.0.0',
      '@coherent.js/integrations': `^${cliVersion}`
    },
    koa: {
      koa: '^2.15.3',
      '@koa/router': '^13.0.1',
      'koa-body': '^6.0.1',
      'koa-static': '^5.0.0',
      '@coherent.js/integrations': `^${cliVersion}`
    }
  };

  return deps[runtime] || {};
}

/**
 * Get runtime-specific @types dev-dependencies for TypeScript projects.
 * Fastify and the built-in server ship (or get via @types/node) their own types.
 */
export function getRuntimeTypeDependencies(runtime) {
  const typeDeps = {
    'built-in': {},
    express: {
      '@types/express': '^5.0.0'
    },
    fastify: {},
    koa: {
      '@types/koa': '^2.15.0',
      '@types/koa-static': '^4.0.4',
      '@types/koa__router': '^12.0.4'
    }
  };

  return typeDeps[runtime] || {};
}

/**
 * Generate server file based on runtime
 */
export function generateServerFile(runtime, options = {}) {
  switch (runtime) {
    case 'built-in':
      return generateBuiltInServer(options);
    case 'express':
      return generateExpressServer(options);
    case 'fastify':
      return generateFastifyServer(options);
    case 'koa':
      return generateKoaServer(options);
    default:
      throw new Error(`Unknown runtime: ${runtime}`);
  }
}
