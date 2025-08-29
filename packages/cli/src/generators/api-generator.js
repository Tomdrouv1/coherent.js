/**
 * API generator
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Generate a new API route
 */
export async function generateAPI(name, options = {}) {
  const { path = 'src/api', template = 'rest', skipTest = false } = options;
  
  // Ensure API name is in lowercase with hyphens
  const apiName = toKebabCase(name);
  const fileName = apiName;
  
  // Create output directory
  const outputDir = join(process.cwd(), path);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files = [];
  const nextSteps = [];

  // Generate API file
  const apiPath = join(outputDir, `${fileName}.js`);
  const apiContent = generateAPIContent(apiName, name, template);
  writeFileSync(apiPath, apiContent);
  files.push(apiPath);

  // Generate test file
  if (!skipTest) {
    const testPath = join(outputDir, `${fileName}.test.js`);
    const testContent = generateTestContent(apiName, name);
    writeFileSync(testPath, testContent);
    files.push(testPath);
  }

  // Add next steps
  nextSteps.push(`Import the API: import ${toPascalCase(name)}API from '${path}/${fileName}.js'`);
  nextSteps.push(`Mount the API: app.use('/api/${apiName}', ${toPascalCase(name)}API)`);
  nextSteps.push(`Test the API: curl http://localhost:3000/api/${apiName}`);
  
  if (!skipTest) {
    nextSteps.push('Run tests: npm test');
  }

  return { files, nextSteps };
}

/**
 * Generate API content based on template
 */
function generateAPIContent(apiName, originalName, template) {
  switch (template) {
    case 'graphql':
      return generateGraphQLAPI(apiName, originalName);
    case 'rpc':
      return generateRPCAPI(apiName, originalName);
    case 'crud':
      return generateCRUDAPI(apiName, originalName);
    default:
      return generateRESTAPI(apiName, originalName);
  }
}

/**
 * Generate REST API
 */
function generateRESTAPI(apiName, originalName) {
  const className = toPascalCase(originalName);
  const camelCaseApiName = toCamelCase(apiName);
  
  return `import { createApiRouter, withValidation } from '@coherentjs/api';

/**
 * ${className} API Routes
 * REST API for ${apiName} resources
 * 
 * Base URL: /api/${apiName}
 */

// Create API router
const ${camelCaseApiName}API = createApiRouter({
  prefix: '/${apiName}',
  version: 'v1'
});

// Sample data (replace with database)
const sampleData = [
  { id: '1', name: 'Sample ${className} 1', createdAt: new Date().toISOString() },
  { id: '2', name: 'Sample ${className} 2', createdAt: new Date().toISOString() }
];

// Validation schemas
const ${apiName}Schema = {
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

const ${apiName}UpdateSchema = {
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

// Routes

/**
 * GET /${apiName}
 * Get all ${apiName} items
 */
${camelCaseApiName}API.get('/', (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  
  let data = [...sampleData];
  
  // Apply search filter
  if (search) {
    data = data.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: data.length,
      totalPages: Math.ceil(data.length / limit)
    }
  };
});

/**
 * GET /${apiName}/:id
 * Get a specific ${apiName} item
 */
${camelCaseApiName}API.get('/:id', (req, res) => {
  const { id } = req.params;
  const item = sampleData.find(item => item.id === id);
  
  if (!item) {
    return res.status(404).json({
      error: '${className} not found',
      code: 'NOT_FOUND'
    });
  }
  
  return { data: item };
});

/**
 * POST /${apiName}
 * Create a new ${apiName} item
 */
${camelCaseApiName}API.post('/', 
  withValidation(${apiName}Schema),
  (req, res) => {
    const { name, description } = req.body;
    
    const newItem = {
      id: String(Date.now()),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    sampleData.push(newItem);
    
    return res.status(201).json({
      data: newItem,
      message: '${className} created successfully'
    });
  }
);

/**
 * PUT /${apiName}/:id
 * Update a ${apiName} item
 */
${camelCaseApiName}API.put('/:id',
  withValidation(${apiName}UpdateSchema),
  (req, res) => {
    const { id } = req.params;
    const itemIndex = sampleData.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        error: '${className} not found',
        code: 'NOT_FOUND'
      });
    }
    
    const updatedItem = {
      ...sampleData[itemIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    sampleData[itemIndex] = updatedItem;
    
    return {
      data: updatedItem,
      message: '${className} updated successfully'
    };
  }
);

/**
 * DELETE /${apiName}/:id
 * Delete a ${apiName} item
 */
${camelCaseApiName}API.delete('/:id', (req, res) => {
  const { id } = req.params;
  const itemIndex = sampleData.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({
      error: '${className} not found',
      code: 'NOT_FOUND'
    });
  }
  
  const deletedItem = sampleData.splice(itemIndex, 1)[0];
  
  return {
    data: deletedItem,
    message: '${className} deleted successfully'
  };
});

// Health check endpoint
${camelCaseApiName}API.get('/health', (req, res) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: '${className} API'
  };
});

export default ${camelCaseApiName}API;

// Usage example:
// import express from 'express';
// import ${camelCaseApiName}API from './api/${apiName}.js';
// 
// const app = express();
// app.use(express.json());
// app.use('/api', ${camelCaseApiName}API.toExpress());
//
// app.listen(3000, () => {
//   console.log('Server running on http://localhost:3000');
// });
`;
}

