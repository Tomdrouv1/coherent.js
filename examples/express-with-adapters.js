/**
 * Express server with Coherent.js API and adapters example
 */

import express from 'express';
import apiWithAdapters from './api-with-adapters.js';
import { createErrorHandler } from '../src/api/errors.js';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the API with adapters router
app.use('/api', apiWithAdapters.toExpress());

// Global error handler
app.use(createErrorHandler());

// Start the server
app.listen(port, () => {
  console.log(`🚀 Coherent.js API with adapters server running at http://localhost:${port}`);
  console.log(`📝 Test the API with the following endpoints:`);
  console.log(`\nREST endpoints:`);
  console.log(`   GET    http://localhost:${port}/api/users`);
  console.log(`   POST   http://localhost:${port}/api/users`);
  console.log(`   GET    http://localhost:${port}/api/users/1`);
  console.log(`   PUT    http://localhost:${port}/api/users/1`);
  console.log(`   DELETE http://localhost:${port}/api/users/1`);
  console.log(`\nRPC endpoint:`);
  console.log(`   POST   http://localhost:${port}/api/rpc`);
  console.log(`\nGraphQL endpoint:`);
  console.log(`   POST   http://localhost:${port}/api/graphql`);
  console.log(`   GET    http://localhost:${port}/api/graphql (playground)`);
  console.log(`\nExample curl commands:`);
  console.log(`   curl http://localhost:${port}/api/users`);
  console.log(`   curl -X POST -H "Content-Type: application/json" -d '{"name":"New User","email":"new@example.com"}' http://localhost:${port}/api/users`);
  console.log(`   curl -X POST -H "Content-Type: application/json" -d '{"method":"ping"}' http://localhost:${port}/api/rpc`);
  console.log(`   curl -X POST -H "Content-Type: application/json" -d '{"query":"{ users { id name } }"}' http://localhost:${port}/api/graphql`);
});
