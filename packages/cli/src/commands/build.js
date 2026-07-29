/**
 * Build command - Builds the project for production
 */

import { Command } from 'commander';
import ora from 'ora';
import picocolors from 'picocolors';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, parse } from 'path';

const COHERENT_PACKAGES = ['@coherent.js/core', 'coherentjs'];

/**
 * esbuild fallback command.
 *
 * --packages=external keeps dependencies out of the bundle: server deps like
 * express pull in CJS packages that call require() dynamically (debug ->
 * require('tty')), which an ESM bundle cannot satisfy. Without it the build
 * exits 0 but the artifact dies at startup.
 */
export const ESBUILD_FALLBACK_COMMAND =
  'npx esbuild src/index.js --bundle --minify --outfile=dist/index.js --platform=node --format=esm --packages=external';

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

/** Read and parse a package.json, or null when absent/unreadable. */
function readPackageJson(dir) {
  const path = join(dir, 'package.json');
  if (!existsSync(path)) return null;

  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/** Every directory from `start` up to the filesystem root. */
function ancestorDirectories(start) {
  const dirs = [];
  const { root } = parse(start);

  let current = start;
  while (true) {
    dirs.push(current);
    if (current === root) break;

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return dirs;
}

/**
 * Detect a Coherent.js dependency.
 *
 * Workspace setups (pnpm/yarn/npm workspaces) hoist dependencies to the
 * repository root, so the package manifest next to the build may not list
 * @coherent.js/core at all. Walk up the tree and check every dependency
 * field, and accept an installed copy under any ancestor's node_modules.
 */
export function hasCoherentDependency(startDir) {
  for (const dir of ancestorDirectories(startDir)) {
    const manifest = readPackageJson(dir);

    if (manifest) {
      for (const field of DEPENDENCY_FIELDS) {
        const deps = manifest[field];
        if (deps && COHERENT_PACKAGES.some(name => deps[name])) return true;
      }
    }

    if (COHERENT_PACKAGES.some(name => existsSync(join(dir, 'node_modules', name)))) {
      return true;
    }
  }

  return false;
}

/** Detect the package manager in use, falling back to npm. */
export function detectPackageManager(startDir) {
  for (const dir of ancestorDirectories(startDir)) {
    const manifest = readPackageJson(dir);
    const declared = manifest?.packageManager;
    if (typeof declared === 'string') {
      const name = declared.split('@')[0].trim();
      if (name) return name;
    }

    if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
    if (existsSync(join(dir, 'bun.lockb'))) return 'bun';
    if (existsSync(join(dir, 'package-lock.json'))) return 'npm';
  }

  return 'npm';
}

/** True when a build script would re-enter this command. */
export function isSelfReferential(script) {
  return typeof script === 'string' && /(^|[\s&|;])coherent\s+build\b/.test(script);
}

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
    } catch {
      console.error(picocolors.red('❌ Failed to read package.json'));
      process.exit(1);
    }

    // Check for Coherent.js dependencies (including hoisted workspace deps)
    if (!hasCoherentDependency(process.cwd())) {
      console.error(picocolors.red('❌ This doesn\'t appear to be a Coherent.js project'));
      console.error(picocolors.gray('   Missing @coherent.js/core dependency'));
      process.exit(1);
    }

    const packageManager = detectPackageManager(process.cwd());
    const spinner = ora('Building project...').start();

    try {
      // Check for existing build script. A script of `coherent build` (which
      // `coherent create` generates) would re-enter this command forever, so
      // fall through to the default pipeline instead.
      const buildScript = packageJson.scripts?.build;

      if (buildScript && !isSelfReferential(buildScript)) {
        spinner.text = `Running build script with ${packageManager}...`;
        execSync(`${packageManager} run build`, {
          stdio: options.watch ? 'inherit' : 'pipe',
          cwd: process.cwd(),
          shell: true
        });
      } else {
        if (buildScript) {
          spinner.warn('Build script runs "coherent build" — using the default pipeline to avoid recursion.');
          spinner.start();
        }

        // Default build process for Coherent.js projects
        spinner.text = 'Building with default configuration...';

        // Check for different build tools
        if (existsSync('vite.config.js') || existsSync('vite.config.ts')) {
          execSync('npx vite build', {
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd(),
            shell: true
          });
        } else if (existsSync('webpack.config.js')) {
          execSync('npx webpack --mode production', {
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd(),
            shell: true
          });
        } else if (existsSync('rollup.config.js')) {
          execSync('npx rollup -c', {
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd(),
            shell: true
          });
        } else {
          // Use esbuild as fallback
          spinner.text = 'Building with esbuild (fallback)...';
          execSync(ESBUILD_FALLBACK_COMMAND, {
            stdio: options.watch ? 'inherit' : 'pipe',
            cwd: process.cwd(),
            shell: true
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
            cwd: process.cwd(),
            shell: true
          });
        } catch {
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
        } catch {
          // Ignore size calculation errors
        }
      }

      console.log();
      console.log(picocolors.cyan('Next steps:'));
      console.log(picocolors.gray('  Deploy your dist/ directory to your hosting provider'));
      console.log(picocolors.gray(`  Or run: ${packageManager} run start (if available)`));
      console.log();

    } catch (error) {
      spinner.fail('Build failed');
      console.error(picocolors.red('❌ Build error:'));
      console.error(error.message);
      
      // Show helpful error messages
      if (error.message.includes('command not found')) {
        console.log();
        console.log(picocolors.yellow('💡 Try installing dependencies:'));
        console.log(picocolors.gray(`   ${packageManager} install`));
      }
      
      process.exit(1);
    }
  });