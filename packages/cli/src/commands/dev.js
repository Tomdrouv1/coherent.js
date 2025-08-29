/**
 * Dev command - Starts development server with hot reload
 */

import { Command } from 'commander';
import ora from 'ora';
import picocolors from 'picocolors';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const devCommand = new Command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'port number', '3000')
  .option('-h, --host <host>', 'host address', 'localhost')
  .option('--open', 'open browser automatically')
  .option('--no-hmr', 'disable hot module replacement')
  .action(async (options) => {
    console.log(picocolors.cyan('🚀 Starting Coherent.js development server...'));
    console.log();

    // Check if we're in a Coherent.js project
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) {
      console.error(picocolors.red('❌ No package.json found. Are you in a project directory?'));
      process.exit(1);
    }

    let packageJson;
    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
      console.error(picocolors.red('❌ Failed to read package.json'));
      process.exit(1);
    }

    const spinner = ora('Starting development server...').start();

    try {
      let devProcess;

      // Check for existing dev script
      if (packageJson.scripts && packageJson.scripts.dev) {
        spinner.text = 'Running dev script...';
        
        devProcess = spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: {
            ...process.env,
            PORT: options.port,
            HOST: options.host
          }
        });
      } else {
        // Default dev server for Coherent.js projects
        spinner.text = 'Starting default dev server...';

        // Check for different dev servers
        if (existsSync('vite.config.js') || existsSync('vite.config.ts')) {
          devProcess = spawn('npx', ['vite', '--port', options.port, '--host', options.host], {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } else if (existsSync('webpack.config.js')) {
          devProcess = spawn('npx', ['webpack', 'serve', '--port', options.port, '--host', options.host], {
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } else if (packageJson.type === 'module' || existsSync('src/index.js')) {
          // Use nodemon for Node.js projects
          devProcess = spawn('npx', ['nodemon', 'src/index.js'], {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: {
              ...process.env,
              PORT: options.port,
              HOST: options.host
            }
          });
        } else {
          throw new Error('No development server configuration found');
        }
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

      // Open browser if requested
      if (options.open) {
        const { default: open } = await import('open');
        await open(`http://${options.host}:${options.port}`);
      }

      // Handle process termination
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

      // Wait for the process to exit
      devProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(picocolors.red(`❌ Development server exited with code ${code}`));
          process.exit(code);
        }
      });

      devProcess.on('error', (error) => {
        console.error(picocolors.red('❌ Failed to start development server:'), error.message);
        process.exit(1);
      });

    } catch (error) {
      spinner.fail('Failed to start development server');
      console.error(picocolors.red('❌ Error:'), error.message);
      
      // Show helpful suggestions
      console.log();
      console.log(picocolors.yellow('💡 Suggestions:'));
      console.log(picocolors.gray('  • Make sure you have a dev script in package.json'));
      console.log(picocolors.gray('  • Install development dependencies: npm install'));
      console.log(picocolors.gray('  • Check if port', options.port, 'is available'));
      
      process.exit(1);
    }
  });