/**
 * Package Scaffolding Generator
 * Generates basic scaffolding for optional @coherent.js packages
 */

import { getCLIVersion } from '../utils/version.js';

// Get current CLI version automatically
const cliVersion = getCLIVersion();

/**
 * Generate @coherent.js/api scaffolding
 */
export function generateApiScaffolding() {
  const routes = `
import { createRouter } from '@coherent.js/api';

const router = createRouter();

// Business Logic
async function getUserById(id) {
  return { id, name: 'Example User', email: 'user@example.com' };
}

async function createUser(data) {
  return { id: 1, ...data };
}

// Router Definitions (for Express/Fastify/Koa usage).
// Handlers return plain data; the router serializes objects as JSON.
router.get('/users/:id', async (req) => {
  const id = Number(req.params.id);
  return getUserById(id);
});

router.post('/users', async (req) => {
  return createUser(req.body);
});

// Handler for GET /api/users/:id (Built-in Server)
export async function getUsersByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const result = await getUserById(id);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Handler for POST /api/users (Built-in Server)
export async function postUsersHandler(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const parsedBody = JSON.parse(body);
        const result = await createUser(parsedBody);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// For built-in HTTP server compatibility
export function setupRoutes() {
  return [
    {
      path: '/api/users/:id',
      method: 'GET',
      handler: getUsersByIdHandler
    },
    {
      path: '/api/users',
      method: 'POST',
      handler: postUsersHandler
    }
  ];
}

export default router;
`;

  return {
    'src/api/routes.js': routes,
    dependencies: {
      '@coherent.js/api': `^${cliVersion}`
    }
  };
}

/**
 * Generate @coherent.js/client scaffolding
 */
export function generateClientScaffolding() {
  const hydration = `
import { hydrate } from '@coherent.js/client';

// Hydrate interactive components on page load
document.addEventListener('DOMContentLoaded', () => {
  // Find all components marked for hydration
  const components = document.querySelectorAll('[data-hydrate]');

  components.forEach(async (element) => {
    const componentName = element.getAttribute('data-hydrate');

    try {
      // Dynamically import component
      const module = await import(\`/components/\${componentName}.js\`);
      const Component = module.default || module[componentName];

      // Hydrate component
      hydrate(element, Component);
    } catch (error) {
      console.error(\`Failed to hydrate component: \${componentName}\`, error);
    }
  });
});
`;

  const interactiveExample = `
/**
 * Example interactive component for client-side hydration
 */
export function InteractiveCounter(props = {}) {
  const { initialCount = 0 } = props;

  return {
    div: {
      'data-hydrate': 'InteractiveCounter',
      'data-count': initialCount,
      className: 'counter',
      children: [
        {
          button: {
            className: 'counter-button',
            'data-action': 'decrement',
            text: '-'
          }
        },
        {
          span: {
            className: 'counter-value',
            text: String(initialCount)
          }
        },
        {
          button: {
            className: 'counter-button',
            'data-action': 'increment',
            text: '+'
          }
        }
      ]
    }
  };
}

// Client-side hydration logic (safe to import on the server; only does
// anything when called with a DOM element in the browser)
export function hydrateCounter(element) {
  let count = parseInt(element.getAttribute('data-count') || '0');
  const valueSpan = element.querySelector('.counter-value');

  element.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="increment"]')) {
      count++;
      valueSpan.textContent = count;
    } else if (e.target.matches('[data-action="decrement"]')) {
      count--;
      valueSpan.textContent = count;
    }
  });
}
`;

  return {
    'public/js/hydration.js': hydration,
    'src/components/InteractiveCounter.js': interactiveExample,
    dependencies: {
      '@coherent.js/client': `^${cliVersion}`
    }
  };
}

/**
 * Generate @coherent.js/i18n scaffolding
 */
export function generateI18nScaffolding() {
  const config = `
import { readFileSync } from 'node:fs';
import { createTranslator } from '@coherent.js/i18n';

const loadLocale = (locale) =>
  JSON.parse(readFileSync(new URL(\`./locales/\${locale}.json\`, import.meta.url), 'utf8'));

export const translator = createTranslator({
  defaultLocale: 'en',
  fallbackLocale: 'en'
});

for (const locale of ['en', 'fr', 'es']) {
  translator.addTranslations(locale, loadLocale(locale));
}

// Usage:
//   translator.t('common.welcome')
//   translator.t('common.hello', { name: 'Ada' })
//   translator.setLocale('fr')
`;

  const enLocale = JSON.stringify({
    common: {
      welcome: 'Welcome',
      hello: 'Hello, {{name}}!',
      loading: 'Loading...'
    },
    nav: {
      home: 'Home',
      about: 'About',
      contact: 'Contact'
    }
  }, null, 2);

  const frLocale = JSON.stringify({
    common: {
      welcome: 'Bienvenue',
      hello: 'Bonjour, {{name}}!',
      loading: 'Chargement...'
    },
    nav: {
      home: 'Accueil',
      about: 'À propos',
      contact: 'Contact'
    }
  }, null, 2);

  const esLocale = JSON.stringify({
    common: {
      welcome: 'Bienvenido',
      hello: '¡Hola, {{name}}!',
      loading: 'Cargando...'
    },
    nav: {
      home: 'Inicio',
      about: 'Acerca de',
      contact: 'Contacto'
    }
  }, null, 2);

  return {
    'src/i18n/config.js': config,
    'src/i18n/locales/en.json': enLocale,
    'src/i18n/locales/fr.json': frLocale,
    'src/i18n/locales/es.json': esLocale,
    dependencies: {
      '@coherent.js/i18n': `^${cliVersion}`
    }
  };
}

