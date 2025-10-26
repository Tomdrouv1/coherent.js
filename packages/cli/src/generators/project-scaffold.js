/**
 * Project scaffolding generator
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Scaffold a new Coherent.js project
 */
export async function scaffoldProject(projectPath, options) {
  const { name, template, skipInstall, skipGit } = options;

  // Create directory structure
  const dirs = [
    'src',
    'src/components',
    'src/pages', 
    'src/api',
    'src/utils',
    'public',
    'tests'
  ];

  dirs.forEach(dir => {
    mkdirSync(join(projectPath, dir), { recursive: true });
  });

  // Generate package.json
  const packageJson = generatePackageJson(name, template);
  writeFileSync(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Generate template-specific files
  switch (template) {
    case 'basic':
      await generateBasicTemplate(projectPath, name);
      break;
    case 'fullstack':
      // Fullstack template uses basic template as foundation
      await generateBasicTemplate(projectPath, name);
      break;
    case 'express':
      await generateExpressTemplate(projectPath, name);
      break;
    case 'fastify':
      // Fastify template uses basic template as foundation
      await generateBasicTemplate(projectPath, name);
      break;
    case 'components':
      // Components template uses basic template as foundation
      await generateBasicTemplate(projectPath, name);
      break;
    default:
      await generateBasicTemplate(projectPath, name);
  }

  // Generate common files
  generateCommonFiles(projectPath, name);

  // Install dependencies
  if (!skipInstall) {
    console.log('📦 Installing dependencies...');
    try {
      execSync('npm install', { 
        cwd: projectPath,
        stdio: 'inherit'
      });
    } catch {
      console.warn('⚠️  Failed to install dependencies automatically');
    }
  }

  // Initialize git
  if (!skipGit) {
    try {
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });
      execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'pipe' });
    } catch {
      console.warn('⚠️  Failed to initialize git repository');
    }
  }
}

/**
 * Generate package.json based on template
 */
function generatePackageJson(name, template) {
  const base = {
    name,
    version: '1.0.0',
    description: 'A Coherent.js application',
    type: 'module',
    main: 'src/index.js',
    scripts: {
      dev: 'node src/index.js',
      build: 'coherent build',
      start: 'node src/index.js',
      test: 'node --test tests/*.test.js'
    },
    dependencies: {
      '@coherentjs/core': '^1.0.1'
    },
    devDependencies: {
      '@coherentjs/cli': '^1.0.1'
    }
  };

  // Template-specific dependencies
  switch (template) {
    case 'express':
      base.dependencies.express = '^4.18.2';
      base.dependencies['@coherentjs/express'] = '^1.0.1';
      break;
    case 'fastify':
      base.dependencies.fastify = '^4.24.3';
      base.dependencies['@coherentjs/fastify'] = '^1.0.1';
      break;
    case 'fullstack':
      base.dependencies['@coherentjs/api'] = '^1.0.1';
      base.dependencies['@coherentjs/database'] = '^1.0.1';
      base.dependencies.express = '^4.18.2';
      base.dependencies['@coherentjs/express'] = '^1.0.1';
      break;
  }

  return base;
}

/**
 * Generate basic template files
 */
async function generateBasicTemplate(projectPath, name) {
  // Main entry point
  const indexJs = `/**
 * ${name} - Coherent.js Application
 */

import { renderToString, createComponent } from '@coherentjs/core';
import { createServer } from 'http';

// Simple component
const App = createComponent(() => ({
  html: {
    children: [
      { 
        head: {
          children: [
            { title: { text: '${name}' } },
            { 
              meta: { 
                name: 'viewport', 
                content: 'width=device-width, initial-scale=1.0' 
              } 
            }
          ]
        }
      },
      {
        body: {
          children: [
            {
              div: {
                className: 'container',
                children: [
                  { h1: { text: 'Welcome to ${name}!' } },
                  { 
                    p: { 
                      text: 'This is a Coherent.js application built with pure JavaScript objects.' 
                    } 
                  },
                  {
                    div: {
                      className: 'features',
                      children: [
                        { h2: { text: 'Features:' } },
                        {
                          ul: {
                            children: [
                              { li: { text: '⚡ Lightning fast SSR' } },
                              { li: { text: '🎯 Pure JavaScript objects' } },
                              { li: { text: '🔒 Built-in XSS protection' } },
                              { li: { text: '📦 Minimal bundle size' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}));

// Create server
const server = createServer((req, res) => {
  const html = renderToString(App());
  
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`🚀 Server running at http://localhost:\${PORT}\`);
});`;

  writeFileSync(join(projectPath, 'src/index.js'), indexJs);

  // Simple component example
  const buttonComponent = `import { createComponent } from '@coherentjs/core';

export const Button = createComponent(({ text = 'Click me', onClick, className = '' }) => ({
  button: {
    className: \`btn \${className}\`,
    onclick: onClick,
    text
  }
}));`;

  writeFileSync(join(projectPath, 'src/components/Button.js'), buttonComponent);
}

/**
 * Generate Express template files
 */
async function generateExpressTemplate(projectPath, name) {
  const indexJs = `/**
 * ${name} - Express + Coherent.js Application
 */

import express from 'express';
import { setupCoherentExpress } from '@coherentjs/express';
import { renderToString, createComponent } from '@coherentjs/core';

const app = express();

// Setup Coherent.js with Express
setupCoherentExpress(app);

// Serve static files
app.use(express.static('public'));

// Home page component
const HomePage = createComponent(() => ({
  html: {
    children: [
      { 
        head: {
          children: [
            { title: { text: '${name}' } },
            { 
              meta: { 
                name: 'viewport', 
                content: 'width=device-width, initial-scale=1.0' 
              } 
            }
          ]
        }
      },
      {
        body: {
          children: [
            {
              div: {
                className: 'container',
                children: [
                  { h1: { text: 'Express + Coherent.js' } },
                  { 
                    p: { 
                      text: 'Combining the power of Express.js with Coherent.js SSR!' 
                    } 
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}));

// Routes
app.get('/', (req, res) => {
  const html = renderToString(HomePage());
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`🚀 Express server running at http://localhost:\${PORT}\`);
});`;

  writeFileSync(join(projectPath, 'src/index.js'), indexJs);
}

/**
 * Generate common files (README, gitignore, etc.)
 */
function generateCommonFiles(projectPath, name) {
  // README.md
  const readme = `# ${name}

A Coherent.js application built with pure JavaScript objects.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
\`\`\`

## Project Structure

\`\`\`
src/
  components/     # Reusable components
  pages/         # Page components
  api/           # API routes
  utils/         # Utility functions
  index.js       # Main entry point
public/          # Static assets
tests/           # Test files
\`\`\`

## Learn More

- [Coherent.js Documentation](https://github.com/Tomdrouv1/coherent.js)
- [API Reference](https://github.com/Tomdrouv1/coherent.js/docs/api-reference.md)

## License

MIT
`;

  writeFileSync(join(projectPath, 'README.md'), readme);

  // .gitignore
  const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-_error.log*

# Production builds
dist/
build/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history
`;

  writeFileSync(join(projectPath, '.gitignore'), gitignore);

  // Basic test file
  const testFile = `import { test } from 'node:test';
import assert from 'node:assert';
import { renderToString } from '@coherentjs/core';

test('renders basic component', () => {
  const component = {
    div: {
      text: 'Hello, World!'
    }
  };
  
  const html = renderToString(component);
  assert(html.includes('Hello, World!'));
});
`;

  writeFileSync(join(projectPath, 'tests/basic.test.js'), testFile);
}