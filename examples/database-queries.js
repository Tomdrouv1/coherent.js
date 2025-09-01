/**
 * @file Coherent.js Database - Pure JavaScript Object Query Builder Examples
 * 
 * This example demonstrates how to use Coherent.js QueryBuilder with pure JavaScript objects
 * for both model definitions and database queries, without using classes.
 * 
 * This example uses the in-memory database adapter for simplicity.
 */

// Using factory functions (recommended pure JS object approach)
import { createDatabaseManager, createQuery, executeQuery } from '../src/database/index.js';
import { MemoryAdapter } from '../src/database/adapters/memory.js';

// Alternative: Direct imports (also available)
// import { DatabaseManager, QueryBuilder, createQuery, executeQuery } from '../src/database/index.js';

console.log('Setting up in-memory database connection...');

// Setup in-memory database connection using factory function
const db = createDatabaseManager({
  adapter: new MemoryAdapter(),
  store: {
    name: 'example-store'
  },
  debug: true
});

console.log('Connecting to database...');
try {
  await db.connect();
  console.log('Successfully connected to database');
} catch (error) {
  console.error('Failed to connect to database:', error);
  throw error;
}

// Model definitions as plain objects
const models = {
  users: {
    tableName: 'users',
    attributes: {
      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      name: { type: 'string', required: true },
      email: { type: 'string', required: true, unique: true },
      age: { type: 'number' },
      role: { type: 'string', default: 'user' },
      active: { type: 'boolean', default: true },
      created_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' }
    },
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['role'] },
      { fields: ['created_at'] }
    ]
  },
  posts: {
    tableName: 'posts',
    attributes: {
      id: { type: 'integer', primaryKey: true, autoIncrement: true },
      title: { type: 'string', required: true },
      content: { type: 'text' },
      user_id: { type: 'integer', required: true },
      category_id: { type: 'integer' },
      published: { type: 'boolean', default: false },
      created_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      updated_at: { type: 'datetime', default: 'CURRENT_TIMESTAMP' }
    },
    indexes: [
      { fields: ['user_id'] },
      { fields: ['category_id'] },
      { fields: ['published'] }
    ],
    relationships: {
      user: {
        type: 'belongsTo',
        model: 'users',
        foreignKey: 'user_id'
      }
    }
  }
};

// Initialize the database with our schema
async function initializeDatabase() {
  // For in-memory adapter, we just need to store the schema
  for (const [modelName, modelDef] of Object.entries(models)) {
    // Store the model schema in the database
    await db.query('SET_SCHEMA', {
      model: modelName,
      schema: modelDef
    });
    
    // Create a collection/table for this model
    await db.query('CREATE_COLLECTION', {
      name: modelDef.tableName || modelName,
      schema: modelDef.attributes
    });
  }
  
  console.log('Database schema initialized');
}

// Initialize the database with our schema
await initializeDatabase();

// Helper function to execute queries with the in-memory adapter
const query = (modelName) => {
  // Get the model definition
  const modelDef = models[modelName];
  if (!modelDef) {
    throw new Error(`Model ${modelName} not found`);
  }
  
  const tableName = modelDef.tableName || modelName;
  
  return {
    // Find all records
    async find(options = {}) {
      const { where = {}, limit, offset, orderBy } = options;
      
      // Get all records from the table
      const results = await db.query('FIND', {
        table: tableName,
        where,
        limit,
        offset,
        orderBy
      });
      
      return results;
    },
    
    // Find a single record by ID
    async findById(id, options = {}) {
      const results = await this.find({
        where: { id },
        limit: 1,
        ...options
      });
      return results[0] || null;
    },
    
    // Alias for findById for compatibility
    async findOne(where = {}, options = {}) {
      const results = await this.find({
        where,
        limit: 1,
        ...options
      });
      return results[0] || null;
    },
    
    // Create a new record
    async create(data) {
      const result = await db.query('INSERT', {
        table: tableName,
        data
      });
      return this.findById(result.id);
    },
    
    // Update records matching the where clause
    async update(where, data) {
      await db.query('UPDATE', {
        table: tableName,
        where,
        data
      });
      return this.find({ where });
    },
    
    // Delete records matching the where clause
    async delete(where) {
      return db.query('DELETE', {
        table: tableName,
        where
      });
    },
    
    // Count records matching the where clause
    async count(where = {}) {
      const results = await db.query('COUNT', {
        table: tableName,
        where
      });
      return results.count;
    },
    
    // Execute a custom query
    async raw(operation, params = {}) {
      return db.query(operation, {
        ...params,
        table: tableName
      });
    }
  };
};

// Create query interfaces for each model
const User = query('users');
const Post = query('posts');

console.log('🧪 Testing Pure JavaScript Object Query Structure...\n');

// =============================================================================
// 1. BASIC CRUD OPERATIONS
// =============================================================================

console.log('1. Basic CRUD Operations');
console.log('========================');

// Create some test data
const testUser = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  role: 'admin',
  active: true
});

console.log('✓ Created test user:', testUser);

// Create a test post
const testPost = await Post.create({
  title: 'Hello World',
  content: 'This is a test post',
  user_id: testUser.id,
  published: true
});

console.log('✓ Created test post:', testPost);

// Find a single user
const foundUser = await User.findOne({ id: testUser.id });

console.log('✓ Found user by ID:', foundUser);

// Update the user
const updatedUser = await User.update(
  { id: testUser.id },
  { name: 'John Updated' }
);

console.log('✓ Updated user:', updatedUser);

// =============================================================================
// 2. QUERY EXAMPLES
// =============================================================================

console.log('\n2. Query Examples');
console.log('=================');

// Find with complex conditions
const activeAdmins = await User.find({
  where: { 
    active: true,
    role: 'admin'
  },
  orderBy: ['created_at', 'DESC'],
  limit: 5
});

console.log('✓ Found active admins:', activeAdmins);

// Simple published posts query (joins not supported in MemoryAdapter)
const postsWithAuthors = await Post.find({
  where: {
    published: true
  },
  orderBy: ['created_at', 'DESC'],
  limit: 10
});

console.log('✓ Posts with authors:', postsWithAuthors);

// Skip transaction example for in-memory adapter
console.log('ℹ️ Skipping transaction example for in-memory adapter');

// =============================================================================
// 3. ADVANCED QUERIES
// =============================================================================

console.log('\n3. Advanced Queries');
console.log('===================');

// Simple post listing (aggregation not supported in MemoryAdapter)
const userPostCounts = await Post.find({
  orderBy: ['created_at', 'DESC'],
  limit: 5
});

console.log('✓ User post counts:', userPostCounts);

// Recent published posts
const recentPopularPosts = await Post.find({
  where: {
    published: true
  },
  orderBy: ['created_at', 'DESC'],
  limit: 10
});

console.log('✓ Recent popular posts:', recentPopularPosts);

// =============================================================================
// 4. CLEANUP
// =============================================================================

// Clean up test data
await Post.delete({ id: testPost.id });
await User.delete({ id: testUser.id });

console.log('✓ Cleaned up test data');

// Close the database connection
await db.close();
console.log('✓ Database connection closed');

console.log('\n✅ All examples completed successfully!');
