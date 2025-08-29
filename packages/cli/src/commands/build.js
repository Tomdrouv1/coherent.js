/**
 * Build command - Builds the project for production
 */

import { Command } from 'commander';
import ora from 'ora';
import picocolors from 'picocolors';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const buildCommand = new Command('build')
  .description('Build the project for production')
  .option('-w, --watch', 'watch for changes')
  .option('--analyze', 'analyze bundle size')
  .option('--no-minify', 'disable minification')
  .option('--no-optimize', 'disable optimizations')
  .action(async (options) => {
    console.log(picocolors.cyan('🏗️  Building Coherent.js project...'));
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

    // Check for Coherent.js dependencies
    const hasCoherentDeps = packageJson.dependencies && 
      (packageJson.dependencies['@coherentjs/core'] || 
       packageJson.dependencies['coherentjs']);

    if (!hasCoherentDeps) {
      console.error(picocolors.red('❌ This doesn\'t appear to be a Coherent.js project'));
      console.error(picocolors.gray('   Missing @coherentjs/core dependency'));
      process.exit(1);
    }

    const spinner = ora('Building project...').start();

    try {
      // Check for existing build script
      if (packageJson.scripts && packageJson.scripts.build) {
        spinner.text = 'Running build script...';
        execSync('npm run build', { 
          stdio: options.watch ? 'inherit' : 'pipe',
          cwd: process.cwd()
        });
      } else {
        // Default build process for Coherent.js projects
        spinner.text = 'Building with default configuration...';
        
        // Check for different build tools
        if (existsSync('vite.config.js') || existsSync('vite.config.ts')) {
          execSync('npx vite build', { 
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd()
          });
        } else if (existsSync('webpack.config.js')) {
          execSync('npx webpack --mode production', { 
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd()
          });
        } else if (existsSync('rollup.config.js')) {
          execSync('npx rollup -c', { 
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd()
          });
        } else {
          // Use esbuild as fallback
          spinner.text = 'Building with esbuild (fallback)...';
          execSync(`npx esbuild src/index.js --bundle --minify --outfile=dist/index.js --platform=node --format=esm`, {
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd()
          });
        }
      }

      // Bundle analysis
      if (options.analyze) {
        spinner.text = 'Analyzing bundle...';
        
        try {
          // Try to run bundle analyzer if available
          execSync('npx webpack-bundle-analyzer dist/stats.json', { 
            stdio: 'inherit',
            cwd: process.cwd()
          });
        } catch (error) {
          console.log(picocolors.yellow('⚠️  Bundle analyzer not available'));
          console.log(picocolors.gray('   Install webpack-bundle-analyzer for detailed analysis'));
        }
      }

      spinner.succeed('Build completed successfully!');

      // Show build info
      console.log();
      console.log(picocolors.green('✅ Build completed!'));
      
      // Check if dist directory exists and show size info
      if (existsSync('dist')) {
        try {
          const distSize = execSync('du -sh dist', { encoding: 'utf-8' }).trim().split('\t')[0];
          console.log(picocolors.gray('📦 Output size:'), distSize);
        } catch (error) {
          // Ignore size calculation errors
        }
      }

      console.log();
      console.log(picocolors.cyan('Next steps:'));
      console.log(picocolors.gray('  Deploy your dist/ directory to your hosting provider'));
      console.log(picocolors.gray('  Or run: npm run start (if available)'));
      console.log();

    } catch (error) {
      spinner.fail('Build failed');
      console.error(picocolors.red('❌ Build error:'));
      console.error(error.message);
      
      // Show helpful error messages
      if (error.message.includes('command not found')) {
        console.log();
        console.log(picocolors.yellow('💡 Try installing dependencies:'));
        console.log(picocolors.gray('   npm install'));
      }
      
      process.exit(1);
    }
  });