/**
 * Generate CRUD API
 */
function generateCRUDAPI(apiName, originalName) {
  return generateRESTAPI(apiName, originalName); // Same as REST for now
}

/**
 * Generate RPC API
 */
function generateRPCAPI(apiName, originalName) {
  const className = toPascalCase(originalName);
  const camelCaseApiName = toCamelCase(apiName);
  
  return `import { createApiRouter, withValidation } from '@coherentjs/api';

/**
 * ${className} RPC API
 * Remote Procedure Call API for ${apiName}
 * 
 * Base URL: /rpc/${apiName}
 */

// Create RPC router
const ${camelCaseApiName}RPC = createApiRouter({
  prefix: '/rpc/${apiName}'
});

// Sample data
const sampleData = new Map();
sampleData.set('1', { id: '1', name: 'Sample ${className} 1', createdAt: new Date() });
sampleData.set('2', { id: '2', name: 'Sample ${className} 2', createdAt: new Date() });

// RPC Methods

/**
 * RPC Method: ${apiName}.list
 * List all ${apiName} items
 */
${camelCaseApiName}RPC.post('/list', (req, res) => {
  const { params = {} } = req.body;
  const { limit = 10, offset = 0 } = params;
  
  const items = Array.from(sampleData.values())
    .slice(offset, offset + limit);
  
  return {
    jsonrpc: '2.0',
    result: {
      items,
      total: sampleData.size
    },
    id: req.body.id
  };
});

/**
 * RPC Method: ${apiName}.get
 * Get a specific ${apiName} item
 */
${camelCaseApiName}RPC.post('/get', 
  withValidation({
    type: 'object',
    properties: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    required: ['params']
  }),
  (req, res) => {
    const { params } = req.body;
    const item = sampleData.get(params.id);
    
    if (!item) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: '${className} not found'
        },
        id: req.body.id
      };
    }
    
    return {
      jsonrpc: '2.0',
      result: item,
      id: req.body.id
    };
  }
);

/**
 * RPC Method: ${apiName}.create
 * Create a new ${apiName} item
 */
${camelCaseApiName}RPC.post('/create',
  withValidation({
    type: 'object',
    properties: {
      params: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' }
        },
        required: ['name']
      }
    },
    required: ['params']
  }),
  (req, res) => {
    const { params } = req.body;
    const id = String(Date.now());
    
    const newItem = {
      id,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    sampleData.set(id, newItem);
    
    return {
      jsonrpc: '2.0',
      result: newItem,
      id: req.body.id
    };
  }
);

/**
 * RPC Method: ${apiName}.update
 * Update a ${apiName} item
 */
${camelCaseApiName}RPC.post('/update',
  withValidation({
    type: 'object',
    properties: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['id']
      }
    },
    required: ['params']
  }),
  (req, res) => {
    const { params } = req.body;
    const existing = sampleData.get(params.id);
    
    if (!existing) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: '${className} not found'
        },
        id: req.body.id
      };
    }
    
    const updated = {
      ...existing,
      ...params,
      updatedAt: new Date()
    };
    
    sampleData.set(params.id, updated);
    
    return {
      jsonrpc: '2.0',
      result: updated,
      id: req.body.id
    };
  }
);

/**
 * RPC Method: ${apiName}.delete
 * Delete a ${apiName} item
 */
${camelCaseApiName}RPC.post('/delete',
  withValidation({
    type: 'object',
    properties: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    required: ['params']
  }),
  (req, res) => {
    const { params } = req.body;
    const item = sampleData.get(params.id);
    
    if (!item) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: '${className} not found'
        },
        id: req.body.id
      };
    }
    
    sampleData.delete(params.id);
    
    return {
      jsonrpc: '2.0',
      result: { success: true, deleted: item },
      id: req.body.id
    };
  }
);

export default ${camelCaseApiName}RPC;
`;
}

/**
 * Generate test content
 */
function generateTestContent(apiName, originalName) {
  const className = toPascalCase(originalName);
  
  return `import { test } from 'node:test';
import assert from 'node:assert';
import ${apiName}API from './${apiName}.js';

test('${className} API should be defined', () => {
  assert(typeof ${apiName}API === 'object');
  assert(typeof ${apiName}API.get === 'function');
  assert(typeof ${apiName}API.post === 'function');
});

test('${className} API should handle GET requests', async () => {
  const mockReq = {
    query: {}
  };
  const mockRes = {
    status: (code) => mockRes,
    json: (data) => data
  };
  
  // This is a basic test structure
  // In a real test, you'd use a testing framework like supertest
  assert(true); // Placeholder
});

// Add more specific tests for your API endpoints
// Example:
// test('POST /${apiName} should create new item', async () => {
//   // Test implementation
// });
//
// test('GET /${apiName}/:id should return specific item', async () => {
//   // Test implementation
// });
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