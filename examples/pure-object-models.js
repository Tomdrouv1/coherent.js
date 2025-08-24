/**
 * Coherent.js - Pure Object-Based Model System Prototype
 * 
 * This explores a completely object-based approach for model definitions
 * and queries, maintaining consistency with the framework's philosophy.
 */

// =============================================================================
// 1. PURE OBJECT MODEL DEFINITIONS
// =============================================================================

const User = {
  tableName: 'users',
  primaryKey: 'id',
  
  attributes: {
    id: { type: 'number', autoIncrement: true, primaryKey: true },
    username: { type: 'string', required: true, unique: true },
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true, hidden: true },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    age: { type: 'number', min: 13, max: 120 },
    role: { type: 'string', enum: ['user', 'admin', 'moderator'], default: 'user' },
    active: { type: 'boolean', default: true },
    lastLogin: { type: 'datetime' },
    createdAt: { type: 'datetime', default: 'now' },
    updatedAt: { type: 'datetime', default: 'now', onUpdate: 'now' }
  },

  relationships: {
    posts: { type: 'hasMany', model: 'Post', foreignKey: 'userId' },
    profile: { type: 'hasOne', model: 'Profile', foreignKey: 'userId' },
    comments: { type: 'hasMany', model: 'Comment', foreignKey: 'userId' }
  },

  methods: {
    // Instance methods
    changePassword: function(newPassword) {
      this.password = hashPassword(newPassword);
      this.updatedAt = new Date();
    },

    getFullName: function() {
      return `${this.firstName} ${this.lastName}`;
    },

    isAdmin: function() {
      return this.role === 'admin';
    },

    getAge: function() {
      if (!this.birthDate) return null;
      return Math.floor((new Date() - this.birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }
  },

  statics: {
    // Static methods
    findByEmail: function(email) {
      return this.query({
        where: { email },
        limit: 1
      });
    },

    findActiveUsers: function() {
      return this.query({
        where: { active: true },
        orderBy: { createdAt: 'DESC' }
      });
    },

    findAdmins: function() {
      return this.query({
        where: { role: 'admin', active: true }
      });
    }
  },

  hooks: {
    beforeSave: function(instance) {
      instance.updatedAt = new Date();
    },

    beforeCreate: function(instance) {
      instance.createdAt = new Date();
      instance.updatedAt = new Date();
    },

    afterCreate: function(instance) {
      console.log(`User ${instance.username} created`);
    }
  },

  validation: {
    username: {
      minLength: 3,
      maxLength: 30,
      pattern: /^[a-zA-Z0-9_]+$/,
      message: 'Username must be 3-30 characters, alphanumeric and underscore only'
    },

    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format'
    },

    age: {
      min: 13,
      max: 120,
      message: 'Age must be between 13 and 120'
    }
  }
};

