import { createHttpServer, createExpressServer, createCoherentServerOriginal, createCoherentServerCORSOnly, createCoherentServerMinimal } from './benchmark-header-optimized.js';

console.log('Starting security header optimization test servers...');

// Start servers on different ports to avoid conflicts
const server1 = createHttpServer().listen(8001, () => {
  console.log('Node.js HTTP (Baseline) listening on port 8001');
});

const server2 = createExpressServer().listen(8002, () => {
  console.log('Express.js listening on port 8002');
});

const server3 = createCoherentServerOriginal().listen(8003, () => {
  console.log('Coherent.js (Original - All Headers) listening on port 8003');
});

const server4 = createCoherentServerCORSOnly().listen(8004, () => {
  console.log('Coherent.js (CORS Only) listening on port 8004');
});

const server5 = createCoherentServerMinimal().listen(8005, () => {
  console.log('Coherent.js (Minimal Headers) listening on port 8005');
});

console.log('\\nAll optimization test servers started. Press Ctrl+C to stop.');

// Cleanup on exit
process.on('SIGTERM', () => {
  server1.close();
  server2.close();
  server3.close();
  server4.close();
  server5.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  server1.close();
  server2.close();
  server3.close();
  server4.close();
  server5.close();
  process.exit(0);
});
