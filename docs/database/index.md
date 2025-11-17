# Database Integration Layer

The Coherent.js database integration layer provides a comprehensive ORM and query builder system with support for multiple database engines, migrations, and seamless router integration.

## Features

- **Multi-Database Support**: PostgreSQL, MySQL, SQLite, MongoDB
- **Connection Pooling**: Automatic connection management with configurable pools
- **ORM Models**: ActiveRecord-style models with relationships and validation
- **Query Builder**: Fluent interface for building complex SQL queries
- **Migration System**: Version-controlled schema management
- **Transaction Support**: ACID transactions with automatic rollback
- **Router Middleware**: Seamless integration with Coherent.js router
- **Type Safety**: Built-in type casting and validation

## Quick Start

### Installation

```bash
# Core database layer (no dependencies)
npm install @coherent/database

# Add database drivers as needed
npm install sqlite3        # For SQLite
npm install pg            # For PostgreSQL  
npm install mysql2        # For MySQL
npm install mongodb       # For MongoDB
```

### Basic Setup

```javascript
import { DatabaseManager, createModel } from '@coherent/database';

// Configure database
const db = new DatabaseManager({
  type: 'postgresql',
  host: 'localhost',
  database: 'myapp',
  username: 'user',
  password: 'pass',
  pool: { min: 2, max: 10 }
});

// Connect
await db.connect();
```

## Database Configuration

### SQLite Configuration

```javascript
const config = {
  type: 'sqlite',
  database: './app.db',
  pool: { min: 2, max: 10 }
};
```

### PostgreSQL Configuration

```javascript
const config = {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'password',
  ssl: false,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  }
};
```

### MySQL Configuration

```javascript
const config = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'myapp',
  username: 'root',
  password: 'password',
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000
  }
};
```

### MongoDB Configuration

```javascript
const config = {
  type: 'mongodb',
  host: 'localhost',
  port: 27017,
  database: 'myapp',
  username: 'user',
  password: 'pass',
  pool: {
    min: 2,
    max: 10
  }
};
```

## ORM Models

### Defining Models

```javascript
import { createModel } from '@coherent/database';

const User = createModel('User', {
  tableName: 'users',
  fillable: ['name', 'email', 'password', 'age'],
  hidden: ['password'],
  casts: {
    age: 'number',
    active: 'boolean'
  },
  validationRules: {
    name: { required: true, minLength: 2 },
    email: { required: true, email: true, unique: true },
    password: { required: true, minLength: 6 }
  },
  relationships: {
    posts: { type: 'hasMany', model: 'Post', foreignKey: 'user_id' },
    profile: { type: 'hasOne', model: 'Profile', foreignKey: 'user_id' }
  }
}, db);
```

### Model Operations

```javascript
// Create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret123'
});

// Find
const user = await User.find(1);
const user = await User.findByEmail('john@example.com');

// Update
user.fill({ name: 'John Smith' });
await user.save();

// Delete
await user.delete();

// Query
const activeUsers = await User.where('active', true)
  .where('age', '>', 18)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();
```

### Relationships

```javascript
// Get related models
const posts = await user.getRelation('posts');
const profile = await user.getRelation('profile');

// Eager loading (would be implemented in advanced version)
const usersWithPosts = await User.with(['posts', 'profile']).execute();
```

## Query Builder

### Basic Queries

```javascript
import { QueryBuilder } from '@coherent/database';

const query = new QueryBuilder(db, 'users');

// SELECT queries
const users = await query
  .select(['id', 'name', 'email'])
  .where('active', true)
  .where('age', '>', 18)
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();

// Single result
const user = await query
  .where('email', 'john@example.com')
  .first();
```

### Complex Queries

```javascript
// Joins
const postsWithAuthors = await new QueryBuilder(db, 'posts')
  .select(['posts.*', 'users.name as author_name'])
  .join('users', 'posts.user_id', '=', 'users.id')
  .where('posts.published', true)
  .execute();

// Subqueries and conditions
const activeUsersWithPosts = await new QueryBuilder(db, 'users')
  .where('active', true)
  .where(q => q
    .where('age', '>', 18)
    .orWhere('verified', true)
  )
  .whereIn('id', [1, 2, 3, 4, 5])
  .execute();

// Aggregation
const stats = await new QueryBuilder(db, 'users')
  .select(['COUNT(*) as total', 'AVG(age) as avg_age'])
  .where('active', true)
  .first();
```

