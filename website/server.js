import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir, rm } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Legacy API route (kept for backward compatibility but not used by new playground)
app.post('/api/run-code', express.json(), async (req, res) => {
  res.status(200).json({
    exitCode: 0,
    stdout: '<div>This endpoint is deprecated. The playground now runs client-side using Coherent.js directly.</div>',
    stderr: ''
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

// Start the server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API server running at http://localhost:${port}`);
  });
}

export default app;
