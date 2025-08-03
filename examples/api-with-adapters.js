/**
 * API example with adapters for Coherent.js
 */

import { createApiRouter } from '../src/api/router.js';
import { RestAdapter, RpcAdapter, GraphqlAdapter } from '../src/api/adapters/index.js';

// Create an API router
const router = createApiRouter();

// Sample data
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
];

// Mock user model for REST adapter
const userModel = {
  findAll: async (query) => {
    // Simulate filtering
    if (query && query.role) {
      return users.filter(user => user.role === query.role);
    }
    return users;
  },
  create: async (data) => {
    const newUser = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      ...data,
      role: 'user'
    };
    users.push(newUser);
    return newUser;
  },
  findById: async (id) => {
    return users.find(u => u.id === parseInt(id));
  },
  update: async (id, data) => {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...data };
    return users[index];
  },
  patch: async (id, data) => {
    return userModel.update(id, data);
  },
  delete: async (id) => {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return false;
    
    users.splice(index, 1);
    return true;
  }
};

// Create REST adapter for users
const userRestAdapter = new RestAdapter({
  resource: 'users',
  model: userModel,
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' }
    },
    required: ['name', 'email']
  }
});

// Register REST routes
userRestAdapter.registerRoutes(router, '/api');

// Mock RPC methods
const rpcMethods = {
  // User methods
  getUser: async (params) => {
    const user = users.find(u => u.id === params.id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  },
  
  createUser: async (params) => {
    const newUser = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      name: params.name,
      email: params.email,
      role: 'user'
    };
    users.push(newUser);
    return newUser;
  },
  
  // Utility methods
  ping: async () => ({ message: 'pong', timestamp: new Date().toISOString() }),
  
  // Math methods
  add: async (params) => params.a + params.b,
  multiply: async (params) => params.a * params.b
};

// Create RPC adapter
const rpcAdapter = new RpcAdapter({
  methods: rpcMethods
});

// Register RPC routes
rpcAdapter.registerRoutes(router, '/api');

// Mock GraphQL schema and resolvers
const graphqlSchema = `
  type User {
    id: Int!
    name: String!
    email: String!
    role: String!
  }
  
  type Query {
    users: [User!]!
    user(id: Int!): User
    ping: String!
  }
  
  type Mutation {
    createUser(name: String!, email: String!): User!
  }
`;

const graphqlResolvers = {
  Query: {
    users: () => users,
    user: (_, { id }) => users.find(u => u.id === id),
    ping: () => 'pong'
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      const newUser = {
        id: Math.max(0, ...users.map(u => u.id)) + 1,
        name,
        email,
        role: 'user'
      };
      users.push(newUser);
      return newUser;
    }
  }
};

// Create GraphQL adapter
const graphqlAdapter = new GraphqlAdapter({
  schema: graphqlSchema,
  resolvers: graphqlResolvers
});

// Register GraphQL routes
graphqlAdapter.registerRoutes(router, '/api');

// Export the router
export default router;

// Example of how to use with Express:
/*
import express from 'express';
import apiWithAdapters from './api-with-adapters.js';
import { createErrorHandler } from '../src/api/errors.js';

const app = express();
app.use(express.json());

// Mount the API router
app.use('/api', apiWithAdapters.toExpress());

// Global error handler
app.use(createErrorHandler());

app.listen(3000, () => {
  console.log('API server with adapters running on port 3000');
  console.log('REST endpoints:');
  console.log('  GET    /api/users');
  console.log('  POST   /api/users');
  console.log('  GET    /api/users/:id');
  console.log('  PUT    /api/users/:id');
  console.log('  DELETE /api/users/:id');
  console.log('\nRPC endpoint:');
  console.log('  POST   /api/rpc');
  console.log('\nGraphQL endpoint:');
  console.log('  POST   /api/graphql');
  console.log('  GET    /api/graphql (playground)');
});
*/