### INSERT, UPDATE, DELETE

```javascript
// Insert
await new QueryBuilder(db, 'users')
  .insert({
    name: 'Jane Doe',
    email: 'jane@example.com'
  })
  .execute();

// Bulk insert
await new QueryBuilder(db, 'users')
  .insert([
    { name: 'User 1', email: 'user1@example.com' },
    { name: 'User 2', email: 'user2@example.com' }
  ])
  .execute();

// Update
await new QueryBuilder(db, 'users')
  .update({ active: false })
  .where('last_login', '<', '2023-01-01')
  .execute();

// Delete
await new QueryBuilder(db, 'users')
  .delete()
  .where('active', false)
  .execute();
```

## Migrations

### Creating Migrations

```javascript
import { Migration } from '@coherent/database';

const migration = new Migration(db, {
  directory: './migrations'
});

// Create migration file
await migration.create('create_users_table');
```

### Migration File Example

```javascript
// migrations/20231201000001_create_users_table.js
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
```

### Running Migrations

```javascript
import { runMigrations, rollbackMigrations } from '@coherent/database';

// Run pending migrations
const applied = await runMigrations(db);

// Rollback last batch
const rolledBack = await rollbackMigrations(db, 1);

// Check migration status
const migration = new Migration(db);
const status = await migration.status();
```

## Router Integration

### Database Middleware

```javascript
import { SimpleRouter } from '@coherent/api';
import { withDatabase, withTransaction, withModel } from '@coherent/database';

const router = new SimpleRouter();

// Add database to all routes
router.use(withDatabase(db));

// Routes now have access to req.db, req.query, req.transaction
router.get('/users', async (req, res) => {
  const users = await req.db.query('SELECT * FROM users');
  res.json(users.rows);
});
```

### Model Binding Middleware

```javascript
// Automatically load model by route parameter
router.get('/users/:id', withModel(User), async (req, res) => {
  // req.user contains the loaded User model
  res.json(req.user.toJSON());
});

// Custom parameter and request key
router.get('/posts/:postId', withModel(Post, 'postId', 'post'), async (req, res) => {
  res.json(req.post.toJSON());
});
```

### Transaction Middleware

```javascript
// Wrap entire route in transaction
router.post('/transfer', withTransaction(db), async (req, res) => {
  const { fromId, toId, amount } = req.body;
  
  // All operations use req.tx and are automatically committed/rolled back
  await req.tx.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
  await req.tx.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
  
  res.json({ success: true });
});
```

### Pagination Middleware

```javascript
router.get('/users', withPagination({ defaultLimit: 20 }), async (req, res) => {
  const users = await User.query()
    .limit(req.pagination.limit)
    .offset(req.pagination.offset)
    .execute();
  
  res.json({
    data: users.rows,
    pagination: req.pagination
  });
});
```

## Transactions

### Manual Transactions

