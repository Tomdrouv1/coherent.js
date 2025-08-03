/**
 * API example with serialization for Coherent.js
 */

import { createApiRouter, withValidation, serializeForJSON } from '../src/api/index.js';

// Create an API router
const router = createApiRouter();

// Sample data with complex types
let events = [
  {
    id: 1,
    name: 'Event 1',
    date: new Date('2023-01-01T12:00:00Z'),
    tags: new Set(['important', 'meeting']),
    metadata: new Map([['location', 'Room A'], ['organizer', 'John Doe']])
  },
  {
    id: 2,
    name: 'Event 2',
    date: new Date('2023-02-01T14:00:00Z'),
    tags: new Set(['social', 'fun']),
    metadata: new Map([['location', 'Room B'], ['organizer', 'Jane Smith']])
  }
];

// Validation schema for event creation
const eventCreateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    date: { type: 'string', format: 'date-time' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object' }
  },
  required: ['name', 'date']
};

// Register routes

// GET /events - Get all events
router.get('/events', (req, res) => {
  // Serialize complex data types for JSON response
  return serializeForJSON({ events });
});

// GET /events/:id - Get a specific event
router.get('/events/:id', (req, res) => {
  const eventId = parseInt(req.params.id);
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Serialize complex data types for JSON response
  return serializeForJSON({ event });
});

// POST /events - Create a new event
router.post('/events', 
  withValidation(eventCreateSchema),
  (req, res) => {
    const { name, date, tags = [], metadata = {} } = req.body;
    
    // Create new event with complex types
    const newEvent = {
      id: Math.max(0, ...events.map(e => e.id)) + 1,
      name,
      date: new Date(date),
      tags: new Set(tags),
      metadata: new Map(Object.entries(metadata))
    };
    
    events.push(newEvent);
    
    // Return created event with 201 status
    res.status(201);
    return serializeForJSON({ event: newEvent });
  }
);

// Export the router
export default router;

// Example of how to use with Express:
/*
import express from 'express';
import apiRouter from './api-with-serialization.js';

const app = express();
app.use(express.json());

app.use('/api', apiRouter.toExpress());

app.listen(3000, () => {
  console.log('API server with serialization running on port 3000');
});
*/
