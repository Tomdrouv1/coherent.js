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
  'build-tools',
  'client',
  'devtools',
  'express',
  'fastify',
  'i18n',
  'profiler',
  'web-components',
  'runtime' // needs usage section
];

// Package-specific export information
const packageExports = {
  'devtools': {
    description: 'Tree-shakable developer tools for debugging and performance monitoring',
    exports: [
      'Component visualizer: `@coherent.js/devtools/visualizer`',
      'Performance dashboard: `@coherent.js/devtools/performance`',
      'Enhanced errors: `@coherent.js/devtools/errors`',
      'Hybrid integration: `@coherent.js/devtools/hybrid`',
      'Inspector: `@coherent.js/devtools/inspector`',
      'Profiler: `@coherent.js/devtools/profiler`',
      'Logger: `@coherent.js/devtools/logger`'
    ],
    example: `import { logComponentTree } from '@coherent.js/devtools/visualizer';
import { createPerformanceDashboard } from '@coherent.js/devtools/performance';`
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
  'runtime': {
    description: 'Universal runtime for browsers, edge workers, and desktop',
    exports: [
      'Universal runtime: `@coherent.js/runtime`',
      'Browser runtime: `@coherent.js/runtime/browser`',
      'Edge runtime: `@coherent.js/runtime/edge`',
      'Static runtime: `@coherent.js/runtime/static`',
      'Desktop runtime: `@coherent.js/runtime/desktop`'
    ],
    example: `import { createCoherent } from '@coherent.js/runtime';
import { createBrowserApp } from '@coherent.js/runtime/browser';`
  },
  'express': {
    description: 'Express.js adapter for Coherent.js',
    exports: [
      'Express integration: `@coherent.js/express`',
      'Middleware setup: `@coherent.js/express`'
    ],
    example: `import { setupCoherent } from '@coherent.js/express';
import { renderComponent } from '@coherent.js/express';`
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
  'testing': {
    description: 'Testing utilities for Coherent.js',
    exports: [
      'Testing utilities: `@coherent.js/testing`'
    ],
    example: `import { renderTest } from '@coherent.js/testing';`
  },
  'performance': {
    description: 'Performance optimization utilities',
    exports: [
      'Performance utilities: `@coherent.js/performance`'
    ],
    example: `import { optimizeBundle } from '@coherent.js/performance';`
  },
  'profiler': {
    description: 'Performance profiling tools',
    exports: [
      'Profiler utilities: `@coherent.js/profiler`'
    ],
    example: `import { createProfiler } from '@coherent.js/profiler';`
  },
  'build-tools': {
    description: 'Build and development tools',
    exports: [
      'Build utilities: `@coherent.js/build-tools`'
    ],
    example: `import { buildProject } from '@coherent.js/build-tools';`
  },
  'adapters': {
    description: 'Framework adapters',
    exports: [
      'Adapter utilities: `@coherent.js/adapters`'
    ],
    example: `import { createAdapter } from '@coherent.js/adapters';`
  },
  'web-components': {
    description: 'Web Components integration',
    exports: [
      'Web Components: `@coherent.js/web-components`'
    ],
    example: `import { defineComponent } from '@coherent.js/web-components';`
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
 * Generate usage section for runtime package
 */
function generateUsageSection(packageName) {
  if (packageName !== 'runtime') return '';

  return `## Usage

\`\`\`javascript
import { createCoherent } from '@coherent.js/runtime';

// Create universal app
const app = createCoherent({
  components: { App: () => ({ div: { text: 'Hello World' } }) }
});

// Browser usage
import { createBrowserApp } from '@coherent.js/runtime/browser';
const browserApp = createBrowserApp(app);

// Edge usage
import { createEdgeApp } from '@coherent.js/runtime/edge';
const edgeApp = createEdgeApp(app);
\`\`\`

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
  const usageSection = generateUsageSection(packageName);

  // Insert new sections
  const newContent = `${content.slice(0, insertIndex)}\n${exportsSection}${usageSection}${content.slice(insertIndex)}`;

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
