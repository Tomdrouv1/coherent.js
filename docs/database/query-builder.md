# Database Query Builder

Learn how to build database queries using pure JavaScript objects in Coherent.js.

## Philosophy: Pure Object Queries

Coherent.js database layer uses **pure JavaScript objects** instead of chained methods or SQL strings. This provides type safety, composability, and a natural JavaScript experience.

## Factory Functions (Recommended)

### Creating a Database Manager

```javascript
import { createDatabaseManager } from 'coherent-js';

// ✅ Recommended: Factory function approach
const db = createDatabaseManager({
  type: 'sqlite',
  database: ':memory:' // or path to file
});

// Alternative database types
const pgDb = createDatabaseManager({
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'user',
  password: 'pass'
});
```

### Creating Queries

```javascript
import { createQuery, executeQuery } from 'coherent-js';

// ✅ Pure object query
const query = createQuery({
  table: 'users',
  select: ['id', 'name', 'email'],
  where: {
    active: true,
    role: 'admin'
  },
  orderBy: [
    { column: 'created_at', direction: 'DESC' }
  ],
  limit: 10
});

// Execute the query
const results = await executeQuery(query, db);
```

## Query Types

### SELECT Queries

```javascript
// Basic select
const basicQuery = createQuery({
  table: 'users',
  select: ['*']
});

// Select specific columns
const specificQuery = createQuery({
  table: 'users',
  select: ['id', 'name', 'email']
});

// Select with aliases
const aliasQuery = createQuery({
  table: 'users',
  select: [
    'id',
    { column: 'full_name', as: 'name' },
    { column: 'email_address', as: 'email' }
  ]
});

// Select with calculations
const calcQuery = createQuery({
  table: 'orders',
  select: [
    'id',
    { expression: 'COUNT(*)', as: 'order_count' },
    { expression: 'SUM(total)', as: 'total_amount' }
  ]
});
```

### WHERE Conditions

```javascript
// Simple conditions
const simpleWhere = createQuery({
  table: 'users',
  select: ['*'],
  where: {
    active: true,
    role: 'admin',
    age: 25
  }
});
// SQL: WHERE active = ? AND role = ? AND age = ?

// Comparison operators
const comparisonWhere = createQuery({
  table: 'products',
  select: ['*'],
  where: {
    price: { $gt: 100 },           // price > 100
    stock: { $gte: 10 },           // stock >= 10
    category: { $ne: 'deprecated' }, // category != 'deprecated'
    rating: { $lt: 3 }             // rating < 3
  }
});

// IN and NOT IN
const inWhere = createQuery({
  table: 'users',
  select: ['*'],
  where: {
    role: { $in: ['admin', 'moderator'] },
    status: { $nin: ['banned', 'suspended'] }
  }
});

// LIKE patterns
const likeWhere = createQuery({
  table: 'users',
  select: ['*'],
  where: {
    name: { $like: 'John%' },
    email: { $ilike: '%@example.com' }
  }
});

// NULL checks
const nullWhere = createQuery({
  table: 'users',
  select: ['*'],
  where: {
    deleted_at: { $null: true },    // IS NULL
    verified_at: { $null: false }   // IS NOT NULL
  }
});
```

### Complex Logical Conditions

```javascript
// OR conditions
const orQuery = createQuery({
  table: 'users',
  select: ['*'],
  where: {
    $or: [
      { role: 'admin' },
      { role: 'moderator' }
    ]
  }
});

// AND + OR combined
const complexQuery = createQuery({
  table: 'users',
  select: ['*'],
  where: {
    active: true, // AND active = true
    $or: [
      { role: 'admin' },
      { 
        role: 'user',
        premium: true
      }
    ]
  }
});

// Nested logical conditions
const nestedQuery = createQuery({
  table: 'products',
  select: ['*'],
  where: {
    category: 'electronics',
    $or: [
      {
        $and: [
          { brand: 'Apple' },
          { price: { $gt: 500 } }
        ]
      },
      {
        $and: [
          { brand: 'Samsung' },
          { rating: { $gte: 4.5 } }
        ]
      }
    ]
  }
});
```

### INSERT Operations

```javascript
// Single insert
const insertQuery = createQuery({
  table: 'users',
  insert: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    created_at: new Date()
  }
});

// Multiple insert
const multiInsertQuery = createQuery({
  table: 'users',
  insert: [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' }
  ]
});

// Insert with return
const insertReturnQuery = createQuery({
  table: 'users',
  insert: { name: 'John', email: 'john@example.com' },
  returning: ['id', 'created_at']
});
```

### UPDATE Operations

```javascript
// Basic update
const updateQuery = createQuery({
  table: 'users',
  update: {
    name: 'John Updated',
    updated_at: new Date()
  },
  where: {
    id: 123
  }
});

// Update with conditions
const conditionalUpdate = createQuery({
  table: 'users',
  update: {
    last_login: new Date(),
    login_count: { $increment: 1 } // Special increment operator
  },
  where: {
    email: 'user@example.com'
  }
});
```