const Post = {
  tableName: 'posts',
  primaryKey: 'id',

  attributes: {
    id: { type: 'number', autoIncrement: true, primaryKey: true },
    title: { type: 'string', required: true, maxLength: 200 },
    content: { type: 'text', required: true },
    excerpt: { type: 'string', maxLength: 500 },
    slug: { type: 'string', unique: true },
    status: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
    userId: { type: 'number', required: true, foreignKey: 'users.id' },
    categoryId: { type: 'number', foreignKey: 'categories.id' },
    tags: { type: 'json', default: [] },
    publishedAt: { type: 'datetime' },
    createdAt: { type: 'datetime', default: 'now' },
    updatedAt: { type: 'datetime', default: 'now', onUpdate: 'now' }
  },

  relationships: {
    author: { type: 'belongsTo', model: 'User', foreignKey: 'userId' },
    category: { type: 'belongsTo', model: 'Category', foreignKey: 'categoryId' },
    comments: { type: 'hasMany', model: 'Comment', foreignKey: 'postId' }
  },

  methods: {
    publish: function() {
      this.status = 'published';
      this.publishedAt = new Date();
      this.updatedAt = new Date();
    },

    isPublished: function() {
      return this.status === 'published';
    },

    generateSlug: function() {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  },

  statics: {
    findPublished: function() {
      return this.query({
        where: { status: 'published' },
        orderBy: { publishedAt: 'DESC' }
      });
    },

    findByUser: function(userId) {
      return this.query({
        where: { userId },
        orderBy: { createdAt: 'DESC' }
      });
    }
  }
};

// =============================================================================
// 2. PURE OBJECT QUERY SYNTAX
// =============================================================================

// Single model queries
const userQueries = {
  // Basic user query
  activeUsers: {
    user: {
      select: ['id', 'username', 'email', 'role'],
      where: {
        active: true,
        role: { 'in': ['user', 'admin'] }
      },
      orderBy: { createdAt: 'DESC' },
      limit: 50
    }
  },

  // Complex user query with conditions
  recentAdmins: {
    user: {
      select: ['id', 'username', 'email', 'lastLogin'],
      where: {
        role: 'admin',
        active: true,
        lastLogin: { '>': '2024-01-01' }
      },
      orderBy: { lastLogin: 'DESC' }
    }
  },

  // User statistics
  userStats: {
    user: {
      select: [
        'role',
        'COUNT(*) as count',
        'AVG(age) as avgAge',
        'MIN(createdAt) as firstUser',
        'MAX(createdAt) as latestUser'
      ],
      where: { active: true },
      groupBy: ['role'],
      having: { count: { '>': 5 } },
      orderBy: { count: 'DESC' }
    }
  }
};

// Multi-model queries with joins
const complexQueries = {
  // Users with their posts
  usersWithPosts: {
    user: {
      select: ['u.id', 'u.username', 'u.email'],
      from: 'users u',
      join: [
        {
          type: 'INNER',
          table: 'posts p',
          on: { local: 'u.id', operator: '=', foreign: 'p.userId' }
        }
      ],
      where: {
        'u.active': true,
        'p.status': 'published'
      },
      orderBy: { 'u.username': 'ASC' }
    }
  },

  // Posts with author and category
  postsWithDetails: {
    post: {
      select: [
        'p.id',
        'p.title',
        'p.publishedAt',
        'u.username as author',
        'c.name as category'
      ],
      from: 'posts p',
      join: [
        {
          type: 'INNER',
          table: 'users u',
          on: { local: 'p.userId', operator: '=', foreign: 'u.id' }
        },
        {
          type: 'LEFT',
          table: 'categories c',
          on: { local: 'p.categoryId', operator: '=', foreign: 'c.id' }
        }
      ],
      where: {
        'p.status': 'published',
        'u.active': true
      },
      orderBy: { 'p.publishedAt': 'DESC' },
      limit: 20
    }
  }
};

// =============================================================================
// 3. CRUD OPERATIONS WITH PURE OBJECTS
// =============================================================================

const crudOperations = {
  // Create operations
  createUser: {
    user: {
      insert: {
        username: 'johndoe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        age: 28,
        role: 'user'
      }
    }
  },

  // Batch create
  createMultipleUsers: {
    user: {
      insert: [
        {
          username: 'alice',
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Smith'
        },
        {
          username: 'bob',
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Johnson'
        }
      ]
    }
  },

  // Update operations
  updateUserRole: {
    user: {
      update: {
        role: 'admin',
        updatedAt: new Date()
      },
      where: {
        id: 123,
        active: true
      }
    }
  },

  // Bulk update
  activateUsers: {
    user: {
      update: {
        active: true,
        updatedAt: new Date()
      },
      where: {
        email: { 'like': '%@company.com' },
        active: false
      }
    }
  },

  // Delete operations
  deleteInactiveUsers: {
    user: {
      delete: true,
      where: {
        active: false,
        lastLogin: { '<': '2023-01-01' },
        role: { 'notIn': ['admin'] }
      }
    }
  }
};

// =============================================================================
// 4. PROTOTYPE MODEL SYSTEM IMPLEMENTATION
// =============================================================================

class ObjectModelSystem {
  constructor(db) {
    this.db = db;
    this.models = new Map();
  }

  // Register a model
  registerModel(name, definition) {
    // Validate model definition
    this.validateModelDefinition(definition);
    
    // Create model instance with enhanced capabilities
    const model = this.createModelInstance(name, definition);
    
    this.models.set(name, model);
    return model;
  }

  // Create model instance with methods
  createModelInstance(name, definition) {
    const model = {
      ...definition,
      name,
      db: this.db,

      // Query method using object syntax
      query: async (config) => {
        const { ObjectQueryBuilder } = await import('../src/database/object-query-builder.js');
        
        // Set default table if not specified
        if (!config.from && definition.tableName) {
          config.from = definition.tableName;
        }
        
        const result = await ObjectQueryBuilder.execute(this.db, config);
        
        // Convert results to model instances if it's a SELECT query
        if (config.select && result.rows) {
          return result.rows.map(row => this.createInstance(row));
        }
        
        return result;
      },

      // Create instance with methods
      createInstance: (attributes) => {
        const instance = { ...attributes };
        
        // Add instance methods
        if (definition.methods) {
          Object.entries(definition.methods).forEach(([methodName, method]) => {
            instance[methodName] = method.bind(instance);
          });
        }
        
        return instance;
      },

      // Add static methods
      ...definition.statics
    };

    return model;
  }

  // Execute query using object syntax
  async execute(queryObject) {
    const results = {};
    
    for (const [modelName, queryConfig] of Object.entries(queryObject)) {
      const model = this.models.get(modelName);
      if (!model) {
        throw new Error(`Model '${modelName}' not found`);
      }
      
      results[modelName] = await model.query(queryConfig);
    }
    
    return results;
  }

  validateModelDefinition(definition) {
    if (!definition.tableName) {
      throw new Error('Model must have a tableName');
    }
    
    if (!definition.attributes || typeof definition.attributes !== 'object') {
      throw new Error('Model must have attributes object');
    }
    
    // Additional validation...
  }
}

// =============================================================================
// 5. USAGE EXAMPLES
// =============================================================================

console.log('🧪 Testing Pure Object-Based Model System...\n');

// Initialize the system
const modelSystem = new ObjectModelSystem(db);

// Register models
const UserModel = modelSystem.registerModel('user', User);
const PostModel = modelSystem.registerModel('post', Post);

console.log('✓ Models registered with pure object definitions');

// Execute single model queries
const activeUsers = await modelSystem.execute(userQueries.activeUsers);
console.log('✓ Single model query executed');

// Execute complex multi-model queries
const postsWithAuthors = await modelSystem.execute(complexQueries.postsWithDetails);
console.log('✓ Complex multi-model query executed');

// Execute CRUD operations
const newUser = await modelSystem.execute(crudOperations.createUser);
console.log('✓ CRUD operations with pure objects');

// Use model methods
const userInstance = UserModel.createInstance({
  firstName: 'John',
  lastName: 'Doe',
  role: 'user'
});

console.log('Full name:', userInstance.getFullName());
console.log('Is admin:', userInstance.isAdmin());

console.log('\n🎉 Pure Object-Based Model System Prototype Complete!');

export { ObjectModelSystem, User, Post, userQueries, complexQueries, crudOperations };
