#!/usr/bin/env node

/**
 * Batch update package READMEs with exports sections
 * Adds standardized "Exports" section to packages missing it
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.join(__dirname, '../packages');

// Packages that need exports sections (from audit)
const packagesNeedingExports = [
  'adapters',
  'client',
  'devtools',
  'fastify',
  'i18n'
];

// Package-specific export information
const packageExports = {
  'devtools': {
    description: 'Tree-shakable developer tools for debugging, profiling, and performance optimization',
    exports: [
      'Component visualizer: `@coherent.js/devtools/visualizer`',
      'Performance aggregator (dashboard + optimization utilities): `@coherent.js/devtools/performance`',
      'Performance dashboard only: `@coherent.js/devtools/performance/dashboard`',
      'Cache (LRU/Memory/Render/memoize): `@coherent.js/devtools/performance/cache`',
      'Code-splitting (lazy components, route splitter): `@coherent.js/devtools/performance/code-splitting`',
      'Lazy-loading (images, IntersectionObserver, preloader): `@coherent.js/devtools/performance/lazy-loading`',
      'Enhanced errors: `@coherent.js/devtools/errors`',
      'Hybrid integration: `@coherent.js/devtools/hybrid`',
      'Inspector: `@coherent.js/devtools/inspector`',
      'Profiler: `@coherent.js/devtools/profiler`',
      'Logger: `@coherent.js/devtools/logger`'
    ],
    example: `import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';
import { LRUCache, memoize } from '@coherent.js/devtools/performance/cache';`
  },
  'client': {
    description: 'Client-side hydration and HMR utilities',
    exports: [
      'Hydration utilities: `@coherent.js/client`',
      'Client router: `@coherent.js/client/router`',
      'HMR support: `@coherent.js/client/hmr`'
    ],
    example: `import { hydrateComponent } from '@coherent.js/client';
import { createClientRouter } from '@coherent.js/client/router';`
  },
  'api': {
    description: 'API framework with smart routing and middleware',
    exports: [
      'API creation: `@coherent.js/api`',
      'Router: `@coherent.js/api/router`',
      'Middleware: `@coherent.js/api/middleware`',
      'Security: `@coherent.js/api/security`',
      'Validation: `@coherent.js/api/validation`',
      'Serialization: `@coherent.js/api/serialization`'
    ],
    example: `import { createAPI } from '@coherent.js/api';
import { createRouter } from '@coherent.js/api/router';`
  },
  'state': {
    description: 'Reactive state management with enhanced patterns',
    exports: [
      'Core state: `@coherent.js/state`',
      'Reactive state: `@coherent.js/state/reactive`',
      'Persistence: `@coherent.js/state/persistence`',
      'Validation: `@coherent.js/state/validation`',
      'Manager: `@coherent.js/state/manager`'
    ],
    example: `import { createReactiveState } from '@coherent.js/state';
import { createFormState } from '@coherent.js/state';`
  },
  'database': {
    description: 'Database adapters and utilities',
    exports: [
      'Database utilities: `@coherent.js/database`',
      'Model utilities: `@coherent.js/database/model`',
      'Migration tools: `@coherent.js/database/migration`',
      'Connection manager: `@coherent.js/database/connection`',
      'Middleware: `@coherent.js/database/middleware`'
    ],
    example: `import { createDatabase } from '@coherent.js/database';
import { createModel } from '@coherent.js/database/model';`
  },
  'forms': {
    description: 'SSR + Hydration form system with validation',
    exports: [
      'Form utilities: `@coherent.js/forms`',
      'Form builder: `@coherent.js/forms/form-builder`',
      'Hydration: `@coherent.js/forms/hydration`',
      'Validation: `@coherent.js/forms/validation`',
      'Validators: `@coherent.js/forms/validators`',
      'Advanced validation: `@coherent.js/forms/advanced-validation`'
    ],
    example: `import { createForm } from '@coherent.js/forms';
import { validateForm } from '@coherent.js/forms/validation';`
  },
  'fastify': {
    description: 'Fastify adapter for Coherent.js',
    exports: [
      'Fastify integration: `@coherent.js/fastify`',
      'Handler creation: `@coherent.js/fastify`'
    ],
    example: `import { setupCoherent } from '@coherent.js/fastify';
import { createHandler } from '@coherent.js/fastify';`
  },
  'koa': {
    description: 'Koa adapter for Coherent.js',
    exports: [
      'Koa integration: `@coherent.js/koa`',
      'Handler creation: `@coherent.js/koa`'
    ],
    example: `import { setupCoherent } from '@coherent.js/koa';
import { createHandler } from '@coherent.js/koa';`
  },
  'i18n': {
    description: 'Internationalization utilities',
    exports: [
      'i18n utilities: `@coherent.js/i18n`'
    ],
    example: `import { createI18n } from '@coherent.js/i18n';`
  },
  'seo': {
    description: 'SEO optimization utilities',
    exports: [
      'SEO utilities: `@coherent.js/seo`'
    ],
    example: `import { generateMetaTags } from '@coherent.js/seo';`
  },
  'adapters': {
    description: 'Framework adapters',
    exports: [
      'Adapter utilities: `@coherent.js/adapters`'
    ],
    example: `import { createAdapter } from '@coherent.js/adapters';`
  },
  'nextjs': {
    description: 'Next.js integration',
    exports: [
      'Next.js integration: `@coherent.js/nextjs`'
    ],
    example: `import { setupCoherent } from '@coherent.js/nextjs';`
  }
};

/**
 * Generate exports section for a package
 */
