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

// API route for running code
app.post('/api/run-code', express.json(), async (req, res) => {
  const { code, runtime = 'node' } = req.body;
  let tempFile = null;
  let tempDir = null;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  
  const runtimes = {
    node: { command: 'node' },
    deno: { command: 'deno run --allow-net --allow-env' },
    bun: { command: 'bun run' }
  };

  const runtimeConfig = runtimes[runtime];
  if (!runtimeConfig) {
    return res.status(400).json({ error: 'Unsupported runtime' });
  }

  try {
    // Create a unique temp directory
    tempDir = `/tmp/coherent-playground-${uuidv4()}`;
    await mkdir(tempDir, { recursive: true });
    tempFile = join(tempDir, 'code.js');
    
    // Create temp directory if it doesn't exist
    await mkdir(tempDir, { recursive: true });
    
    // Create a temporary package.json and link to local coherent.js core
    const coherentCorePath = join(__dirname, '..', 'packages', 'core');
    const packageJson = {
      name: 'coherent-playground-temp',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        '@coherentjs/core': `file:${coherentCorePath}`
      }
    };

    const packageJsonPath = join(tempDir, 'package.json');
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Install dependencies using pnpm
    try {
      await execPromise('pnpm install', { 
        cwd: tempDir, 
        timeout: 30000,
        stdio: 'pipe'
      });
    } catch (installError) {
      console.error('Dependency installation failed:', installError);
      throw new Error('Failed to install dependencies');
    }

    // Create a simple fallback component
    const fallbackComponent = `
      // Simple component following Coherent.js structure
      const App = () => ({
        html: {
          children: [
            {
              h1: {
                children: ['Welcome to Coherent.js Playground! 👋'],
                style: 'color: #333;'
              }
            },
            {
              p: {
                children: ['Edit this code and click Run to see the result.']
              }
            },
            {
              div: {
                style: 'margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px;',
                children: [
                  { h3: { children: ['Example Component'] } },
                  { p: { children: ['This is a properly structured Coherent.js component.'] } }
                ]
              }
            }
          ]
        }
      });
    `;

    // Write user code to the temp file, or use fallback if empty
    const userCode = code.trim() || fallbackComponent;
    
    // Create a complete module with proper exports
    const moduleCode = `
      // User's component code
      ${userCode}
      
      // Ensure App is defined and export it
      if (typeof App === 'undefined') {
        throw new Error('No App component found. Please define a component named App.');
      }
      
      // Export the App component
      export { App };
    `;
    
    await writeFile(tempFile, moduleCode, 'utf8');
    
    // Create a wrapper file that properly imports and runs the user's code
    const wrapperCode = `
      import { fileURLToPath } from 'url';
      import { dirname } from 'path';
      
      // Helper function to send JSON response
      function sendResponse(response) {
        process.stdout.write(JSON.stringify(response));
        process.exit(response.exitCode);
      }
      
      try {
        // Import the user's module
        const userModule = await import('./code.js');
        
        // Get the App component
        const App = userModule.App || userModule.default;
        
        if (!App) {
          throw new Error('No App component found. Please export a component named App.');
        }
        
        // If App is a function, call it to get the component
        const component = typeof App === 'function' ? App() : App;
        
        if (!component || typeof component !== 'object') {
          throw new Error('App must return an object. Got: ' + typeof component);
        }
        
        // Ensure we have a valid component structure
        if (!component || typeof component !== 'object') {
          throw new Error('Component must return an object. Got: ' + typeof component);
        }
        
        // Import renderToString from local coherent.js core
        const { renderToString } = await import('@coherentjs/core');
        
        try {
          // Render the component to HTML
          const html = renderToString(component);
          
          // Send success response with the rendered HTML
          sendResponse({
            exitCode: 0,
            stdout: html,
            stderr: undefined,
          });
        } catch (renderError) {
          sendResponse({
            exitCode: 1,
            stdout: '',
            stderr: 'Rendering failed: ' + renderError.message
          });
        }
      } catch (error) {
        console.error('Execution error:', error);
        sendResponse({
          exitCode: 1,
          stdout: '',
          stderr: error.message || 'An error occurred during execution'
        });
      }
    `;
    
    const wrapperFile = join(tempDir, 'wrapper.mjs');
    await writeFile(wrapperFile, wrapperCode, 'utf8');
    
    // Create a simple ESM entry point that imports and runs the user's code
    const entryFile = join(tempDir, 'entry.mjs');
    await writeFile(entryFile, `
      // Set up error handling
      process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        process.exit(1);
      });
      
      process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason);
        process.exit(1);
      });
      
      try {
        // Import the wrapper code which imports the user's code
        await import('./wrapper.mjs');
      } catch (error) {
        console.error('Failed to execute code:', error);
        process.exit(1);
      }
    `, 'utf8');
    
    // Execute the entry file with the correct working directory and environment
    try {
      const { stdout, stderr } = await execPromise(
        `node --no-warnings ${entryFile}`,
        { 
          cwd: tempDir,
          timeout: 15000,
          env: { ...process.env, NODE_OPTIONS: '--no-warnings' },
          maxBuffer: 1024 * 1024 * 5 // 5MB buffer for large outputs
        }
      );
      
      if (stderr) {
        console.error('Error:', stderr);
      }
      
      // Always respond with JSON to avoid content-type issues
      try {
        // Try to parse the output as JSON first
        try {
          const result = JSON.parse(stdout);
          return res.json(result);
        } catch (e) {
          // If not JSON, wrap it in a success response
          return res.json({
            exitCode: 0,
            stdout: stdout,
            stderr: stderr || ''
          });
        }
      } catch (e) {
        console.error('Error processing response:', e);
        return res.status(500).json({
          exitCode: 1,
          stdout: '',
          stderr: 'Error processing response: ' + e.message
        });
      }
    } catch (error) {
      console.error('Execution error:', error);
      res.status(500).json({
        exitCode: 1,
        stdout: '',
        stderr: error.stderr || error.message || 'An error occurred during execution'
      });
    } finally {
      // Clean up temporary files
      try {
        if (tempFile) {
          await unlink(tempFile).catch(console.error);
        }
        if (tempDir) {
          await unlink(join(tempDir, 'package.json')).catch(console.error);
          await unlink(join(tempDir, 'pnpm-lock.yaml')).catch(console.error);
          await rm(join(tempDir, 'node_modules'), { recursive: true, force: true }).catch(console.error);
          await rm(tempDir, { recursive: true, force: true }).catch(console.error);
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Error in request handler:', error);
    throw error;
  }
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
