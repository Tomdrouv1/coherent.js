import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import { render } from '../packages/core/src/rendering/html-renderer.js';
import { Examples } from './src/pages/Examples.js';
import { Home } from './src/pages/Home.js';
import { DocsPage } from './src/pages/DocsPage.js';
import { Playground } from './src/pages/Playground.js';
import { Performance } from './src/pages/Performance.js';
import { Coverage } from './src/pages/Coverage.js';
import { StarterAppPage } from './src/pages/StarterApp.js';
import { Layout } from './src/layout/Layout.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use('/examples', express.static(join(__dirname, '../examples')));
app.use(express.static(join(__dirname, 'public')));
app.use('/dist', express.static(join(__dirname, 'dist')));

// Helper function to scan examples directory - only playground-compatible examples
function getExamplesList() {
  const examplesDir = join(__dirname, '../examples');
  
  // Playground-compatible examples (no import statements - exports are okay)
  const playgroundCompatible = [
    // Only examples that actually work in playground (no imports)
    'basic-usage.js'
  ];
  
  const files = readdirSync(examplesDir).filter(file => {
    const filePath = join(examplesDir, file);
    return statSync(filePath).isFile() && 
           file.endsWith('.js') && 
           playgroundCompatible.includes(file);
  });

  return files.map(file => {
    const filePath = join(examplesDir, file);
    let code = '';
    let description = '';
    let label = '';

    try {
      code = readFileSync(filePath, 'utf-8');
      
      // Extract description from first comment or JSDoc comment
      const commentMatch = code.match(/\/\*\*(.*?)\*\//s) || code.match(/\/\*(.*?)\*\//s);
      if (commentMatch) {
        description = commentMatch[1].replace(/\*/g, '').trim();
        // Clean up description - take first meaningful line
        const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
        description = lines[0] || 'Explore this practical Coherent.js example.';
      }

      // Generate label from filename
      label = file.replace('.js', '').split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      // Special handling for specific examples
      if (file === 'basic-usage.js') {
        label = '🚀 Basic Usage';
        description = 'Basic component examples showing greetings, user cards, and complete page composition patterns with styling.';
      } else if (file === 'dev-preview.js') {
        label = '🔧 Dev Preview';
        description = 'Development server preview component demonstrating basic structure and styling capabilities.';
      }

    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
      description = 'Explore this practical Coherent.js example.';
      label = file.replace('.js', '');
    }

    return {
      file,
      label,
      description: description.length > 150 ? `${description.substring(0, 147)  }...` : description,
      runCmd: `node examples/${file}`,
      code: code.length > 5000 ? `${code.substring(0, 4997)  }...` : code
    };
  }).sort((a, b) => {
    // Sort basic-usage.js first, then alphabetical
    if (a.file === 'basic-usage.js') return -1;
    if (b.file === 'basic-usage.js') return 1;
    return a.label.localeCompare(b.label);
  });
}

// Base HTML template
function renderPage(content, title = 'Coherent.js', scripts = []) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${content}
  ${scripts.map(script => `<script src="${script}"></script>`).join('\n  ')}
</body>
</html>`;
}

// Routes
app.get('/', (req, res) => {
  try {
    const content = render(Layout({
      currentPath: '/', 
      children: [Home()] 
    }));
    res.send(renderPage(content, 'Coherent.js - Modern Object-Based UI Framework'));
  } catch (error) {
    console.error('Error rendering home:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/examples', (req, res) => {
  try {
    const examples = getExamplesList();
    const content = render(Layout({
      currentPath: '/examples', 
      children: [Examples({ items: examples })] 
    }));
    res.send(renderPage(content, 'Examples - Coherent.js'));
  } catch (error) {
    console.error('Error rendering examples:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/docs', (req, res) => {
  try {
    const content = render(Layout({
      currentPath: '/docs', 
      children: [DocsPage()] 
    }));
    res.send(renderPage(content, 'Documentation - Coherent.js'));
  } catch (error) {
    console.error('Error rendering docs:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/playground', (req, res) => {
  try {
    const content = render(Layout({
      currentPath: '/playground', 
      children: [Playground()] 
    }));
    res.send(renderPage(content, 'Playground - Coherent.js', ['/codemirror-editor.js', '/playground.js']));
  } catch (error) {
    console.error('Error rendering playground:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/performance', (req, res) => {
  try {
    const content = render(Layout({
      currentPath: '/performance', 
      children: [Performance()] 
    }));
    res.send(renderPage(content, 'Performance - Coherent.js', ['/performance.js']));
  } catch (error) {
    console.error('Error rendering performance:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/coverage', (req, res) => {
  try {
    const content = render(Layout({
      currentPath: '/coverage', 
      children: [Coverage()] 
    }));
    res.send(renderPage(content, 'Coverage - Coherent.js'));
  } catch (error) {
    console.error('Error rendering coverage:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/starter-app', (req, res) => {
  console.log('Rendering starter app...');
  try {
    const content = render(Layout({
      currentPath: '/starter-app', 
      children: [StarterAppPage()] 
    }));
    res.send(renderPage(content, 'Starter App - Coherent.js'));
  } catch (error) {
    console.error('Error rendering starter app:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// API endpoint to get examples data
app.get('/api/examples', (req, res) => {
  try {
    const examples = getExamplesList();
    res.json(examples);
  } catch (error) {
    console.error('Error getting examples:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get individual example file content
app.get('/api/example/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = join(__dirname, '../examples', filename);
    
    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Check if file exists and read it
    if (!statSync(filePath).isFile()) {
      return res.status(404).json({ error: 'Example file not found' });
    }
    
    const content = readFileSync(filePath, 'utf-8');
    res.type('text/plain').send(content);
    
  } catch (error) {
    console.error('Error getting example file:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Example file not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).send(renderPage(
    '<div style="text-align: center; padding: 50px;"><h1>404 - Page Not Found</h1><a href="/">Go Home</a></div>',
    '404 - Coherent.js'
  ));
});

app.listen(port, () => {
  console.log(`🚀 Coherent.js website running at http://localhost:${port}`);
  console.log('📚 Examples:', `http://localhost:${port}/examples`);
  console.log('🧪 Playground:', `http://localhost:${port}/playground`);
  console.log('📖 Docs:', `http://localhost:${port}/docs`);
});