```javascript
const tx = await db.transaction();

try {
  await tx.query('INSERT INTO users (name) VALUES (?)', ['John']);
  await tx.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

### Transaction Options

```javascript
// With isolation level
const tx = await db.transaction({
  isolationLevel: 'READ COMMITTED',
  readOnly: false
});
```

## Connection Pooling

Connection pooling is automatically handled by the database adapters:

```javascript
const config = {
  type: 'postgresql',
  // ... other config
  pool: {
    min: 2,                    // Minimum connections
    max: 10,                   // Maximum connections
    acquireTimeoutMillis: 30000,  // Timeout to acquire connection
    createTimeoutMillis: 30000,   // Timeout to create connection
    destroyTimeoutMillis: 5000,   // Timeout to destroy connection
    idleTimeoutMillis: 30000,     // Idle timeout
    reapIntervalMillis: 1000,     // Cleanup interval
    createRetryIntervalMillis: 200 // Retry interval
  }
};
```

## Validation

### Built-in Validators

```javascript
const validationRules = {
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 100 
  },
  email: { 
    required: true, 
    email: true, 
    unique: true 
  },
  age: { 
    min: 0, 
    max: 120 
  },
  password: { 
    required: true, 
    minLength: 6,
    validator: async (value, model) => {
      // Custom validation
      if (!/[A-Z]/.test(value)) {
        return 'Password must contain uppercase letter';
      }
      return true;
    }
  }
};
```

### Custom Validation

```javascript
const User = createModel('User', {
  // ... other config
  validationRules: {
    email: {
      required: true,
      validator: async (email, model) => {
        if (!email.includes('@')) {
          return 'Invalid email format';
        }
        
        // Check uniqueness
        const existing = await User.where('email', email)
          .where('id', '!=', model.getAttribute('id'))
          .exists();
          
        if (existing) {
          return 'Email already exists';
        }
        
        return true;
      }
    }
  }
}, db);
```

## Type Casting

```javascript
const User = createModel('User', {
  casts: {
    age: 'number',
    active: 'boolean',
    metadata: 'json',
    tags: 'array',
    created_at: 'date'
  }
}, db);

// Values are automatically cast
const user = new User({
  age: '25',        // Becomes number 25
  active: 'true',   // Becomes boolean true
  metadata: '{"key": "value"}', // Becomes object
  created_at: '2023-12-01'      // Becomes Date object
});
```

## Utilities

### Health Checks

```javascript
import { checkDatabaseHealth } from '@coherent/database';

const health = await checkDatabaseHealth(db);
console.log(`Database is ${health.status}`);
```

### Batch Operations

```javascript
import { batchOperations } from '@coherent/database';

const operations = [
  { sql: 'INSERT INTO users (name) VALUES (?)', params: ['John'] },
  { sql: 'INSERT INTO users (name) VALUES (?)', params: ['Jane'] }
];

const results = await batchOperations(db, operations, {
  useTransaction: true,
  continueOnError: false
});
```

### Schema Documentation

```javascript
import { generateSchemaDocs } from '@coherent/database';

const docs = await generateSchemaDocs(db, {
  includeIndexes: true,
  includeRelationships: true
});
```

## Error Handling

```javascript
try {
  await user.save();
} catch (error) {
  if (error.message.includes('Validation failed')) {
    // Handle validation errors
    console.log('Validation errors:', user.errors);
  } else {
    // Handle other database errors
    console.error('Database error:', error.message);
  }
}
```

## Performance Tips

1. **Use Connection Pooling**: Configure appropriate pool sizes for your workload
2. **Index Your Queries**: Add database indexes for frequently queried columns
3. **Batch Operations**: Use batch operations for multiple inserts/updates
4. **Limit Results**: Always use `limit()` for large datasets
5. **Use Transactions**: Group related operations in transactions
6. **Monitor Queries**: Enable debug mode to monitor query performance

## MongoDB Specifics

For MongoDB, the query interface is adapted to use MongoDB operations:

```javascript
// MongoDB operations
await db.query('find', ['users', { active: true }]);
await db.query('insertOne', ['users', { name: 'John' }]);
await db.query('updateOne', ['users', { _id: userId }, { $set: { name: 'Jane' } }]);
await db.query('deleteOne', ['users', { _id: userId }]);
await db.query('aggregate', ['users', [{ $match: { active: true } }]]);
```

## Best Practices

1. **Always Use Migrations**: Never modify database schema directly
2. **Validate Input**: Use model validation rules consistently
3. **Handle Errors**: Implement proper error handling for database operations
4. **Use Transactions**: For operations that must succeed or fail together
5. **Monitor Performance**: Track query performance and connection pool usage
6. **Secure Credentials**: Never hardcode database credentials
7. **Test Thoroughly**: Write tests for all database operations

## Example Application

See `examples/database-usage.js` for a complete example application demonstrating all database features including models, relationships, migrations, and router integration.
