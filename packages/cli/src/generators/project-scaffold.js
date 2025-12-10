/**
 * Project scaffolding generator
 */

import { writeFileSync, mkdirSync, copyFileSync, constants, readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { getCLIVersion } from '../utils/version.js';
import { generateServerFile, getRuntimeDependencies } from './runtime-scaffold.js';
import { generateDatabaseScaffolding } from './database-scaffold.js';
import { generateAuthScaffolding } from './auth-scaffold.js';
import { generateDockerScaffolding, generateHealthCheck } from './docker-scaffold.js';
import { generatePackageScaffolding } from './package-scaffold.js';
import { generateTsConfig, generateJsConfig, getTypeScriptDependencies } from './typescript-config.js';

// Get current CLI version automatically
const cliVersion = getCLIVersion();

/**
 * Scaffold a new Coherent.js project
 */
export async function scaffoldProject(projectPath, options) {
  const {
    name,
    template,
    skipInstall,
    skipGit,
    runtime = 'built-in',
    database = null,
    auth = null,
    packages = [],
    language = 'javascript',
    packageManager = 'npm'
  } = options;

  const isTypeScript = language === 'typescript';
  const fileExtension = isTypeScript ? '.ts' : '.js';

  // Create directory structure
  const dirs = [
    'src',
    'src/components',
    'src/pages',
    'src/utils',
    'public',
    'tests'
  ];

  // Add directories based on selections
  if (packages.includes('api') || auth) {
    dirs.push('src/api');
  }
  if (database) {
    dirs.push('src/db', 'src/db/models', 'data');
  }
  if (auth) {
    if (runtime === 'fastify') {
      dirs.push('src/plugins');
    } else {
      // For built-in, express, and koa
      dirs.push('src/middleware');
    }
  }
  if (packages.includes('i18n')) {
    dirs.push('src/i18n', 'src/i18n/locales');
  }

  dirs.forEach(dir => {
    mkdirSync(join(projectPath, dir), { recursive: true });
  });

  // Generate package.json
  const packageJson = generatePackageJson(name, { template, runtime, database, auth, packages, language, packageManager });
  writeFileSync(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Generate TypeScript or JavaScript config
  if (isTypeScript) {
    const tsConfig = generateTsConfig();
    writeFileSync(join(projectPath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
  } else {
    const jsConfig = generateJsConfig();
    writeFileSync(join(projectPath, 'jsconfig.json'), JSON.stringify(jsConfig, null, 2));
  }

  // Generate main server file
  const serverContent = generateServerFile(runtime, {
    port: 3000,
    hasApi: packages.includes('api') || auth,
    hasDatabase: !!database,
    hasAuth: !!auth
  });
  writeFileSync(join(projectPath, `src/index${fileExtension}`), serverContent);

  // Generate HomePage component
  await generateHomePageComponent(projectPath, name, isTypeScript, fileExtension);

  // Generate database scaffolding
  if (database) {
    const dbScaffolding = generateDatabaseScaffolding(database, language);
    writeFileSync(join(projectPath, `src/db/config${fileExtension}`), dbScaffolding.config);
    writeFileSync(join(projectPath, `src/db/index${fileExtension}`), dbScaffolding.init);
    writeFileSync(join(projectPath, `src/db/models/User${fileExtension}`), dbScaffolding.model);

    // Generate Docker configuration if requested
    if (options.dockerConfig && database !== 'sqlite') {
      const dockerScaffolding = generateDockerScaffolding(database, options.dockerConfig);

      // Write Docker files
      writeFileSync(join(projectPath, 'docker-compose.yml'), dockerScaffolding['docker-compose.yml']);
      writeFileSync(join(projectPath, 'Dockerfile'), dockerScaffolding['Dockerfile']);
      writeFileSync(join(projectPath, '.dockerignore'), dockerScaffolding['.dockerignore']);

      // Generate health check script
      writeFileSync(join(projectPath, `healthcheck${fileExtension}`), generateHealthCheck());

      // Update .env.example with Docker configuration
      let envContent = '';
      for (const [key, value] of Object.entries(dockerScaffolding.envConfig)) {
        envContent += `${key}=${value}\n`;
      }
      writeFileSync(join(projectPath, '.env.example'), envContent);
    } else {
      // Generate or update .env.example without Docker
      const existingEnv = '';
      writeFileSync(join(projectPath, '.env.example'), existingEnv + dbScaffolding.env);
    }

    // Create .env from .env.example if it doesn't exist
    try {
      copyFileSync(join(projectPath, '.env.example'), join(projectPath, '.env'), constants.COPYFILE_EXCL);
    } catch {
      // Ignore if .env already exists
    }
  }

  // Generate auth scaffolding
  if (auth) {
    const authScaffolding = generateAuthScaffolding(auth, runtime);

    // Write auth middleware/plugin
    const authDir = runtime === 'fastify' ? 'plugins' : 'middleware';
    writeFileSync(join(projectPath, `src/${authDir}/auth${fileExtension}`), authScaffolding.middleware);

    // Write auth routes
    writeFileSync(join(projectPath, `src/api/auth${fileExtension}`), authScaffolding.routes);

    // Append to .env.example
    const envPath = join(projectPath, '.env.example');
    const existingEnv = '';
    writeFileSync(envPath, existingEnv + authScaffolding.env);

    // Update .env if it exists
    try {
      const envContent = readFileSync(join(projectPath, '.env'), 'utf8');
      if (!envContent.includes('JWT_SECRET') && !envContent.includes('SESSION_SECRET')) {
        appendFileSync(join(projectPath, '.env'), authScaffolding.env);
      }
    } catch {
      // .env might not exist if database wasn't selected first, create it
      writeFileSync(join(projectPath, '.env'), authScaffolding.env);
    }
  }

  // Generate optional package scaffolding
  if (packages.length > 0) {
    const { files } = generatePackageScaffolding(packages);

    Object.entries(files).forEach(([filePath, content]) => {
      const fullPath = join(projectPath, filePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
    });
  }

  // Generate common files
  generateCommonFiles(projectPath, name);

  // Install dependencies
  if (!skipInstall) {
    console.log(`📦 Installing dependencies with ${packageManager}...`);
    try {
      const installCommands = {
        npm: 'npm install',
        yarn: 'yarn install',
        pnpm: 'pnpm install'
      };

      const installCmd = installCommands[packageManager] || 'npm install';

      execSync(installCmd, {
        cwd: projectPath,
        stdio: 'inherit'
      });
    } catch {
      console.warn(`⚠️  Failed to install dependencies with ${packageManager}`);
    }
  }

  // Initialize git
  if (!skipGit) {
    try {
      execSync('git init', { cwd: projectPath, stdio: 'pipe' });
      execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'pipe' });
    } catch {
      console.warn('⚠️  Failed to initialize git repository');
    }
  }
}

/**
 * Generate package.json based on options
 */
function generatePackageJson(name, options) {
  const { runtime = 'built-in', database = null, auth = null, packages = [], language = 'javascript', packageManager = 'npm' } = options;

  const isTypeScript = language === 'typescript';
  const fileExt = isTypeScript ? '.ts' : '.js';

  const base = {
    name,
    version: '1.0.0',
    description: 'A Coherent.js application',
    type: 'module',
    main: isTypeScript ? 'dist/index.js' : `src/index${fileExt}`,
    scripts: isTypeScript ? {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      typecheck: 'tsc --noEmit',
      test: 'tsx tests/*.test.ts'
    } : {
      dev: 'node src/index.js',
      build: 'coherent build',
      start: 'node src/index.js',
      test: 'node --test tests/*.test.js'
    },
    dependencies: {
      '@coherent.js/core': `^${cliVersion}`
    },
    devDependencies: {
      '@coherent.js/cli': `^${cliVersion}`
    }
  };

  // Add TypeScript dependencies
  if (isTypeScript) {
    const tsDeps = getTypeScriptDependencies();
    Object.assign(base.devDependencies, tsDeps);
    base.devDependencies.tsx = '^4.19.2'; // For running TypeScript files directly

    // Add @types for auth packages if auth is enabled
    if (auth) {
      base.devDependencies['@types/jsonwebtoken'] = '^9.0.7';
    }
  }

  // Add packageManager field (Corepack standard)
  if (packageManager === 'pnpm') {
    base.packageManager = 'pnpm@9.0.0';
  } else if (packageManager === 'yarn') {
    base.packageManager = 'yarn@4.0.0';
  }

  // Runtime dependencies
  const runtimeDeps = getRuntimeDependencies(runtime);
  Object.assign(base.dependencies, runtimeDeps);

  // Database dependencies
  if (database) {
    const { dependencies: dbDeps } = generateDatabaseScaffolding(database, language);
    Object.assign(base.dependencies, dbDeps);
  }

  // Auth dependencies
  if (auth) {
    const { dependencies: authDeps } = generateAuthScaffolding(auth, runtime);
    Object.assign(base.dependencies, authDeps);
  }

  // Optional package dependencies
  if (packages.length > 0) {
    const { dependencies: pkgDeps } = generatePackageScaffolding(packages);
    Object.assign(base.dependencies, pkgDeps);
  }

  return base;
}

/**
 * Generate HomePage component
 */
async function generateHomePageComponent(projectPath, name, isTypeScript, fileExtension) {
  const homePage = isTypeScript ? `/**
 * HomePage Component
 */
interface HomePageProps {
  title?: string;
}

export function HomePage(props: HomePageProps = {}): object {
  const { title = 'Welcome to ${name}!' } = props;

  return {
    div: {
      className: 'container',
      children: [
        { h1: { text: title } },
        {
          p: {
            text: 'This is a Coherent.js application built with pure JavaScript objects.'
          }
        },
        {
          div: {
            className: 'features',
            children: [
              { h2: { text: 'Features:' } },
              {
                ul: {
                  children: [
                    { li: { text: '⚡ Lightning fast SSR' } },
                    { li: { text: '🎯 Pure JavaScript objects' } },
                    { li: { text: '🔒 Built-in XSS protection' } },
                    { li: { text: '📦 Minimal bundle size' } },
                    { li: { text: '📘 TypeScript support' } }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
}
` : `/**
 * HomePage Component
 */
export function HomePage(props = {}) {
  const { title = 'Welcome to ${name}!' } = props;

  return {
    div: {
      className: 'container',
      children: [
        { h1: { text: title } },
        {
          p: {
            text: 'This is a Coherent.js application built with pure JavaScript objects.'
          }
        },
        {
          div: {
            className: 'features',
            children: [
              { h2: { text: 'Features:' } },
              {
                ul: {
                  children: [
                    { li: { text: '⚡ Lightning fast SSR' } },
                    { li: { text: '🎯 Pure JavaScript objects' } },
                    { li: { text: '🔒 Built-in XSS protection' } },
                    { li: { text: '📦 Minimal bundle size' } }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
}
`;

  writeFileSync(join(projectPath, `src/components/HomePage${fileExtension}`), homePage);

  // Simple Button component example
  const buttonComponent = isTypeScript ? `/**
 * Button Component
 */
interface ButtonProps {
  text?: string;
  onClick?: () => void;
  className?: string;
}

export function Button(props: ButtonProps = {}): object {
  const { text = 'Click me', onClick, className = '' } = props;

  return {
    button: {
      className: \`btn \${className}\`,
      onclick: onClick,
      text
    }
  };
}
` : `/**
 * Button Component
 */
export function Button(props = {}) {
  const { text = 'Click me', onClick, className = '' } = props;

  return {
    button: {
      className: \`btn \${className}\`,
      onclick: onClick,
      text
    }
  };
}
`;

  writeFileSync(join(projectPath, `src/components/Button${fileExtension}`), buttonComponent);
}

/**
 * Generate common files (README, gitignore, etc.)
 */
function generateCommonFiles(projectPath, name) {
  // README.md
  const readme = `# ${name}

A Coherent.js application built with pure JavaScript objects.

## Getting Started

\`\`\`bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm test
\`\`\`

## Project Structure

\`\`\`
src/
  components/     # Reusable components
  pages/         # Page components
  api/           # API routes
  utils/         # Utility functions
  index.js       # Main entry point
public/          # Static assets
tests/           # Test files
\`\`\`

## Learn More

- [Coherent.js Documentation](https://github.com/Tomdrouv1/coherent.js)
- [API Reference](https://github.com/Tomdrouv1/coherent.js/tree/main/docs/api-reference.md)

## License

MIT
`;

  writeFileSync(join(projectPath, 'README.md'), readme);

  // .gitignore
  const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-_error.log*

# Production builds
dist/
build/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history
`;

  writeFileSync(join(projectPath, '.gitignore'), gitignore);

  // Basic test file
  const testFile = `import { describe, it, expect } from 'vitest';
import { render } from '@coherent.js/core';

describe('Basic Component Rendering', () => {
  it('renders basic component', () => {
    const component = {
      div: {
        text: 'Hello, World!'
      }
    };

    const html = render(component);
    expect(html).toContain('Hello, World!');
  });
});`;

  writeFileSync(join(projectPath, 'tests/basic.test.js'), testFile);
}
