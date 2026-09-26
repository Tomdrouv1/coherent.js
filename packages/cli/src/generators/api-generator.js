/**
 * API generator
 *
 * Emits modules built on `@coherent.js/api`'s object router
 * (`createRouter(routeConfig, options)`): handlers return data that the router
 * sends as JSON, write non-200 answers with `res.writeHead()`/`res.end()` (the
 * router passes a plain node:http response), and report errors by throwing
 * the package's `ApiError` classes.
 */

import { join } from 'path';
import { writeGeneratedFiles } from '../utils/files.js';

/**
 * Generate a new API route
 */
export async function generateAPI(name, options = {}) {
  const { path = 'src/api', template = 'rest', skipTest = false, force = false } = options;

  // Ensure API name is in lowercase with hyphens
  const apiName = toKebabCase(name);
  const fileName = apiName;
  const names = {
    apiName,
    className: toPascalCase(name),
    camelName: toCamelCase(apiName)
  };
  const isRpc = template === 'rpc';
  const routerName = `${names.camelName}${isRpc ? 'RPC' : 'API'}`;

  const outputDir = join(process.cwd(), path);
  const nextSteps = [];

  // API and test files
  const toWrite = [{ path: join(outputDir, `${fileName}.js`), content: generateAPIContent(names, template) }];
  if (!skipTest) {
    toWrite.push({
      path: join(outputDir, `${fileName}.test.js`),
      content: isRpc ? generateRPCTestContent(names) : generateRESTTestContent(names)
    });
  }
  const files = writeGeneratedFiles(toWrite, { force });

  // Add next steps
  const endpoint = isRpc ? `/rpc/${apiName}` : `/${apiName}`;
  nextSteps.push(`Import the API: import ${routerName}, { ${names.camelName}Routes } from './${path}/${fileName}.js'`);
  nextSteps.push(`Serve it on its own: ${routerName}.createServer().listen(3000)`);
  nextSteps.push(`Or add its routes to your app's API router: router.addRoutes(${names.camelName}Routes)`);
  nextSteps.push(
    isRpc
      ? `Test the API: curl -X POST http://localhost:3000${endpoint} -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"${apiName}.list","id":1}'`
      : `Test the API: curl http://localhost:3000${endpoint}`
  );

  if (!skipTest) {
    nextSteps.push('Run tests: npm test');
  }

  return { files, nextSteps };
}

/**
 * Generate API content based on template
 */
function generateAPIContent(names, template) {
  switch (template) {
    case 'graphql':
      // GraphQL template uses REST as foundation
      return generateRESTAPI(names);
    case 'rpc':
      return generateRPCAPI(names);
    case 'crud':
      return generateCRUDAPI(names);
    default:
      return generateRESTAPI(names);
  }
}

/**
 * Generate REST API
 */
