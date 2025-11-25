import http from 'http';
import express from 'express';
import { createRouter } from '../packages/api/src/index.js';

// Express server for header comparison
const expressApp = express();
expressApp.get('/', (req, res) => {
  res.send('<h1>Hello World</h1><p>Express server test</p>');
});

const expressServer = http.createServer(expressApp);

// Coherent.js server for header comparison
const router = createRouter();
router.get('/', (req, res) => {
  return '<h1>Hello World</h1><p>Coherent.js server test</p>';
});

const coherentServer = http.createServer(async (req, res) => {
  try {
    await router.handle(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

// Start Express server
expressServer.listen(7002, () => {
  console.log('Express server listening on port 7002');
  console.log('Test with: curl -v http://localhost:7002/');
});

// Start Coherent.js server
coherentServer.listen(7003, () => {
  console.log('Coherent.js server listening on port 7003');
  console.log('Test with: curl -v http://localhost:7003/');
  console.log('\nCompare headers between the two servers...');
});

process.on('SIGTERM', () => {
  expressServer.close();
  coherentServer.close();
});

process.on('SIGINT', () => {
  expressServer.close();
  coherentServer.close();
});