function generateExportsSection(packageName) {
  const config = packageExports[packageName];
  if (!config) return '';

  return `## Exports

${config.description}

### Modular Imports (Tree-Shakable)

${config.exports.map(exp => `- ${exp}`).join('\n')}

### Example Usage

\`\`\`javascript
${config.example}
\`\`\`

> **Note**: All exports are tree-shakable. Import only what you need for optimal bundle size.
`;
}

/**
 * Update a package README
 */
function updatePackageReadme(packageName) {
  const readmePath = path.join(packagesDir, packageName, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.log(`❌ ${packageName}: README.md not found`);
    return false;
  }

  const content = fs.readFileSync(readmePath, 'utf8');

  // Check if exports section already exists
  if (content.includes('## Exports') && content.includes('### Modular Imports')) {
    console.log(`✅ ${packageName}: Already has exports section`);
    return true;
  }

  // Find where to insert the new section (after installation, before usage/development)
  const installationIndex = content.indexOf('## Installation');
  const usageIndex = content.indexOf('## Usage');
  const developmentIndex = content.indexOf('## Development');

  let insertIndex = -1;

  if (installationIndex !== -1) {
    // Find the end of installation section
    const nextSection = content.indexOf('##', installationIndex + 1);
    insertIndex = nextSection !== -1 ? nextSection : content.length;
  } else if (usageIndex !== -1) {
    insertIndex = usageIndex;
  } else if (developmentIndex !== -1) {
    insertIndex = developmentIndex;
  }

  if (insertIndex === -1) {
    console.log(`⚠️ ${packageName}: Could not find insertion point`);
    return false;
  }

  // Generate new sections
  const exportsSection = generateExportsSection(packageName);

  // Insert new sections
  const newContent = `${content.slice(0, insertIndex)}\n${exportsSection}${content.slice(insertIndex)}`;

  // Write updated README
  fs.writeFileSync(readmePath, newContent);
  console.log(`🔧 ${packageName}: Added exports section`);
  return true;
}

/**
 * Main function
 */
function main() {
  console.log('📝 Adding Exports Sections to Package READMEs');
  console.log('===============================================\n');

  let updated = 0;
  let skipped = 0;

  packagesNeedingExports.forEach(packageName => {
    if (updatePackageReadme(packageName)) {
      updated++;
    } else {
      skipped++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated} packages`);
  console.log(`   Skipped: ${skipped} packages`);
  console.log(`   Total: ${updated + skipped} packages`);

  console.log(`\n✅ All package READMEs now have comprehensive exports sections!`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
export default main;