function generateRESTAPI({ apiName, className, camelName }) {
  return `import { randomUUID } from 'node:crypto';
import {
  createRouter,
  validateAgainstSchema,
  NotFoundError,
  ValidationError
} from '@coherent.js/api';

/**
 * ${className} API Routes
 * REST API for ${apiName} resources, built on the @coherent.js/api router.
 *
 * Routes (relative to where the router is served):
 *   GET    /${apiName}          List items (?page=1&limit=10&search=text)
 *   GET    /${apiName}/health   Health check
 *   GET    /${apiName}/:id      Get one item
 *   POST   /${apiName}          Create an item (201)
 *   PUT    /${apiName}/:id      Update an item
 *   DELETE /${apiName}/:id      Delete an item
 *
 * Handlers return plain data, which the router sends as JSON. A thrown
 * ApiError (NotFoundError, ValidationError...) is answered with its status,
 * and a body that fails a route's \`validation\` schema gets a 400 listing
 * the invalid fields.
 */

// Sample data (replace with a database)
const items = [
  { id: '1', name: 'Sample ${className} 1', createdAt: new Date().toISOString() },
  { id: '2', name: 'Sample ${className} 2', createdAt: new Date().toISOString() }
];

// Validation schemas
export const ${camelName}Schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    description: {
      type: 'string',
      maxLength: 500
    }
  },
  required: ['name'],
  additionalProperties: false
};

export const ${camelName}UpdateSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    description: {
      type: 'string',
      maxLength: 500
    }
  },
  additionalProperties: false,
  minProperties: 1
};

// Query string of the list route (query values arrive as text and are coerced)
export const ${camelName}QuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    search: { type: 'string', maxLength: 100 }
  }
};

/**
 * Index of the item with this id; throws a 404 when there is none
 */
function findIndex(id) {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new NotFoundError(\`${className} \${id} not found\`);
  }
  return index;
}

/**
 * Send a JSON response with a status other than 200
 */
function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Route definitions: path segments, then one entry per HTTP method.
 * Merge them into another router with router.addRoutes(${camelName}Routes).
 */
export const ${camelName}Routes = {
  '${apiName}': {
    // GET /${apiName}
    GET: (req) => {
      const query = validateAgainstSchema(${camelName}QuerySchema, req.query || {}, { coerceTypes: true });
      if (!query.valid) {
        throw new ValidationError(query.errors, 'Invalid query parameters');
      }
      const { page, limit, search } = query.data;

      let data = [...items];

      // Apply search filter
      if (search) {
        const term = search.toLowerCase();
        data = data.filter((item) => item.name.toLowerCase().includes(term));
      }

      // Apply pagination
      const start = (page - 1) * limit;

      return {
        data: data.slice(start, start + limit),
        pagination: {
          page,
          limit,
          total: data.length,
          totalPages: Math.ceil(data.length / limit)
        }
      };
    },

    // POST /${apiName}
    POST: {
      validation: ${camelName}Schema,
      handler: (req, res) => {
        const now = new Date().toISOString();
        const newItem = {
          id: randomUUID(),
          ...req.body,
          createdAt: now,
          updatedAt: now
        };

        items.push(newItem);

        sendJson(res, 201, {
          data: newItem,
          message: '${className} created successfully'
        });
      }
    },

    // GET /${apiName}/health
    health: {
      GET: () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: '${className} API'
      })
    },

    ':id': {
      // GET /${apiName}/:id
      GET: (req) => ({ data: items[findIndex(req.params.id)] }),

      // PUT /${apiName}/:id
      PUT: {
        validation: ${camelName}UpdateSchema,
        handler: (req) => {
          const index = findIndex(req.params.id);
          const updatedItem = {
            ...items[index],
            ...req.body,
            updatedAt: new Date().toISOString()
          };

          items[index] = updatedItem;

          return {
            data: updatedItem,
            message: '${className} updated successfully'
          };
        }
      },

      // DELETE /${apiName}/:id
      DELETE: (req) => {
        const [deletedItem] = items.splice(findIndex(req.params.id), 1);

        return {
          data: deletedItem,
          message: '${className} deleted successfully'
        };
      }
    }
  }
};

const ${camelName}API = createRouter(${camelName}Routes);

export default ${camelName}API;

// Usage:
//
// Standalone server:
//   ${camelName}API.createServer().listen(3000);
//
// Inside an existing node:http server:
//   http.createServer((req, res) => ${camelName}API.handle(req, res)).listen(3000);
//
// Express (routes are then served under /api/${apiName}):
//   import express from 'express';
//   app.use(express.json());
//   app.use('/api', ${camelName}API.toExpressRouter(express));
`;
}

/**
 * Generate CRUD API
 */
function generateCRUDAPI(names) {
  return generateRESTAPI(names); // Same as REST for now
}

/**
 * Generate RPC API
 */
