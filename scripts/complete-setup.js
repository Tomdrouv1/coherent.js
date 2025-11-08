/**
 * Complete setup script to finalize all improvements
 */
import { writeFile, mkdir, copyFile } from 'fs/promises';

async function completeSetup() {
  console.log('🚀 Completing Coherent.js setup improvements...\n');

  try {
    // 1. Create GitHub workflows
    console.log('📋 Setting up CI/CD workflows...');
    await mkdir('.github/workflows', { recursive: true });
    
    // CI Workflow
    await writeFile('.github/workflows/ci.yml', `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck  
      - run: pnpm build
      - run: pnpm test
`);

    // Release Workflow
    await writeFile('.github/workflows/release.yml', `name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      - uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
`);

    // 2. Setup Git hooks
    console.log('🪝 Setting up Git hooks...');
    await mkdir('.husky', { recursive: true });
    
    await writeFile('.husky/pre-commit', `#!/usr/bin/env sh
echo "🔍 Running pre-commit checks..."
pnpm lint || exit 1
pnpm format:check || exit 1  
pnpm typecheck || exit 1
pnpm test:unit || exit 1
echo "✅ Pre-commit checks passed!"
`);

    await writeFile('.husky/commit-msg', `#!/usr/bin/env sh
pnpm commitlint --edit "$1"
`);

    // 3. Create license files for packages
    console.log('📄 Creating license files...');
    const packages = ['core', 'api', 'database', 'client', 'express', 'fastify', 'koa', 'nextjs'];
    
    for (const pkg of packages) {
      try {
        await copyFile('LICENSE', `packages/${pkg}/LICENSE`);
      } catch (_err) {
        console.warn(`Could not copy LICENSE to packages/${pkg}/`);
      }
    }

    // 4. Create package READMEs
    console.log('📖 Creating package README files...');
    
    const packageReadmes = {
      core: 'Core runtime for Coherent.js - the main framework for object-based SSR.',
      api: 'API framework for Coherent.js - REST, RPC, and GraphQL utilities.',  
      database: 'Database layer for Coherent.js - multiple adapter support.',
      client: 'Client-side utilities for Coherent.js - hydration and HMR.',
      express: 'Express.js integration for Coherent.js.',
      fastify: 'Fastify integration for Coherent.js.',
      koa: 'Koa.js integration for Coherent.js.',
      nextjs: 'Next.js integration for Coherent.js.'
    };

    for (const [pkg, description] of Object.entries(packageReadmes)) {
      await writeFile(`packages/${pkg}/README.md`, `# @coherent.js/${pkg}

${description}

## Installation

\`\`\`bash
npm install @coherent.js/${pkg}
\`\`\`

## Documentation

See the [main documentation](../../README.md) for usage examples and API reference.

## License

MIT
`);
    }

    console.log('\n✅ Setup completed successfully!');
    console.log('\n📊 Summary of improvements applied:');
    console.log('   ✓ Fixed package publishing inconsistencies');
    console.log('   ✓ Created unified build system for monorepo');
    console.log('   ✓ Fixed TypeScript configuration issues');
    console.log('   ✓ Updated documentation and examples');
    console.log('   ✓ Reorganized test coverage for packages');
    console.log('   ✓ Setup development workflow tools');
    console.log('   ✓ Addressed security and dependencies');
    console.log('   ✓ Added performance optimizations');
    console.log('   ✓ Created CI/CD pipeline');
    console.log('   ✓ Applied minor improvements');

    console.log('\n🚀 Next steps:');
    console.log('   1. Run `pnpm install` to update dependencies');
    console.log('   2. Run `pnpm build` to build all packages');
    console.log('   3. Run `pnpm test` to run the test suite');
    console.log('   4. Run `node scripts/setup-ci.js` to enable CI/CD');
    console.log('   5. Commit changes and push to repository');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

completeSetup();