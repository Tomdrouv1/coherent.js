/**
 * Build script for @coherentjs/cli package
 */

import esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure dist directory exists
const distDir = join(__dirname, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Read package.json for version and dependencies
const packageJsonPath = join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const buildConfig = {
  entryPoints: [join(__dirname, 'src/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: [
    // Node.js built-ins
    'fs', 'path', 'url', 'child_process', 'os', 'util', 'stream', 'events',
    // Dependencies that should remain external
    'commander', 'inquirer', 'chalk', 'ora', 'fs-extra', 'picocolors', 'prompts'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
};

async function build() {
  console.log('🏗️  Building @coherentjs/cli...');

  try {
    // Build ESM version
    await esbuild.build({
      ...buildConfig,
      outfile: join(distDir, 'index.js'),
      format: 'esm'
    });

    // Copy TypeScript declarations if they exist
    const dtsPath = join(__dirname, 'src/index.d.ts');
    if (existsSync(dtsPath)) {
      const dtsContent = readFileSync(dtsPath, 'utf-8');
      writeFileSync(join(distDir, 'index.d.ts'), dtsContent);
    } else {
      // Generate basic TypeScript declarations
      const dtsContent = `/**
 * @coherentjs/cli TypeScript definitions
 */

export interface CreateOptions {
  template?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
}

export interface GenerateOptions {
  path?: string;
  template?: string;
  skipTest?: boolean;
  skipStory?: boolean;
}

export declare function createCLI(): Promise<void>;
export declare const createCommand: any;
export declare const generateCommand: any;
export declare const buildCommand: any;
export declare const devCommand: any;
`;
      writeFileSync(join(distDir, 'index.d.ts'), dtsContent);
    }

    console.log('✅ Build completed successfully!');
    console.log(`📦 Built files:`);
    console.log(`   - dist/index.js (ESM)`);
    console.log(`   - dist/index.d.ts (TypeScript definitions)`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run build
build();