function generateRPCAPI({ apiName, className, camelName }) {
  return `import { randomUUID } from 'node:crypto';
import { createRouter, validateAgainstSchema } from '@coherent.js/api';

/**
 * ${className} RPC API
 * JSON-RPC 2.0 endpoint for ${apiName}, built on the @coherent.js/api router.
 *
 * Endpoint: POST /rpc/${apiName}
 * Methods:  ${apiName}.list, ${apiName}.get, ${apiName}.create, ${apiName}.update, ${apiName}.delete
 *
 * Request:  { "jsonrpc": "2.0", "method": "${apiName}.get", "params": { "id": "1" }, "id": 1 }
 * Success:  { "jsonrpc": "2.0", "result": { ... }, "id": 1 }
 * Failure:  { "jsonrpc": "2.0", "error": { "code": -32602, "message": "Invalid params" }, "id": 1 }
 *
 * Batches (an array of requests) are supported, and notifications (requests
 * without an id) get no response. A body that is not valid JSON never reaches
 * this handler: the router rejects it with HTTP 400.
 */

/**
 * JSON-RPC 2.0 error codes
 */
export const RPC_ERRORS = {
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Application-defined error (-32000 to -32099 is for implementation errors)
  NOT_FOUND: -32004
};

/**
 * Thrown by a method to answer with a JSON-RPC error
 */
export class RpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

// Sample data (replace with a database)
const items = new Map([
  ['1', { id: '1', name: 'Sample ${className} 1', createdAt: new Date().toISOString() }],
  ['2', { id: '2', name: 'Sample ${className} 2', createdAt: new Date().toISOString() }]
]);

/**
 * Item with this id; throws a NOT_FOUND error when there is none
 */
function findItem(id) {
  const item = items.get(id);
  if (!item) {
    throw new RpcError(RPC_ERRORS.NOT_FOUND, \`${className} \${id} not found\`);
  }
  return item;
}

const idParams = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 }
  },
  required: ['id'],
  additionalProperties: false
};

/**
 * RPC methods: \`params\` is the schema the request's params must match
 * (defaults are applied before the handler runs), \`handler\` returns the result.
 */
export const ${camelName}Methods = {
  '${apiName}.list': {
    params: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        offset: { type: 'integer', minimum: 0, default: 0 }
      },
      additionalProperties: false
    },
    handler: ({ limit, offset }) => ({
      items: Array.from(items.values()).slice(offset, offset + limit),
      total: items.size
    })
  },

  '${apiName}.get': {
    params: idParams,
    handler: ({ id }) => findItem(id)
  },

  '${apiName}.create': {
    params: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 }
      },
      required: ['name'],
      additionalProperties: false
    },
    handler: (params) => {
      const now = new Date().toISOString();
      const newItem = { id: randomUUID(), ...params, createdAt: now, updatedAt: now };
      items.set(newItem.id, newItem);
      return newItem;
    }
  },

  '${apiName}.update': {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 }
      },
      required: ['id'],
      additionalProperties: false,
      minProperties: 2
    },
    handler: ({ id, ...changes }) => {
      const updated = { ...findItem(id), ...changes, updatedAt: new Date().toISOString() };
      items.set(id, updated);
      return updated;
    }
  },

  '${apiName}.delete': {
    params: idParams,
    handler: ({ id }) => {
      const deleted = findItem(id);
      items.delete(id);
      return { success: true, deleted };
    }
  }
};

/**
 * A request id is a string, a number or null
 */
function isValidId(id) {
  return id === null || typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id));
}

/**
 * Error response envelope
 */
function errorResponse(id, code, message, data) {
  const error = data === undefined ? { code, message } : { code, message, data };
  return { jsonrpc: '2.0', error, id };
}

/**
 * Run one method call and build its response envelope
 */
async function callMethod(request) {
  const { method, params = {} } = request;
  const id = request.id;
  const entry = Object.hasOwn(${camelName}Methods, method) ? ${camelName}Methods[method] : undefined;

  if (!entry) {
    return errorResponse(id, RPC_ERRORS.METHOD_NOT_FOUND, 'Method not found');
  }

  const checked = validateAgainstSchema(entry.params, params);
  if (!checked.valid) {
    return errorResponse(id, RPC_ERRORS.INVALID_PARAMS, 'Invalid params', { errors: checked.errors });
  }

  try {
    const result = await entry.handler(checked.data);
    return { jsonrpc: '2.0', result: result ?? null, id };
  } catch (error) {
    if (error instanceof RpcError) {
      return errorResponse(id, error.code, error.message, error.data);
    }
    console.error(\`[${apiName} RPC] \${method} failed:\`, error);
    return errorResponse(id, RPC_ERRORS.INTERNAL_ERROR, 'Internal error');
  }
}

/**
 * Handle one JSON-RPC request object. Resolves to the response envelope, or
 * to undefined for a notification (a request without an id).
 */
export async function handleRpcRequest(request) {
  const isObject = request !== null && typeof request === 'object' && !Array.isArray(request);
  const valid =
    isObject &&
    request.jsonrpc === '2.0' &&
    typeof request.method === 'string' &&
    (!Object.hasOwn(request, 'id') || isValidId(request.id)) &&
    (request.params === undefined || (request.params !== null && typeof request.params === 'object'));

  if (!valid) {
    const id = isObject && isValidId(request.id) ? request.id : null;
    return errorResponse(id, RPC_ERRORS.INVALID_REQUEST, 'Invalid Request');
  }

  const response = await callMethod(request);
  return Object.hasOwn(request, 'id') ? response : undefined;
}

/**
 * Handle a request body: a single request or a batch (array) of them
 */
export async function handleRpcBody(body) {
  if (!Array.isArray(body)) {
    return handleRpcRequest(body);
  }
  if (body.length === 0) {
    return errorResponse(null, RPC_ERRORS.INVALID_REQUEST, 'Invalid Request');
  }
  const responses = (await Promise.all(body.map(handleRpcRequest))).filter((response) => response !== undefined);
  return responses.length > 0 ? responses : undefined;
}

/**
 * Route definitions. Merge them into another router with
 * router.addRoutes(${camelName}Routes).
 */
export const ${camelName}Routes = {
  rpc: {
    '${apiName}': {
      // POST /rpc/${apiName}: returning undefined (notifications only) answers 204
      POST: (req) => handleRpcBody(req.body)
    }
  }
};

const ${camelName}RPC = createRouter(${camelName}Routes);

export default ${camelName}RPC;

// Usage:
//   ${camelName}RPC.createServer().listen(3000);
//   // or, in an existing node:http server: ${camelName}RPC.handle(req, res)
`;
}

