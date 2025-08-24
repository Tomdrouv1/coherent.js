/**
 * Database Integration Example for Coherent.js
 * 
 * This example demonstrates the complete database integration layer including:
 * - Connection management with multiple database engines
 * - ORM-style models with relationships and validation
 * - Query builder with fluent interface
 * - Migration system with schema management
 * - Router middleware integration
 * - Transaction support and connection pooling
 */

import { SimpleRouter } from '../src/api/router.js';
import { 
  DatabaseManager, 
  QueryBuilder, 
  Model, 
  Migration,
  withDatabase,
  withTransaction,
  withModel,
  withPagination,
  createModel,
  runMigrations
} from '../src/database/index.js';

// Database configuration examples for different engines
const configs = {
  sqlite: {
    type: 'sqlite',
    database: './example.db',
    pool: { min: 2, max: 10 },
    debug: true
  },
  
  postgresql: {
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'coherent_example',
    username: 'postgres',
    password: 'password',
    pool: { min: 2, max: 10 },
    debug: true
  },
  
  mysql: {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'coherent_example',
    username: 'root',
    password: 'password',
    pool: { min: 2, max: 10 },
    debug: true
  },
  
  mongodb: {
    type: 'mongodb',
    host: 'localhost',
    port: 27017,
    database: 'coherent_example',
    username: null,
    password: null,
    pool: { min: 2, max: 10 },
    debug: true
  }
};

// Initialize database (using SQLite for this example)
const db = new DatabaseManager(configs.sqlite);

// Define User model
const User = createModel('User', {
  tableName: 'users',
  fillable: ['name', 'email', 'password', 'age', 'active'],
  hidden: ['password'],
  casts: {
    age: 'number',
    active: 'boolean'
  },
  validationRules: {
    name: { required: true, minLength: 2, maxLength: 100 },
    email: { required: true, email: true, unique: true },
    password: { required: true, minLength: 6 },
    age: { min: 0, max: 120 }
  },
  relationships: {
    posts: { type: 'hasMany', model: 'Post', foreignKey: 'user_id' },
    profile: { type: 'hasOne', model: 'Profile', foreignKey: 'user_id' }
  },
  methods: {
    // Instance method
    getFullName() {
      return this.getAttribute('name');
    },
    
    async getPosts() {
      return await this.getRelation('posts');
    }
  },
  staticMethods: {
    // Static method
    async findByEmail(email) {
      return await this.where('email', email).first();
    },
    
    async getActiveUsers() {
      return await this.where('active', true).execute();
    }
  }
}, db);

// Define Post model
const Post = createModel('Post', {
  tableName: 'posts',
  fillable: ['title', 'content', 'user_id', 'published'],
  casts: {
    published: 'boolean',
    created_at: 'date'
  },
  validationRules: {
    title: { required: true, minLength: 5, maxLength: 200 },
    content: { required: true, minLength: 10 },
    user_id: { required: true }
  },
  relationships: {
    author: { type: 'belongsTo', model: 'User', foreignKey: 'user_id' }
  }
}, db);

// Define Profile model
const Profile = createModel('Profile', {
  tableName: 'profiles',
  fillable: ['user_id', 'bio', 'avatar_url', 'website'],
  validationRules: {
    user_id: { required: true },
    bio: { maxLength: 500 }
  },
  relationships: {
    user: { type: 'belongsTo', model: 'User', foreignKey: 'user_id' }
  }
}, db);

// Create router with database middleware
const router = new SimpleRouter();

// Add database middleware to all routes
router.use(withDatabase(db, { 
  autoConnect: true,
  attachModels: true 
}));

// Example routes demonstrating database integration

