/**
 * Enhanced Model Templates for Coherent.js CLI
 * Provides additional model generation templates
 */

/**
 * Generate a soft-delete model template
 */
export function generateSoftDeleteModel(modelName, tableName, fields) {
  const definitionFields = [
    ...fields,
    { name: 'deleted_at', type: 'date', required: false }
  ].map(({ name, type, primary, required }) => {
    const fieldLines = [`    ${name}: {`, `      type: '${type}'`];
    if (primary) fieldLines.push('      primary: true');
    if (required) fieldLines.push('      required: true');
    fieldLines.push('    }');
    return fieldLines.join('\n');
  }).join(',\n');

  return `import { createModel as createModelFactory } from '@coherent.js/database';

/**
 * ${modelName} model with soft delete support
 */
export const ${modelName} = {
  tableName: '${tableName}',
  primaryKey: 'id',
  timestamps: true,
  softDelete: true,
  attributes: {
${definitionFields}
  },
  methods: {
    isDeleted() {
      return this.deleted_at !== null;
    },
    restore() {
      this.deleted_at = null;
      return this;
    }
  },
  statics: {
    async findActive({ model }) {
      return await model.query({
        select: '*',
        where: { deleted_at: null }
      });
    },
    async findDeleted({ model }) {
      return await model.query({
        select: '*',
        where: 'deleted_at IS NOT NULL'
      });
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

/**
 * Generate a timestamped model template
 */
export function generateTimestampedModel(modelName, tableName, fields) {
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
 * ${modelName} model with automatic timestamps
 */
export const ${modelName} = {
  tableName: '${tableName}',
  primaryKey: 'id',
  timestamps: true,
  attributes: {
${definitionFields}
  },
  hooks: {
    beforeCreate(data) {
      data.created_at = new Date();
      data.updated_at = new Date();
      return data;
    },
    beforeUpdate(data) {
      data.updated_at = new Date();
      return data;
    }
  },
  methods: {
    isRecent() {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return this.created_at > dayAgo;
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

/**
 * Field type mappings with validation
 */
export const FIELD_TYPE_MAPPINGS = {
  string: { jsType: 'string', dbType: 'VARCHAR(255)' },
  text: { jsType: 'string', dbType: 'TEXT' },
  number: { jsType: 'number', dbType: 'INTEGER' },
  float: { jsType: 'number', dbType: 'FLOAT' },
  boolean: { jsType: 'boolean', dbType: 'BOOLEAN' },
  date: { jsType: 'Date', dbType: 'TIMESTAMP' },
  json: { jsType: 'object', dbType: 'JSON' },
  uuid: { jsType: 'string', dbType: 'UUID' }
};
