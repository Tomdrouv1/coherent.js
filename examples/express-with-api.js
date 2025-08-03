/**
 * Express server with Coherent.js API demo
 */

import express from 'express';
import apiDemo from './api-demo.js';
import { createErrorHandler } from '../src/api/errors.js';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the API demo router
app.use('/api', apiDemo.toExpress());

// Global error handler
app.use(createErrorHandler());

// Start the server
app.listen(port, () => {
  console.log(`🚀 Coherent.js API demo server running at http://localhost:${port}`);
  console.log(`📝 Test the API with the following endpoints:`);
  console.log(`   GET    http://localhost:${port}/api/users`);
  console.log(`   POST   http://localhost:${port}/api/users`);
  console.log(`   GET    http://localhost:${port}/api/users/1`);
  console.log(`   PUT    http://localhost:${port}/api/users/1`);
  console.log(`   DELETE http://localhost:${port}/api/users/1`);
  console.log(`   GET    http://localhost:${port}/api/error`);
  console.log(`   POST   http://localhost:${port}/api/validation-error`);
});
