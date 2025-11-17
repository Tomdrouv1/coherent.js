# Query Builder

Coherent.js provides a pure object-based query builder for building and executing database queries in a declarative way.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Query Types](#query-types)
  - [SELECT Queries](#select-queries)
  - [INSERT Queries](#insert-queries)
  - [UPDATE Queries](#update-queries)
  - [DELETE Queries](#delete-queries)
- [Where Conditions](#where-conditions)
- [Ordering and Pagination](#ordering-and-pagination)
- [Backwards Compatibility](#backwards-compatibility)

## Basic Usage

```javascript
import { createQuery, executeQuery } from 'coherent/database';

// Create a query
const query = createQuery({
  table: 'users',
  select: ['id', 'name', 'email'],
  where: { active: true },
  orderBy: { created_at: 'DESC' },
  limit: 10
});

// Execute the query
const result = await executeQuery(db, query);
```

## Query Types

### SELECT Queries

```javascript
// Basic select
const query = createQuery({
  table: 'users',
  select: ['id', 'name', 'email'],
  where: { active: true },
  orderBy: { created_at: 'DESC' },
  limit: 10,
  offset: 0
});

// Count rows
const countQuery = createQuery({
  table: 'users',
  select: [['COUNT(*)', 'count']],
  where: { active: true }
});
```

### INSERT Queries

```javascript
// Single insert
const insertQuery = createQuery({
  table: 'users',
  insert: { 
    name: 'John Doe',
    email: 'john@example.com',
    created_at: new Date()
  }
});

// Multiple inserts (if supported by adapter)
const bulkInsertQuery = createQuery({
  table: 'users',
  insert: [
    { name: 'John', email: 'john@example.com' },
    { name: 'Jane', email: 'jane@example.com' }
  ]
});
```

### UPDATE Queries

```javascript
const updateQuery = createQuery({
  table: 'users',
  update: { 
    name: 'John Updated',
    updated_at: new Date()
  },
  where: { id: 1 }
});
```

### DELETE Queries

```javascript
const deleteQuery = createQuery({
  table: 'users',
  where: { id: 1 },
  delete: true
});
```

## Where Conditions

### Basic Conditions

```javascript
// Simple equality
where: { active: true }

// Comparison operators
where: {
  age: { '>': 18 },
  created_at: { '<=': new Date('2023-01-01') }
}

// IN clause
where: {
  id: { in: [1, 2, 3] }
}

// BETWEEN
where: {
  age: { between: [18, 65] }
}

// LIKE
where: {
  name: { like: 'John%' }
}
```

### Logical Operators

```javascript
// AND/OR conditions
where: {
  active: true,
  $or: [
    { role: 'admin' },
    { role: 'moderator' }
  ],
  created_at: { '>': '2023-01-01' }
}

// Nested conditions
where: {
  $and: [
    { active: true },
    {
      $or: [
        { role: 'admin' },
        { role: 'moderator' }
      ]
    },
    {
      $not: {
        banned: true
      }
    }
  ]
}
```

## Ordering and Pagination

```javascript
// Basic ordering
orderBy: { created_at: 'DESC' }

// Multiple columns
orderBy: [
  { created_at: 'DESC' },
  { name: 'ASC' }
]

// Pagination
const query = createQuery({
  table: 'users',
  select: ['id', 'name'],
  orderBy: { id: 'ASC' },
  limit: 10,
  offset: 20 // Skip first 20 records
});
```

## Backwards Compatibility

For backwards compatibility, the old `QueryBuilder` interface is still available:

```javascript
import { QueryBuilder } from 'coherent/database';

// Create query
const query = QueryBuilder.create({
  table: 'users',
  select: ['id', 'name']
});

// Execute query
const result = await QueryBuilder.execute(db, query);
```

## Error Handling

```javascript
try {
  const result = await executeQuery(db, query);
  // Handle success
} catch (error) {
  console.error('Query failed:', error);
  // Handle error
}
```

## Best Practices

1. **Use parameterized queries**: Always use the query builder's parameter binding to prevent SQL injection.
2. **Reuse queries**: Create reusable query factories for common queries.
3. **Use transactions**: Wrap multiple queries in a transaction when needed.
4. **Handle errors**: Always handle potential database errors.
5. **Use indexes**: Ensure your database has proper indexes for frequently queried columns.

## Database Adapters

The query builder works with different database adapters. The SQL generation is adapter-agnostic, but some features might be adapter-specific.

### Supported Adapters

- PostgreSQL
- MySQL
- SQLite
- MongoDB (with some limitations)

Check the specific adapter documentation for any adapter-specific features or limitations.
