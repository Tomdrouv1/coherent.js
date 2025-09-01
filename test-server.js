import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { renderToString } from './src/rendering/html-renderer.js';
import { Performance } from './website/src/pages/Performance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Serve static files
app.use('/src', express.static(join(__dirname, 'src')));
app.use('/examples', express.static(join(__dirname, 'examples')));
app.use(express.static(join(__dirname, 'website/public')));

// Render the Performance page
app.get('/', async (req, res) => {
  try {
    const performanceComponent = Performance();
    const html = renderToString(performanceComponent);
    
    // Using performance.js from public directory instead
    
    const fullPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Testing</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .performance-page { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .performance-header { text-align: center; margin-bottom: 30px; }
    .test-controls { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button-group { display: flex; gap: 10px; flex-wrap: wrap; }
    .button { padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .button.primary { background: #007bff; color: white; }
    .button.secondary { background: #6c757d; color: white; }
    .button:hover { opacity: 0.8; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
    .demo-section { margin: 30px 0; }
    .demo-card { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
    .demo-controls { display: flex; gap: 10px; align-items: center; margin: 15px 0; }
    .demo-result { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px; min-height: 60px; }
    .tips-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
    .tip-card { border-radius: 8px; padding: 15px; }
    input[type="range"] { width: 100px; margin: 0 10px; }
  </style>
</head>
<body>
  ${html}
  <script src="/performance.js"></script>
</body>
</html>
    `;
    
    res.send(fullPage);
  } catch (error) {
    console.error('Error rendering page:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`🚀 Test server running at http://localhost:${port}`);
  console.log('Click "Run All Performance Tests" to see the results!');
});