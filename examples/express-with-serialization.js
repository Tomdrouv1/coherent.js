/**
 * Express server with Coherent.js API and serialization example
 */

import express from 'express';
import apiWithSerialization from './api-with-serialization.js';
import { createErrorHandler } from '../src/api/errors.js';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the API with serialization router
app.use('/api', apiWithSerialization.toExpress());

// Global error handler
app.use(createErrorHandler());

// Start the server
app.listen(port, () => {
  console.log(`🚀 Coherent.js API with serialization server running at http://localhost:${port}`);
  console.log(`📝 Test the API with the following endpoints:`);
  console.log(`   GET    http://localhost:${port}/api/events`);
  console.log(`   POST   http://localhost:${port}/api/events`);
  console.log(`   GET    http://localhost:${port}/api/events/1`);
});
