import {
  createHttpServer,
  createExpressServer,
  createCoherentServerOriginal,
  createCoherentServerSmartRouting,
  createCoherentServerUltraOptimized
} from './benchmark-smart-routing.js';

console.log('🚀 Coherent.js Smart Routing Performance Benchmark');
console.log('=====================================================');

// Start servers on different ports to avoid conflicts
const server1 = createHttpServer().listen(8001, () => {
  console.log('Node.js HTTP (Baseline) listening on port 8001');
});

const server2 = createExpressServer().listen(8002, () => {
  console.log('Express.js listening on port 8002');
});

const server3 = createCoherentServerOriginal().listen(8003, () => {
  console.log('Coherent.js (Original Routing) listening on port 8003');
});

const server4 = createCoherentServerSmartRouting().listen(8004, () => {
  console.log('Coherent.js (Smart Routing) listening on port 8004');
});

const server5 = createCoherentServerUltraOptimized().listen(8005, () => {
  console.log('Coherent.js (Ultra-Optimized) listening on port 8005');
});

console.log('\\nAll smart routing test servers started. Press Ctrl+C to stop.');
console.log('\\nExpected Performance Ranking:');
console.log('1. Node.js HTTP (Baseline) - Fastest');
console.log('2. Coherent.js (Ultra-Optimized) - Smart + minimal headers');
console.log('3. Coherent.js (Smart Routing) - Smart routing enabled');
console.log('4. Coherent.js (Original Routing) - No smart routing');
console.log('5. Express.js - Slowest');
console.log('\\nSmart routing should provide significant improvement for static routes!');

// Cleanup on exit
process.on('SIGTERM', () => {
  server1.close();
  server2.close();
  server3.close();
  server4.close();
  server5.close();
});

process.on('SIGINT', () => {
  server1.close();
  server2.close();
  server3.close();
  server4.close();
  server5.close();
});