/**
 * Generate @coherent.js/forms scaffolding
 */
export function generateFormsScaffolding() {
  const exampleForm = `
import { createFormBuilder } from '@coherent.js/forms';

export function ContactForm() {
  const form = createFormBuilder({
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'message', type: 'textarea', label: 'Message', required: true }
    ]
  });

  return form.buildForm({ submitText: 'Submit' });
}
`;

  return {
    'src/components/ContactForm.js': exampleForm,
    dependencies: {
      '@coherent.js/forms': `^${cliVersion}`
    }
  };
}

/**
 * Generate @coherent.js/devtools scaffolding
 */
export function generateDevtoolsScaffolding() {
  const config = `
import { inspect, createProfiler, createLogger } from '@coherent.js/devtools';

// Dev-time helpers — import these where useful during development.
export const profiler = createProfiler();
export const logger = createLogger();

/**
 * Log a component tree analysis to the console (development only).
 */
export function inspectComponent(component) {
  if (process.env.NODE_ENV !== 'production') {
    return inspect(component);
  }
}
`;

  return {
    'src/utils/devtools.js': config,
    dependencies: {
      '@coherent.js/devtools': `^${cliVersion}`
    }
  };
}

/**
 * Generate @coherent.js/seo scaffolding
 */
export function generateSeoScaffolding(projectName = 'My App') {
  const metaHelper = `
import { generateMeta, generateSitemap } from '@coherent.js/seo';

export function getPageMeta(page, data = {}) {
  const baseUrl = process.env.BASE_URL || 'https://example.com';

  const metaConfigs = {
    home: {
      title: 'Welcome to ${projectName}',
      description: 'A ${projectName} application built with Coherent.js',
      image: { url: \`\${baseUrl}/images/og-home.jpg\` },
      canonical: baseUrl
    },
    about: {
      title: 'About - ${projectName}',
      description: 'Learn more about ${projectName}',
      image: { url: \`\${baseUrl}/images/og-about.jpg\` },
      canonical: \`\${baseUrl}/about\`
    }
  };

  const config = metaConfigs[page] || metaConfigs.home;

  return generateMeta({
    ...config,
    siteName: '${projectName}',
    locale: 'en_US',
    ...data
  });
}

export function getSitemap() {
  return generateSitemap([
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/about', priority: 0.8, changefreq: 'weekly' },
    { url: '/contact', priority: 0.6, changefreq: 'monthly' }
  ]);
}
`;

  return {
    'src/utils/seo.js': metaHelper,
    dependencies: {
      '@coherent.js/seo': `^${cliVersion}`
    }
  };
}

/**
 * Generate @coherent.js/tooling/testing scaffolding
 */
export function generateTestingScaffolding() {
  const testHelper = `
import { renderComponent } from '@coherent.js/tooling/testing';
import { describe, it, expect } from 'vitest';

/**
 * Reusable smoke test for any component
 */
export function testComponent(Component, props = {}) {
  describe(Component.name || 'Component', () => {
    it('renders without errors', () => {
      const { html } = renderComponent(Component(props));
      expect(html).toBeTypeOf('string');
      expect(html.length).toBeGreaterThan(0);
    });
  });
}
`;

  const exampleTest = `
import { describe, it, expect } from 'vitest';
import { renderComponent } from '@coherent.js/tooling/testing';
import { HomePage } from '../../src/components/HomePage.js';

describe('HomePage', () => {
  it('should render the home page', () => {
    const { html } = renderComponent(HomePage({}));
    expect(html).toContain('Welcome');
  });

  it('should render with custom props', () => {
    const { html } = renderComponent(HomePage({ title: 'Custom Title' }));
    expect(html).toContain('Custom Title');
  });
});
`;

  return {
    'tests/helpers/testing.js': testHelper,
    'tests/components/HomePage.test.js': exampleTest,
    dependencies: {
      '@coherent.js/tooling': `^${cliVersion}`
    }
  };
}

/**
 * Get dependencies for a package
 */
export function getPackageDependencies(packageName) {
  const scaffolding = {
    api: generateApiScaffolding(),
    client: generateClientScaffolding(),
    i18n: generateI18nScaffolding(),
    forms: generateFormsScaffolding(),
    devtools: generateDevtoolsScaffolding(),
    seo: generateSeoScaffolding(),
    testing: generateTestingScaffolding()
  };

  return scaffolding[packageName]?.dependencies || {};
}

/**
 * Generate scaffolding for selected packages
 */
export function generatePackageScaffolding(packages, options = {}) {
  const { projectName = 'My App' } = options;
  const files = {};
  const dependencies = {};

  packages.forEach(pkg => {
    let scaffolding;

    switch (pkg) {
      case 'api':
        scaffolding = generateApiScaffolding();
        break;
      case 'client':
        scaffolding = generateClientScaffolding();
        break;
      case 'i18n':
        scaffolding = generateI18nScaffolding();
        break;
      case 'forms':
        scaffolding = generateFormsScaffolding();
        break;
      case 'devtools':
        scaffolding = generateDevtoolsScaffolding();
        break;
      case 'seo':
        scaffolding = generateSeoScaffolding(projectName);
        break;
      case 'testing':
        scaffolding = generateTestingScaffolding();
        break;
      default:
        return;
    }

    // Merge files and dependencies
    if (scaffolding) {
      Object.entries(scaffolding).forEach(([key, value]) => {
        if (key === 'dependencies') {
          Object.assign(dependencies, value);
        } else {
          files[key] = value;
        }
      });
    }
  });

  return { files, dependencies };
}
