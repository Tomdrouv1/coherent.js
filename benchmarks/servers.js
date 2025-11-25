import { createHttpServer, createExpressServer, createCoherentServer } from './benchmark.js';

console.log('Starting servers...');

// Start servers on different ports to avoid conflicts
const server1 = createHttpServer().listen(7001, () => {
  console.log('Node.js HTTP listening on port 7001');
});

const server2 = createExpressServer().listen(7002, () => {
  console.log('Express.js listening on port 7002');
});

const server3 = createCoherentServer().listen(7003, () => {
  console.log('Coherent.js API listening on port 7003');
});

console.log('All servers started. Press Ctrl+C to stop.');

// Cleanup on exit
process.on('SIGTERM', () => {
  server1.close();
  server2.close();
  server3.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  server1.close();
  server2.close();
  server3.close();
  process.exit(0);
});