### DELETE Operations

```javascript
// Basic delete
const deleteQuery = createQuery({
  table: 'users',
  delete: true,
  where: {
    id: 123
  }
});

// Conditional delete
const conditionalDelete = createQuery({
  table: 'users',
  delete: true,
  where: {
    active: false,
    last_login: { $lt: '2023-01-01' }
  }
});
```

### JOINs

```javascript
// INNER JOIN
const joinQuery = createQuery({
  table: 'users',
  select: [
    'users.id',
    'users.name',
    'profiles.bio',
    'profiles.avatar'
  ],
  joins: [
    {
      type: 'inner',
      table: 'profiles',
      on: {
        'users.id': 'profiles.user_id'
      }
    }
  ]
});

// LEFT JOIN with multiple conditions
const leftJoinQuery = createQuery({
  table: 'users',
  select: ['users.*', 'orders.total'],
  joins: [
    {
      type: 'left',
      table: 'orders',
      on: {
        'users.id': 'orders.user_id',
        'orders.status': 'completed'
      }
    }
  ]
});

// Multiple JOINs
const multiJoinQuery = createQuery({
  table: 'users',
  select: [
    'users.name',
    'profiles.bio',
    'orders.total',
    'products.title'
  ],
  joins: [
    {
      type: 'inner',
      table: 'profiles',
      on: { 'users.id': 'profiles.user_id' }
    },
    {
      type: 'left',
      table: 'orders',
      on: { 'users.id': 'orders.user_id' }
    },
    {
      type: 'inner',
      table: 'products',
      on: { 'orders.product_id': 'products.id' }
    }
  ]
});
```

### Aggregation and Grouping

```javascript
// GROUP BY with aggregations
const groupQuery = createQuery({
  table: 'orders',
  select: [
    'user_id',
    { expression: 'COUNT(*)', as: 'order_count' },
    { expression: 'SUM(total)', as: 'total_spent' },
    { expression: 'AVG(total)', as: 'avg_order_value' }
  ],
  groupBy: ['user_id'],
  having: {
    order_count: { $gt: 5 },
    total_spent: { $gt: 1000 }
  }
});

// Complex aggregation
const complexAggQuery = createQuery({
  table: 'sales',
  select: [
    { expression: 'DATE(created_at)', as: 'sale_date' },
    'product_category',
    { expression: 'SUM(amount)', as: 'daily_total' }
  ],
  where: {
    created_at: { $gte: '2024-01-01' }
  },
  groupBy: [
    { expression: 'DATE(created_at)' },
    'product_category'
  ],
  orderBy: [
    { column: 'sale_date', direction: 'DESC' },
    { column: 'daily_total', direction: 'DESC' }
  ]
});
```

### Sorting and Limiting

```javascript
// Basic ordering
const orderedQuery = createQuery({
  table: 'posts',
  select: ['*'],
  orderBy: [
    { column: 'created_at', direction: 'DESC' },
    { column: 'title', direction: 'ASC' }
  ]
});

// Pagination
const paginatedQuery = createQuery({
  table: 'users',
  select: ['*'],
  orderBy: [{ column: 'id', direction: 'ASC' }],
  limit: 20,
  offset: 100 // Skip first 100 records
});

// Top N records
const topQuery = createQuery({
  table: 'products',
  select: ['*'],
  orderBy: [{ column: 'rating', direction: 'DESC' }],
  limit: 10
});
```

## Advanced Query Building

### Dynamic Query Building

```javascript
function buildUserQuery(filters = {}) {
  const query = {
    table: 'users',
    select: ['id', 'name', 'email']
  };

  // Build WHERE clause dynamically
  const where = {};
  
  if (filters.role) {
    where.role = filters.role;
  }
  
  if (filters.active !== undefined) {
    where.active = filters.active;
  }
  
  if (filters.search) {
    where.$or = [
      { name: { $like: `%${filters.search}%` } },
      { email: { $like: `%${filters.search}%` } }
    ];
  }
  
  if (Object.keys(where).length > 0) {
    query.where = where;
  }

  // Add sorting
  if (filters.sortBy) {
    query.orderBy = [{ 
      column: filters.sortBy, 
      direction: filters.sortDirection || 'ASC' 
    }];
  }

  return createQuery(query);
}

// Usage
const userQuery = buildUserQuery({
  role: 'admin',
  active: true,
  search: 'john',
  sortBy: 'created_at',
  sortDirection: 'DESC'
});
```

### Query Composition

```javascript
// Base query builder
const createUserBaseQuery = () => ({
  table: 'users',
  select: ['id', 'name', 'email', 'role']
});

// Add active filter
const withActiveFilter = (queryObj) => ({
  ...queryObj,
  where: {
    ...queryObj.where,
    active: true
  }
});

// Add role filter
const withRoleFilter = (queryObj, role) => ({
  ...queryObj,
  where: {
    ...queryObj.where,
    role: role
  }
});

// Compose queries
const activeAdminQuery = createQuery(
  withRoleFilter(
    withActiveFilter(
      createUserBaseQuery()
    ),
    'admin'
  )
);
```

