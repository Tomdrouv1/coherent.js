import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);

// Maximum execution time in milliseconds
const EXECUTION_TIMEOUT = 10000;

// Allowed runtimes and their commands
const RUNTIMES = {
  node: {
    command: 'node',
    extension: '.js'
  },
  deno: {
    command: 'deno run --allow-net --allow-env',
    extension: '.ts'
  },
  bun: {
    command: 'bun run',
    extension: '.js'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { runtime = 'node', code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const runtimeConfig = RUNTIMES[runtime];
  if (!runtimeConfig) {
    return res.status(400).json({ error: 'Unsupported runtime' });
  }

  const tempDir = os.tmpdir();
  const fileName = `coherent-playground-${uuidv4()}${runtimeConfig.extension}`;
  const filePath = path.join(tempDir, fileName);

  try {
    // Write code to a temporary file
    await writeFile(filePath, code, 'utf8');

    // Execute the code with the specified runtime
    const command = `${runtimeConfig.command} "${filePath}"`;
    
    try {
      const { stdout, stderr } = await execPromise(command, {
        timeout: EXECUTION_TIMEOUT,
        env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
      });

      res.status(200).json({
        exitCode: 0,
        stdout: stdout || '',
        stderr: stderr || ''
      });
    } catch (error) {
      res.status(200).json({
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message
      });
    }
  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({
      error: 'Failed to execute code',
      details: error.message
    });
  } finally {
    // Clean up the temporary file
    try {
      await unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
