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

const PORT = process.env.PORT || ${port};

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}${hasApi ? `// Setup API routes
const apiRoutes = setupRoutes();
` : ''}${hasAuth ? `// Setup auth routes
const authRoutes = setupAuthRoutes();
` : ''}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, \`http://\${req.headers.host}\`);

${hasApi || hasAuth ? `  // Handle API routes
  if (url.pathname.startsWith('/api')) {
    const allRoutes = [...${hasApi ? 'apiRoutes' : '[]'}, ...${hasAuth ? 'authRoutes' : '[]'}];
    for (const route of allRoutes) {
      const match = matchRoute(route.path, url.pathname, req.method, route.method);
      if (match) {
        req.params = match.params;
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
    } catch (err) {
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
    } catch (err) {
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

// Route matching helper
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

server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}\`);
});
`;

  return server;
}

/**
 * Generate Express server setup
 */
export function generateExpressServer(options = {}) {
  const { port = 3000, hasApi = false, hasDatabase = false, hasAuth = false } = options;

  const imports = [
    `import express from 'express';`,
    `import { setupCoherent } from '@coherent.js/express';`
  ];

  if (hasApi) imports.push(`import apiRoutes from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) imports.push(`import { authMiddleware } from './middleware/auth.js';`);

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const app = express();
const PORT = process.env.PORT || ${port};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}${hasAuth ? `// Setup authentication
app.use(authMiddleware);
` : ''}// Setup Coherent.js
setupCoherent(app);

${hasApi ? `// API routes
app.use('/api', apiRoutes);
` : ''}
// Main route
app.get('/', (req, res) => {
  res.render(HomePage({}));
});

// Error handling
app.use((err, req, res, next) => {
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
    `import { setupCoherent } from '@coherent.js/fastify';`
  ];

  if (hasApi) imports.push(`import apiRoutes from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) imports.push(`import { authPlugin } from './plugins/auth.js';`);

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const fastify = Fastify({
  logger: true
});

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}${hasAuth ? `// Register auth plugin
await fastify.register(authPlugin);
` : ''}
// Setup Coherent.js
await fastify.register(setupCoherent);

// Serve static files
await fastify.register(import('@fastify/static'), {
  root: new URL('./public', import.meta.url).pathname,
  prefix: '/public/'
});

${hasApi ? `// API routes
await fastify.register(apiRoutes, { prefix: '/api' });
` : ''}
// Main route
fastify.get('/', async (request, reply) => {
  return reply.render(HomePage({}));
});

// Start server
try {
  await fastify.listen({ port: process.env.PORT || ${port} });
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
    `import { setupCoherent } from '@coherent.js/koa';`
  ];

  if (hasApi) imports.push(`import apiRoutes from './api/routes.js';`);
  if (hasDatabase) imports.push(`import { initDatabase } from './db/index.js';`);
  if (hasAuth) imports.push(`import { authMiddleware } from './middleware/auth.js';`);

  const server = `
${imports.join('\n')}
import { HomePage } from './components/HomePage.js';

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || ${port};

${hasDatabase ? `// Initialize database
await initDatabase();
` : ''}
// Middleware
app.use(koaBody());
app.use(serve('./public'));
${hasAuth ? `app.use(authMiddleware);
` : ''}
// Setup Coherent.js
setupCoherent(app);

${hasApi ? `// API routes
apiRoutes(router);
` : ''}
// Main route
router.get('/', async (ctx) => {
  ctx.render(HomePage({}));
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
      express: '^4.19.2',
      '@coherent.js/express': `^${cliVersion}`
    },
    fastify: {
      fastify: '^4.28.1',
      '@fastify/static': '^7.0.4',
      '@coherent.js/fastify': `^${cliVersion}`
    },
    koa: {
      koa: '^2.15.3',
      '@koa/router': '^13.0.1',
      'koa-body': '^6.0.1',
      'koa-static': '^5.0.0',
      '@coherent.js/koa': `^${cliVersion}`
    }
  };

  return deps[runtime] || {};
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