### Transaction Support

```javascript
import { createDatabaseManager, createQuery, executeQuery } from 'coherent-js';

const db = createDatabaseManager({ type: 'sqlite', database: 'app.db' });

// Execute queries in transaction
await db.transaction(async (trx) => {
  // Create user
  const userQuery = createQuery({
    table: 'users',
    insert: { name: 'John', email: 'john@example.com' },
    returning: ['id']
  });
  const [user] = await executeQuery(userQuery, trx);

  // Create profile
  const profileQuery = createQuery({
    table: 'profiles',
    insert: { 
      user_id: user.id,
      bio: 'Hello world'
    }
  });
  await executeQuery(profileQuery, trx);

  // Update user count
  const updateQuery = createQuery({
    table: 'stats',
    update: { user_count: { $increment: 1 } },
    where: { id: 1 }
  });
  await executeQuery(updateQuery, trx);
});
```

## Database Adapters

### SQLite

```javascript
const sqliteDb = createDatabaseManager({
  type: 'sqlite',
  database: './data/app.db', // File path
  // database: ':memory:' // In-memory database
});
```

### PostgreSQL

```javascript
const pgDb = createDatabaseManager({
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'password',
  ssl: false
});
```

### MySQL

```javascript
const mysqlDb = createDatabaseManager({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'myapp',
  username: 'root',
  password: 'password'
});
```

### MongoDB

```javascript
const mongoDb = createDatabaseManager({
  type: 'mongodb',
  host: 'localhost',
  port: 27017,
  database: 'myapp',
  // Optional authentication
  username: 'user',
  password: 'pass'
});

// MongoDB queries use similar object syntax
const mongoQuery = createQuery({
  table: 'users', // Collection name
  select: ['name', 'email'],
  where: {
    active: true,
    role: { $in: ['admin', 'user'] }
  }
});
```

## Error Handling

```javascript
import { createQuery, executeQuery, createDatabaseManager } from 'coherent-js';

const db = createDatabaseManager({ type: 'sqlite', database: 'app.db' });

try {
  const query = createQuery({
    table: 'users',
    select: ['*'],
    where: { id: 123 }
  });
  
  const results = await executeQuery(query, db);
  console.log('Query results:', results);
  
} catch (error) {
  if (error.code === 'SQLITE_ERROR') {
    console.error('SQL Error:', error.message);
  } else if (error.code === 'TABLE_NOT_FOUND') {
    console.error('Table does not exist:', error.table);
  } else {
    console.error('Database error:', error);
  }
}
```

## Query Debugging

```javascript
// Enable query logging
const db = createDatabaseManager({
  type: 'sqlite',
  database: 'app.db',
  debug: true // Log all queries
});

// Get generated SQL (without executing)
const query = createQuery({
  table: 'users',
  select: ['*'],
  where: { active: true }
});

const { sql, params } = db.toSQL(query);
console.log('Generated SQL:', sql);
console.log('Parameters:', params);
// Output: Generated SQL: SELECT * FROM users WHERE active = ?
// Output: Parameters: [true]
```

## Best Practices

### 1. Use Factory Functions

```javascript
// ✅ Recommended
import { createDatabaseManager, createQuery, executeQuery } from 'coherent-js';

const db = createDatabaseManager(config);
const query = createQuery(queryConfig);
const results = await executeQuery(query, db);
```

### 2. Validate Input

```javascript
function createSafeUserQuery(filters) {
  const query = { table: 'users', select: ['id', 'name', 'email'] };
  
  if (filters.id && typeof filters.id === 'number') {
    query.where = { id: filters.id };
  }
  
  if (filters.role && ['admin', 'user', 'moderator'].includes(filters.role)) {
    query.where = { ...query.where, role: filters.role };
  }
  
  return createQuery(query);
}
```

### 3. Use Transactions for Related Operations

```javascript
async function createUserWithProfile(userData, profileData) {
  const db = createDatabaseManager(config);
  
  return await db.transaction(async (trx) => {
    const userQuery = createQuery({
      table: 'users',
      insert: userData,
      returning: ['id']
    });
    const [user] = await executeQuery(userQuery, trx);
    
    const profileQuery = createQuery({
      table: 'profiles',
      insert: { ...profileData, user_id: user.id }
    });
    await executeQuery(profileQuery, trx);
    
    return user;
  });
}
```

### 4. Handle Connections Properly

```javascript
const db = createDatabaseManager(config);

// Proper cleanup
process.on('exit', async () => {
  await db.destroy();
});
```

## Next Steps

- [Database Models](./models.md) - Structure your data with models
- [Migrations](./migrations.md) - Manage schema changes
- [Advanced Queries](./advanced-queries.md) - Complex query patterns