// Get all users with pagination
router.get('/users', withPagination({ defaultLimit: 10 }), async (req, res) => {
  try {
    const users = await User.query()
      .select(['id', 'name', 'email', 'active', 'created_at'])
      .limit(req.pagination.limit)
      .offset(req.pagination.offset)
      .orderBy('created_at', 'DESC')
      .execute();

    // Set pagination info
    const totalCount = await User.count();
    req.pagination.totalCount = totalCount;
    req.pagination.totalPages = Math.ceil(totalCount / req.pagination.limit);
    req.pagination.hasNext = req.pagination.page < req.pagination.totalPages;

    res.json({
      data: users.rows.map(user => new User(user).toJSON()),
      pagination: req.pagination
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID with model binding
router.get('/users/:id', withModel(User), async (req, res) => {
  try {
    // req.user is automatically loaded by withModel middleware
    const posts = await req.user.getPosts();
    const profile = await req.user.getRelation('profile');

    res.json({
      user: req.user.toJSON(),
      posts: posts.map(post => post.toJSON()),
      profile: profile ? profile.toJSON() : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put('/users/:id', withModel(User), async (req, res) => {
  try {
    req.user.fill(req.body);
    await req.user.save();

    res.json({
      message: 'User updated successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user
router.delete('/users/:id', withModel(User), async (req, res) => {
  try {
    await req.user.delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complex query example with joins
router.get('/posts/with-authors', async (req, res) => {
  try {
    // Using query builder for complex queries
    const query = new QueryBuilder(db, 'posts')
      .select([
        'posts.id',
        'posts.title',
        'posts.content',
        'posts.created_at',
        'users.name as author_name',
        'users.email as author_email'
      ])
      .join('users', 'posts.user_id', '=', 'users.id')
      .where('posts.published', true)
      .orderBy('posts.created_at', 'DESC')
      .limit(20);

    const result = await query.execute();

    res.json({
      posts: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction example - transfer operation
router.post('/transfer', withTransaction(db), async (req, res) => {
  try {
    const { fromUserId, toUserId, amount } = req.body;

    // All operations in this handler are wrapped in a transaction
    // If any operation fails, the entire transaction is rolled back

    // Deduct from sender
    await req.tx.query(
      'UPDATE user_accounts SET balance = balance - ? WHERE user_id = ?',
      [amount, fromUserId]
    );

    // Add to receiver
    await req.tx.query(
      'UPDATE user_accounts SET balance = balance + ? WHERE user_id = ?',
      [amount, toUserId]
    );

    // Log transaction
    await req.tx.query(
      'INSERT INTO transactions (from_user_id, to_user_id, amount, created_at) VALUES (?, ?, ?, ?)',
      [fromUserId, toUserId, amount, new Date()]
    );

    res.json({ message: 'Transfer completed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Raw SQL query example
router.get('/stats', async (req, res) => {
  try {
    const stats = await req.db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN active = 1 THEN 1 END) as active_users,
        AVG(age) as average_age
      FROM users
    `, [], { single: true });

    const postStats = await req.db.query(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN published = 1 THEN 1 END) as published_posts
      FROM posts
    `, [], { single: true });

    res.json({
      users: stats,
      posts: postStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users with query validation
router.get('/search/users', async (req, res) => {
  try {
    const { name, email, active, minAge, maxAge } = req.query;
    
    let query = User.query();

    if (name) {
      query = query.where('name', 'LIKE', `%${name}%`);
    }

    if (email) {
      query = query.where('email', 'LIKE', `%${email}%`);
    }

    if (active !== undefined) {
      query = query.where('active', active === 'true');
    }

    if (minAge) {
      query = query.where('age', '>=', parseInt(minAge));
    }

    if (maxAge) {
      query = query.where('age', '<=', parseInt(maxAge));
    }

    const users = await query.limit(50).execute();

    res.json({
      users: users.rows.map(user => new User(user).toJSON())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Database health check
router.get('/health/database', async (req, res) => {
  try {
    const startTime = Date.now();
    await db.query('SELECT 1');
    const responseTime = Date.now() - startTime;

    const stats = db.getStats();

    res.json({
      status: 'healthy',
      responseTime,
      database: {
        type: db.config.type,
        connected: db.isConnected,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Migration management endpoints
router.post('/admin/migrate', async (req, res) => {
  try {
    const appliedMigrations = await runMigrations(db);
    
    res.json({
      message: `Applied ${appliedMigrations.length} migrations`,
      migrations: appliedMigrations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example migration files (would be in ./migrations/ directory)
const exampleMigrations = {
  '20231201000001_create_users_table.js': `
export async function up(schema) {
  await schema.createTable('users', (table) => {
    table.id();
    table.string('name').notNull();
    table.string('email').unique().notNull();
    table.string('password').notNull();
    table.integer('age');
    table.boolean('active').default(true);
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('users');
}
`,

  '20231201000002_create_posts_table.js': `
export async function up(schema) {
  await schema.createTable('posts', (table) => {
    table.id();
    table.string('title').notNull();
    table.text('content').notNull();
    table.integer('user_id').notNull();
    table.boolean('published').default(false);
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('posts');
}
`,

  '20231201000003_create_profiles_table.js': `
export async function up(schema) {
  await schema.createTable('profiles', (table) => {
    table.id();
    table.integer('user_id').unique().notNull();
    table.text('bio');
    table.string('avatar_url');
    table.string('website');
    table.timestamps();
  });
}

export async function down(schema) {
  await schema.dropTable('profiles');
}
`
};

// Demo function to show database operations
async function demonstrateDatabase() {
  try {
    console.log('🚀 Starting Coherent.js Database Integration Demo');
    
    // Connect to database
    await db.connect();
    console.log('✅ Database connected successfully');

    // Run migrations (in a real app, migration files would exist)
    console.log('📦 Running migrations...');
    // await runMigrations(db);

    // Create sample users
    console.log('👥 Creating sample users...');
    
    const user1 = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      age: 30,
      active: true
    });

    const user2 = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password456',
      age: 25,
      active: true
    });

    console.log('✅ Users created:', user1.toJSON(), user2.toJSON());

    // Create posts
    console.log('📝 Creating sample posts...');
    
    const post1 = await Post.create({
      title: 'Getting Started with Coherent.js Database',
      content: 'This is a comprehensive guide to using the database layer...',
      user_id: user1.getAttribute('id'),
      published: true
    });

    const post2 = await Post.create({
      title: 'Advanced Query Building',
      content: 'Learn how to build complex queries with the query builder...',
      user_id: user2.getAttribute('id'),
      published: true
    });

    console.log('✅ Posts created');

    // Demonstrate query builder
    console.log('🔍 Demonstrating query builder...');
    
    const activeUsers = await User.where('active', true)
      .where('age', '>', 20)
      .orderBy('created_at', 'DESC')
      .execute();

    console.log(`Found ${activeUsers.rows.length} active users over 20`);

    // Demonstrate complex join query
    const postsWithAuthors = await new QueryBuilder(db, 'posts')
      .select(['posts.*', 'users.name as author_name'])
      .join('users', 'posts.user_id', '=', 'users.id')
      .where('posts.published', true)
      .execute();

    console.log(`Found ${postsWithAuthors.rows.length} published posts with authors`);

    // Demonstrate transaction
    console.log('💳 Demonstrating transaction...');
    
    const tx = await db.transaction();
    try {
      await tx.query('UPDATE users SET age = age + 1 WHERE id = ?', [user1.getAttribute('id')]);
      await tx.query('UPDATE users SET age = age + 1 WHERE id = ?', [user2.getAttribute('id')]);
      await tx.commit();
      console.log('✅ Transaction completed successfully');
    } catch (error) {
      await tx.rollback();
      console.error('❌ Transaction failed:', error.message);
    }

    // Show database stats
    const stats = db.getStats();
    console.log('📊 Database statistics:', stats);

    console.log('🎉 Database demo completed successfully!');

  } catch (error) {
    console.error('❌ Database demo failed:', error.message);
  }
}

// Start the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDatabase().then(() => {
    console.log('Demo finished. Starting HTTP server...');
    
    // Start HTTP server
    const server = router.createServer();
    const port = 3000;
    
    server.listen(port, () => {
      console.log(`🌐 Database API server running at http://localhost:${port}`);
      console.log('\n📚 Available endpoints:');
      console.log('  GET  /users              - List users with pagination');
      console.log('  GET  /users/:id          - Get user with posts and profile');
      console.log('  POST /users              - Create new user');
      console.log('  PUT  /users/:id          - Update user');
      console.log('  DELETE /users/:id        - Delete user');
      console.log('  GET  /posts/with-authors - Get posts with author info');
      console.log('  POST /transfer           - Transfer between users (transaction demo)');
      console.log('  GET  /search/users       - Search users with filters');
      console.log('  GET  /stats              - Database statistics');
      console.log('  GET  /health/database    - Database health check');
      console.log('  POST /admin/migrate      - Run migrations');
    });
  });
}

export { router, db, User, Post, Profile, demonstrateDatabase };
