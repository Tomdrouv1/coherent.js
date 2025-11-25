import http from 'http';
import { createRouter } from '../packages/api/src/index.js';

// Test Coherent.js router with simple exact route matching (no regex)
const router = createRouter();

// Add simple route (should use exact matching, not regex)
router.get('/', (req, res) => {
  return '<h1>Hello World</h1><p>Simple Coherent.js route test</p>';
});

// Test with Express wrapper (like original benchmark)
const app = express();
app.use((req, res, next) => {
  router.handle(req, res).catch(next);
});

const server = http.createServer(app);

server.listen(7003, () => {
  console.log('Simple route Coherent.js test server listening on port 7003');
  console.log('Testing if exact route matching fixes concurrency...');
  console.log('Run: wrk -t2 -c10 -d5s http://localhost:7003/');
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