/**
 * Shared test harness: serve the router on a free port for real requests
 */
function testServerSetup(routerName) {
  return `  let server;
  let baseUrl;

  beforeAll(async () => {
    server = ${routerName}.createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = \`http://127.0.0.1:\${server.address().port}\`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));
`;
}

/**
 * Generate REST test content
 */
function generateRESTTestContent({ apiName, className, camelName }) {
  const routerName = `${camelName}API`;

  return `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ${routerName} from './${apiName}.js';

describe('${className} API', () => {
${testServerSetup(routerName)}
  const send = (method, path, body) =>
    fetch(\`\${baseUrl}\${path}\`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

  it('lists items with pagination', async () => {
    const res = await send('GET', '/${apiName}?limit=1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ page: 1, limit: 1 });
  });

  it('creates, reads, updates and deletes an item', async () => {
    const created = await send('POST', '/${apiName}', { name: 'Created' });
    expect(created.status).toBe(201);
    const { data } = await created.json();

    const read = await send('GET', \`/${apiName}/\${data.id}\`);
    expect((await read.json()).data.name).toBe('Created');

    const updated = await send('PUT', \`/${apiName}/\${data.id}\`, { name: 'Updated' });
    expect((await updated.json()).data.name).toBe('Updated');

    const deleted = await send('DELETE', \`/${apiName}/\${data.id}\`);
    expect(deleted.status).toBe(200);
    expect((await send('GET', \`/${apiName}/\${data.id}\`)).status).toBe(404);
  });

  it('rejects an invalid body with 400', async () => {
    const res = await send('POST', '/${apiName}', { description: 'no name' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details.errors[0].field).toBe('name');
  });
});
`;
}

/**
 * Generate RPC test content
 */
function generateRPCTestContent({ apiName, className, camelName }) {
  const routerName = `${camelName}RPC`;

  return `import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import ${routerName}, { RPC_ERRORS } from './${apiName}.js';

describe('${className} RPC API', () => {
${testServerSetup(routerName)}
  const call = async (method, params, id = 1) => {
    const res = await fetch(\`\${baseUrl}/rpc/${apiName}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id })
    });
    expect(res.status).toBe(200);
    return res.json();
  };

  it('creates and reads an item', async () => {
    const created = await call('${apiName}.create', { name: 'Created' });
    expect(created).toMatchObject({ jsonrpc: '2.0', id: 1, result: { name: 'Created' } });

    const read = await call('${apiName}.get', { id: created.result.id }, 2);
    expect(read).toMatchObject({ id: 2, result: { id: created.result.id } });
  });

  it('answers an unknown method with METHOD_NOT_FOUND', async () => {
    const response = await call('${apiName}.nope', {});
    expect(response.error.code).toBe(RPC_ERRORS.METHOD_NOT_FOUND);
  });

  it('answers invalid params with INVALID_PARAMS', async () => {
    const response = await call('${apiName}.get', {});
    expect(response.error.code).toBe(RPC_ERRORS.INVALID_PARAMS);
  });
});
`;
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}
