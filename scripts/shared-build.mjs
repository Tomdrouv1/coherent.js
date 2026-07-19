import { build } from 'esbuild';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import process, { env } from 'node:process';
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
  minify: env.NODE_ENV === 'production',
  define: {
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
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
 * Locate the package.json owning an entry point, walking up from its
 * directory (entry points may be package-relative or repo-relative).
 */
function findNearestManifest(entryPoint) {
  let dir = path.resolve(path.dirname(entryPoint));
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'package.json');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return 'package.json';
}

/**
 * Build a package (ESM only — the published packages dropped their CJS
 * bundles for 1.0; node >=22.12 supports require(esm) natively).
 *
 * Pass `entries` ({ name: 'src/file.js', ... }) when the package's exports map
 * declares subpaths — every name is built to `<outDir>/<name>.js`.
 */
export async function buildPackage({
  packageName,
  entryPoint,
  entries,
  outDir = 'dist',
  external = [],
  additionalConfig = {}
}) {
  const manifest = JSON.parse(await readFile(findNearestManifest(entries ? Object.values(entries)[0] : entryPoint), 'utf-8'));
  const config = {
    ...commonConfig,
    external: [...commonConfig.external, ...external],
    ...additionalConfig
  };
  config.define = {
    ...config.define,
    __COHERENT_VERSION__: JSON.stringify(manifest.version)
  };

  console.log(`🏗️  Building ${packageName}...`);

  const entryMap = entries ?? { index: entryPoint };

  for (const [name, src] of Object.entries(entryMap)) {
    await build({
      ...config,
      entryPoints: [src],
      format: 'esm',
      outfile: `${outDir}/${name}.js`,
    });
  }

  console.log(`✅ Built ${packageName} successfully`);
}

/**
 * Generate TypeScript declarations for a package
 */
export async function generateDeclarations(packagePath) {
  return new Promise((resolve, reject) => {
    const tscProcess = spawn('tsc', ['--build', packagePath], {
      stdio: 'inherit',
      cwd: path.resolve('.')
    });

    tscProcess.on('close', (code) => {
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
  minify = env.NODE_ENV === 'production'
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
      'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
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
