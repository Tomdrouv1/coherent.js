/**
 * Express server with Coherent.js API and middleware example
 */

import express from 'express';
import apiWithMiddleware from './api-with-middleware.js';
import { createErrorHandler } from '../src/api/errors.js';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the API with middleware router
app.use('/api', apiWithMiddleware.toExpress());

// Global error handler
app.use(createErrorHandler());

// Start the server
app.listen(port, () => {
  console.log(`🚀 Coherent.js API with middleware server running at http://localhost:${port}`);
  console.log(`📝 Test the API with the following endpoints:`);
  console.log(`   GET    http://localhost:${port}/api/users`);
  console.log(`   POST   http://localhost:${port}/api/users`);
  console.log(`   GET    http://localhost:${port}/api/users/1`);
  console.log(`\n🔐 Authentication tokens:`);
  console.log(`   Admin token: admin-token`);
  console.log(`   User token: user-token`);
  console.log(`\nExample curl commands:`);
  console.log(`   curl -H "Authorization: Bearer admin-token" http://localhost:${port}/api/users`);
  console.log(`   curl -H "Authorization: Bearer user-token" http://localhost:${port}/api/users/2`);
});
