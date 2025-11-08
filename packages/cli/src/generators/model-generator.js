/**
 * Model generator
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DEFAULT_FIELDS = [
  { name: 'id', type: 'number', primary: true },
  { name: 'name', type: 'string', required: true },
  { name: 'created_at', type: 'date' },
  { name: 'updated_at', type: 'date' }
];

/**
 * Generate a new model definition
 */
export async function generateModel(name, options = {}) {
  const {
    path = 'src/models',
    template = 'basic',
    skipTest = false,
    fields = DEFAULT_FIELDS
  } = options;

  const modelName = toPascalCase(name);
  const tableName = inferTableName(modelName);

  const outputDir = join(process.cwd(), path);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files = [];
  const nextSteps = [];

  const modelPath = join(outputDir, `${modelName}.js`);
  const modelContent = generateModelContent(modelName, tableName, template, fields);
  writeFileSync(modelPath, modelContent);
  files.push(modelPath);

  if (!skipTest) {
    const testPath = join(outputDir, `${modelName}.test.js`);
    const testContent = generateModelTestContent(modelName, tableName);
    writeFileSync(testPath, testContent);
    files.push(testPath);
  }

  nextSteps.push(`Register the model: register${modelName}Model(dbManager)`);
  nextSteps.push(`Use the model: const ${toCamelCase(modelName)} = modelManager.registerModel('${modelName}', ${modelName});`);

  if (!skipTest) {
    nextSteps.push('Run tests: npm test');
  }

  return { files, nextSteps };
}

function generateModelContent(modelName, tableName, template, fields) {
  switch (template) {
    case 'audit':
    case 'audited':
      return generateAuditedModel(modelName, tableName, fields);
    case 'relational':
      return generateRelationalModel(modelName, tableName, fields);
    default:
      return generateBasicModel(modelName, tableName, fields);
  }
}

function generateBasicModel(modelName, tableName, fields) {
  const definitionFields = fields
    .map(({ name, type, primary, required }) => {
      const fieldLines = [`    ${name}: {`, `      type: '${type}'`];
      if (primary) fieldLines.push('      primary: true');
      if (required) fieldLines.push('      required: true');
      fieldLines.push('    }');
      return fieldLines.join('\n');
    })
    .join(',\n');

  return `import { createModel as createModelFactory } from '@coherent.js/database';

/**
 * ${modelName} model definition
 */
export const ${modelName} = {
  tableName: '${tableName}',
  primaryKey: 'id',
  timestamps: true,
  attributes: {
${definitionFields}
  },
  methods: {
    fullName() {
      return this.name || '';
    }
  },
  statics: {
    async findById(id, { model }) {
      const results = await model.query({
        select: '*',
        where: { id },
        limit: 1
      });
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    }
  }
};

/**
 * Register ${modelName} with a database manager
 */
export function register${modelName}Model(dbManager) {
  const modelManager = createModelFactory(dbManager);
  return modelManager.registerModel('${modelName}', ${modelName});
}

export default ${modelName};
`;
}

function generateAuditedModel(modelName, tableName, fields) {
  const extendedFields = [
    ...fields,
    { name: 'created_by', type: 'string' },
    { name: 'updated_by', type: 'string' }
  ];
  const definitionFields = extendedFields
    .map(({ name, type, primary, required }) => {
      const fieldLines = [`    ${name}: {`, `      type: '${type}'`];
      if (primary) fieldLines.push('      primary: true');
      if (required) fieldLines.push('      required: true');
      fieldLines.push('    }');
      return fieldLines.join('\n');
    })
    .join(',\n');

  return `import { createModel as createModelFactory } from '@coherent.js/database';

/**
 * ${modelName} model with audit fields
 */
export const ${modelName} = {
  tableName: '${tableName}',
  primaryKey: 'id',
  timestamps: true,
  attributes: {
${definitionFields}
  },
  methods: {
    setAuditTrail(userId) {
      this.created_by = this.created_by || userId;
      this.updated_by = userId;
      return this;
    }
  },
  statics: {
    async auditedCreate(attributes, { model, actor }) {
      const entity = {
        ...attributes,
        created_by: actor,
        updated_by: actor
      };
      const result = await model.create(entity);
      return result;
    }
  }
};

export function register${modelName}Model(dbManager) {
  const modelManager = createModelFactory(dbManager);
  return modelManager.registerModel('${modelName}', ${modelName});
}

export default ${modelName};
`;
}

function generateRelationalModel(modelName, tableName, fields) {
  const definitionFields = fields
    .map(({ name, type, primary, required }) => {
      const fieldLines = [`    ${name}: {`, `      type: '${type}'`];
      if (primary) fieldLines.push('      primary: true');
      if (required) fieldLines.push('      required: true');
      fieldLines.push('    }');
      return fieldLines.join('\n');
    })
    .concat([
      `    user_id: {`,
      `      type: 'number',`,
      `      required: true`,
      `    }`
    ])
    .join(',\n');

  return `import { createModel as createModelFactory } from '@coherent.js/database';

/**
 * ${modelName} model with relationships
 */
export const ${modelName} = {
  tableName: '${tableName}',
  primaryKey: 'id',
  timestamps: true,
  attributes: {
${definitionFields}
  },
  relationships: {
    user: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'user_id'
    }
  },
  methods: {
    async loadUser() {
      if (!this.user) {
        const related = await this.getRelation?.('user');
        this.user = Array.isArray(related) ? related[0] : related;
      }
      return this.user;
    }
  }
};

export function register${modelName}Model(dbManager) {
  const modelManager = createModelFactory(dbManager);
  return modelManager.registerModel('${modelName}', ${modelName});
}

export default ${modelName};
`;
}

function generateModelTestContent(modelName, tableName) {
  const camel = toCamelCase(modelName);
  return `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register${camel}Model, ${modelName} } from './${modelName}.js';

function createMockDb() {
  return {
    async query() {
      return { rows: [], insertId: 1, affectedRows: 1 };
    }
  };
}

test('${modelName} model exposes metadata', () => {
  assert.equal(${modelName}.tableName, '${tableName}');
  assert.ok(${modelName}.attributes);
  assert.ok(${modelName}.attributes.id);
});

test('register${modelName}Model registers the model', () => {
  const mockDb = createMockDb();
  const registeredModel = register${modelName}Model(mockDb);
  assert.equal(registeredModel.name, '${modelName}');
  assert.equal(typeof registeredModel.create, 'function');
});

test('${modelName} methods behave as expected', () => {
  const instance = { ...${modelName}.methods };
  if (instance.fullName) {
    instance.name = 'Example';
    assert.equal(instance.fullName.call(instance), 'Example');
  }
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

function inferTableName(modelName) {
  const snake = modelName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
  if (snake.endsWith('s')) {
    return snake;
  }
  return `${snake}s`;
}
