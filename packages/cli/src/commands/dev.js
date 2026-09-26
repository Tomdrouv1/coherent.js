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
 * Open `url` in the default browser via the optional `open` package, which
 * this CLI does not depend on. Never throws: prints how to enable it instead.
 */
export async function openBrowser(url, importOpen = () => import('open')) {
  try {
    const { default: open } = await importOpen();
    await open(url);
    return true;
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      console.log(picocolors.yellow('⚠️  --open needs the optional "open" package: npm install --save-dev open'));
    } else {
      console.log(picocolors.yellow(`⚠️  Could not open a browser: ${error?.message ?? error}`));
    }
    console.log(picocolors.gray(`   Open ${url} manually.`));
    return false;
  }
}

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

/** Split a comma-separated option value into its trimmed, non-empty entries. */
function splitList(value) {
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

/** Commander parser for a comma-separated option that may also be repeated. */
function collectList(value, previous = []) {
  return [...previous, ...splitList(value)];
}

export const devCommand = new Command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'port number', '3000')
  .option('-H, --host <host>', 'host address', 'localhost')
  .option('--open', 'open browser automatically')
  .option('--no-hmr', 'disable hot module replacement')
  .option('--coherent', 'use the built-in Coherent HMR dev server (HTTP + WebSocket + chokidar)')
  .option('--allowed-hosts <hosts>', 'built-in server: comma-separated extra Host names to answer (besides localhost, IPs and --host)')
  .option('--fs-allow <dirs>', 'built-in server: comma-separated extra directories files may be served from, relative to the project root (repeatable)', collectList)
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
          open: false,
          log: true,
          hmr: options.hmr !== false,
          allowedHosts: options.allowedHosts ? splitList(options.allowedHosts) : [],
          fsAllow: options.fsAllow ?? [],
        });

        const cleanup = async () => {
          console.log();
          console.log(picocolors.yellow('👋 Stopping Coherent dev server...'));
          try { await server.close(); } catch { /* ignore */ }
          process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

        if (options.open) {
          await openBrowser(`http://${server.host}:${server.port}`);
        }
      } catch (error) {
        console.error(picocolors.red('❌ Failed to start Coherent dev server:'), error.message);
        process.exit(1);
      }
      return;
    }

    // --- Fallback: existing delegation behavior ---
    const spinner = ora('Starting development server...').start();
    let devProcess;

    try {
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

      devProcess.on('error', (_error) => {
        console.error(picocolors.red('❌ Failed to start development server:'), _error.message);
        process.exit(1);
      });

      if (options.open) {
        await openBrowser(`http://${options.host}:${options.port}`);
      }

    } catch (error) {
      // Never leave a server running behind a command that reports failure
      if (devProcess && devProcess.exitCode === null) {
        devProcess.kill();
      }
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
