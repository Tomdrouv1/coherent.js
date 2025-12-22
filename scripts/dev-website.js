#!/usr/bin/env node
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import process, { env } from 'node:process';

const _execAsync = promisify(exec);
// Align with scripts/serve-website.js default
const PORT = env.PORT || 8081;

async function buildAndServe() {
  try {
    console.log('🔨 Building website...');
    await new Promise((resolve, reject) => {
      const buildProc = spawn('pnpm', ['run', 'website:build'], {
        stdio: 'pipe', // Capture output instead of inheriting
        env: { ...env, QUIET: 'true' }
      });

      let errorOutput = '';

      // Only show errors
      buildProc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      buildProc.on('error', reject);
      buildProc.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Show error output only on failure
          if (errorOutput) {
            console.error(errorOutput);
          }
          reject(new Error(`website:build exited with code ${code}`));
        }
      });
    });
    console.log('✅ Website built successfully!');

    console.log('🚀 Starting development server...');
    const serverProcess = exec(`PORT=${PORT} node scripts/serve-website.js`);

    serverProcess.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down server...');
      serverProcess.kill();
      process.exit(0);
    });
    console.log(`👉 Open http://127.0.0.1:${PORT}/playground/ to try examples`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

buildAndServe();
