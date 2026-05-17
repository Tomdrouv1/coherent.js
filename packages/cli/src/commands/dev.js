/**
 * Dev command - Starts development server with hot reload
 */

import { Command } from 'commander';
import ora from 'ora';
import picocolors from 'picocolors';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { startDevServer } from '../dev-server/index.js';

/**
 * True when the current project should use the built-in Coherent dev
 * server instead of delegating to vite/webpack/nodemon. Either the
 * `--coherent` flag is set, or a `coherent.config.js`/`.mjs` file
 * exists in the project root.
 */
function shouldUseCoherentDevServer(cwd, options) {
  if (options.coherent) return true;
  return existsSync(join(cwd, 'coherent.config.js')) || existsSync(join(cwd, 'coherent.config.mjs'));
}

export const devCommand = new Command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'port number', '3000')
  .option('-h, --host <host>', 'host address', 'localhost')
  .option('--open', 'open browser automatically')
  .option('--no-hmr', 'disable hot module replacement')
  .option('--coherent', 'use the built-in Coherent HMR dev server (HTTP + WebSocket + chokidar)')
  .action(async (options) => {
    console.log(picocolors.cyan('🚀 Starting Coherent.js development server...'));
    console.log();

    const cwd = process.cwd();
    const packageJsonPath = join(cwd, 'package.json');
    if (!existsSync(packageJsonPath)) {
      console.error(picocolors.red('❌ No package.json found. Are you in a project directory?'));
      process.exit(1);
    }

    let packageJson;
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    } catch {
      console.error(picocolors.red('❌ Failed to read package.json'));
      process.exit(1);
    }

    // --- Built-in Coherent dev server (opt-in via --coherent or coherent.config.js) ---
    if (shouldUseCoherentDevServer(cwd, options)) {
      try {
        const server = await startDevServer({
          root: cwd,
          port: Number(options.port),
          host: options.host,
          open: Boolean(options.open),
          log: true,
          hmr: options.hmr !== false,
        });

        const cleanup = async () => {
          console.log();
          console.log(picocolors.yellow('👋 Stopping Coherent dev server...'));
          try { await server.close(); } catch { /* ignore */ }
          process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
      } catch (error) {
        console.error(picocolors.red('❌ Failed to start Coherent dev server:'), error.message);
        process.exit(1);
      }
      return;
    }

    // --- Fallback: existing delegation behavior (unchanged) ---
    const spinner = ora('Starting development server...').start();

    try {
      let devProcess;

      if (packageJson.scripts && packageJson.scripts.dev) {
        spinner.text = 'Running dev script...';

        devProcess = spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          cwd,
          shell: true,
          env: {
            ...process.env,
            PORT: options.port,
            HOST: options.host,
          },
        });
      } else if (existsSync('vite.config.js') || existsSync('vite.config.ts')) {
        spinner.text = 'Starting default dev server...';
        devProcess = spawn('npx', ['vite', '--port', options.port, '--host', options.host], {
          stdio: 'inherit',
          cwd,
          shell: true,
        });
      } else if (existsSync('webpack.config.js')) {
        spinner.text = 'Starting default dev server...';
        devProcess = spawn('npx', ['webpack', 'serve', '--port', options.port, '--host', options.host], {
          stdio: 'inherit',
          cwd,
          shell: true,
        });
      } else if (packageJson.type === 'module' || existsSync('src/index.js')) {
        spinner.text = 'Starting default dev server...';
        devProcess = spawn('npx', ['nodemon', 'src/index.js'], {
          stdio: 'inherit',
          cwd,
          shell: true,
          env: {
            ...process.env,
            PORT: options.port,
            HOST: options.host,
          },
        });
      } else {
        throw new Error('No development server configuration found. Run with --coherent to use the built-in Coherent HMR dev server.');
      }

      spinner.stop();

      console.log(picocolors.green('✅ Development server started!'));
      console.log();
      console.log(picocolors.cyan('🌐 Local:'), `http://${options.host}:${options.port}`);

      if (options.host !== 'localhost') {
        console.log(picocolors.cyan('🔗 Network:'), `http://${options.host}:${options.port}`);
      }

      console.log();
      console.log(picocolors.gray('Press Ctrl+C to stop the server'));
      console.log();

      if (options.open) {
        const { default: open } = await import('open');
        await open(`http://${options.host}:${options.port}`);
      }

      const cleanup = () => {
        console.log();
        console.log(picocolors.yellow('👋 Stopping development server...'));
        if (devProcess) {
          devProcess.kill();
        }
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      devProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(picocolors.red(`❌ Development server exited with code ${code}`));
          process.exit(code);
        }
      });

      devProcess.on('_error', (_error) => {
        console.error(picocolors.red('❌ Failed to start development server:'), _error.message);
        process.exit(1);
      });

    } catch (error) {
      spinner.fail('Failed to start development server');
      console.error(picocolors.red('❌ Error:'), error.message);

      console.log();
      console.log(picocolors.yellow('💡 Suggestions:'));
      console.log(picocolors.gray('  • Run with --coherent to use the built-in Coherent HMR dev server'));
      console.log(picocolors.gray('  • Make sure you have a dev script in package.json'));
      console.log(picocolors.gray('  • Install development dependencies: npm install'));
      console.log(picocolors.gray('  • Check if port', options.port, 'is available'));

      process.exit(1);
    }
  });
