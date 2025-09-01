import { build } from 'esbuild';
import { readFile, writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Shared build configuration for all packages
 */
export const commonConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  treeShaking: true,
  minify: process.env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  external: [
    // Common externals that should not be bundled
    'express',
    'fastify',
    'koa',
    'next',
    'react',
    'react-dom',
    'sqlite3',
    'mysql2',
    'pg',
    'mongodb',
  ],
};

/**
 * Build a package with both ESM and CJS formats
 */
export async function buildPackage({ 
  packageName, 
  entryPoint, 
  outDir = 'dist',
  external = [],
  additionalConfig = {},
  formats = ['esm', 'cjs'] // Allow specifying which formats to build
}) {
  const config = {
    ...commonConfig,
    external: [...commonConfig.external, ...external],
    ...additionalConfig
  };

  console.log(`🏗️  Building ${packageName}...`);

  // Build ESM version
  if (formats.includes('esm')) {
    await build({
      ...config,
      entryPoints: [entryPoint],
      format: 'esm',
      outfile: `${outDir}/index.js`,
    });
  }

  // Build CJS version (only for Node.js packages)
  if (formats.includes('cjs')) {
    await build({
      ...config,
      entryPoints: [entryPoint],
      format: 'cjs',
      outfile: `${outDir}/index.cjs`,
    });
  }

  console.log(`✅ Built ${packageName} successfully`);
}

/**
 * Generate TypeScript declarations for a package
 */
export async function generateDeclarations(packagePath) {
  return new Promise((resolve, reject) => {
    const process = spawn('tsc', ['--build', packagePath], {
      stdio: 'inherit',
      cwd: path.resolve('.')
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Generated TypeScript declarations for ${packagePath}`);
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });
}

/**
 * Build browser package with different configuration
 */
export async function buildBrowserPackage({
  packageName,
  entryPoint,
  outDir = 'dist',
  minify = process.env.NODE_ENV === 'production'
}) {
  console.log(`🏗️  Building browser package ${packageName}...`);

  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify,
    treeShaking: true,
    format: 'esm',
    outfile: `${outDir}/index.js`,
    metafile: true,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  });

  // Log bundle size info
  if (result.metafile) {
    const outputs = Object.entries(result.metafile.outputs);
    const mainOutput = outputs.find(([path]) => path.endsWith('index.js'));
    if (mainOutput) {
      const sizeKB = Math.round(mainOutput[1].bytes / 1024 * 100) / 100;
      console.log(`  📏 Bundle size: ${sizeKB}KB`);
    }
  }

  console.log(`✅ Built browser package ${packageName} successfully`);
}

/**
 * Generate package.json for built packages with correct exports
 */
export async function generatePackageExports(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
  
  // Ensure consistent exports configuration
  packageJson.exports = {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  };
  
  // Ensure files array includes dist
  if (!packageJson.files) {
    packageJson.files = [];
  }
  if (!packageJson.files.includes('dist/')) {
    packageJson.files.unshift('dist/');
  }
  
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

/**
 * Build all packages in dependency order
 */
export async function buildAll() {
  const buildOrder = [
    'core',
    'api', 
    'database',
    'client',
    'express',
    'fastify', 
    'koa',
    'nextjs'
  ];

  // First pass: Build JavaScript bundles
  for (const pkg of buildOrder) {
    try {
      const packagePath = `packages/${pkg}`;
      const entryPoint = `${packagePath}/${getEntryPoint(pkg)}`;
      
      if (pkg === 'client') {
        await buildBrowserPackage({
          packageName: `@coherentjs/${pkg}`,
          entryPoint: entryPoint,
          outDir: `${packagePath}/dist`
        });
      } else {
        await buildPackage({
          packageName: `@coherentjs/${pkg}`,
          entryPoint: entryPoint,
          outDir: `${packagePath}/dist`,
          external: getPackageExternals(pkg)
        });
      }
      
      await generatePackageExports(packagePath);
    } catch (error) {
      console.error(`❌ Failed to build ${pkg}:`, error);
      process.exit(1);
    }
  }

  // Second pass: Generate TypeScript declarations
  console.log('🔧 Generating TypeScript declarations...');
  try {
    await generateDeclarations('.');
  } catch (error) {
    console.warn('⚠️  TypeScript declaration generation failed:', error.message);
    console.log('📝 Continuing without type declarations...');
  }

  console.log('🎉 All packages built successfully!');
}

/**
 * Get entry point for each package
 */
function getEntryPoint(packageName) {
  const entryPoints = {
    'core': 'src/index.js',
    'api': 'src/index.js',
    'database': 'src/index.js', 
    'client': 'src/hydration.js',
    'express': 'src/index.js',
    'fastify': 'src/index.js',
    'koa': 'src/index.js',
    'nextjs': 'src/index.js'
  };
  
  return entryPoints[packageName] || `src/index.js`;
}

/**
 * Get package-specific externals
 */
function getPackageExternals(packageName) {
  const externals = {
    'core': [],
    'api': ['@coherentjs/core'],
    'database': ['@coherentjs/core'],
    'client': ['@coherentjs/core'],
    'express': ['@coherentjs/core'],
    'fastify': ['@coherentjs/core'],
    'koa': ['@coherentjs/core'],
    'nextjs': ['@coherentjs/core']
  };
  
  return externals[packageName] || [];
}

// If run directly, build all packages
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch(console.error);
}