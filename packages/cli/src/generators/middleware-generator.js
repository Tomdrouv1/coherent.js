/**
 * Middleware generator
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Generate a new middleware module
 */
export async function generateMiddleware(name, options = {}) {
  const {
    path = 'src/middleware',
    template = 'basic',
    skipTest = false
  } = options;

  const middlewareName = `${toPascalCase(name).replace(/Middleware$/u, '')}Middleware`;
  const functionName = `${toCamelCase(name).replace(/Middleware$/u, '')}Middleware`;
  const fileName = `${toKebabCase(name).replace(/-middleware$/u, '')}-middleware`;

  const outputDir = join(process.cwd(), path);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files = [];
  const nextSteps = [];

  const middlewarePath = join(outputDir, `${fileName}.js`);
  const middlewareContent = generateMiddlewareContent({ middlewareName, functionName, template });
  writeFileSync(middlewarePath, middlewareContent);
  files.push(middlewarePath);

  if (!skipTest) {
    const testPath = join(outputDir, `${fileName}.test.js`);
    const testContent = generateMiddlewareTestContent({ middlewareName, functionName, template, fileName });
    writeFileSync(testPath, testContent);
    files.push(testPath);
  }

  nextSteps.push(`Register the middleware in your server: import { ${middlewareName} } from '${path}/${fileName}.js'`);
  nextSteps.push(`Use it with your framework (Express/Fastify/Koa) depending on the template`);

  if (!skipTest) {
    nextSteps.push('Run tests: npm test');
  }

  return { files, nextSteps };
}

function generateMiddlewareContent({ middlewareName, functionName, template }) {
  switch (template) {
    case 'fastify':
      return generateFastifyMiddleware({ middlewareName });
    case 'auth':
      return generateAuthMiddleware({ middlewareName, functionName });
    case 'logging':
      return generateLoggingMiddleware({ middlewareName, functionName });
    case 'koa':
      return generateKoaMiddleware({ middlewareName, functionName });
    default:
      return generateExpressMiddleware({ middlewareName, functionName });
  }
}

function generateExpressMiddleware({ middlewareName, functionName }) {
  return `/**
 * ${middlewareName} - Express style middleware
 */
export function ${functionName}(req, res, next) {
  // Add middleware logic here
  // Example: attach request context
  req.context = req.context || {};
  req.context.startedAt = Date.now();

  next();
}

export default ${functionName};
`;
}

function generateFastifyMiddleware({ middlewareName }) {
  return `/**
 * ${middlewareName} - Fastify plugin
 */
export async function ${middlewareName}(fastify, options) {
  fastify.addHook('onRequest', async (request, reply) => {
    request.context = request.context || {};
    request.context.startedAt = Date.now();
  });

  fastify.decorateRequest('getContext', function getContext() {
    return this.context || {};
  });
}

export default ${middlewareName};
`;
}

function generateAuthMiddleware({ middlewareName, functionName }) {
  return `/**
 * ${middlewareName} - Authentication middleware
 */
export function ${functionName}(options = {}) {
  const {
    header = 'authorization',
    tokenPrefix = 'Bearer '
  } = options;

  return (req, res, next) => {
    const token = req.headers?.[header]?.toString();
    if (!token || !token.startsWith(tokenPrefix)) {
      res.statusCode = 401;
      res.end(JSON.stringify({ _error: 'Unauthorized' }));
      return;
    }

    req.user = {
      token: token.slice(tokenPrefix.length),
      scopes: ['read']
    };

    next();
  };
}

export default ${functionName};
`;
}

function generateLoggingMiddleware({ middlewareName, functionName }) {
  return `/**
 * ${middlewareName} - Request logging middleware
 */
export function ${functionName}(logger = console) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
      logger.info?.(
        '[Request]',
        req.method,
        req.url,
        res.statusCode,
        { duration: duration.toFixed(2) + 'ms' }
      );
    });

    next();
  };
}

export default ${functionName};
`;
}

function generateKoaMiddleware({ middlewareName, functionName }) {
  return `/**
 * ${middlewareName} - Koa compatible middleware
 */
export async function ${functionName}(ctx, next) {
  ctx.state = ctx.state || {};
  ctx.state.requestId = ctx.state.requestId || crypto.randomUUID?.() || Date.now().toString();

  await next();
}

export default ${functionName};
`;
}

function generateMiddlewareTestContent({ middlewareName, functionName, template, fileName }) {
  if (template === 'fastify') {
    return `import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import ${middlewareName} from './${fileName}.js';

test('${middlewareName} registers fastify hook', async () => {
  const fastify = Fastify();
  await fastify.register(${middlewareName});

  assert.ok(fastify.hasDecorator('getContext'));
});
`;
  }

  return `import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import ${functionName} from './${fileName}.js';

test('${middlewareName} executes without errors', (t, done) => {
  const middleware = typeof ${functionName} === 'function' ? ${functionName}() : ${functionName};

  const req = new http.IncomingMessage();
  const res = new http.ServerResponse(req);
  req.headers = {};

  middleware(req, res, () => {
    assert.ok(true);
    done();
  });
});
`;
}

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}
