/**
 * Package Scaffolding Generator
 * Generates basic scaffolding for optional @coherentjs packages
 */

/**
 * Generate @coherentjs/api scaffolding
 */
export function generateApiScaffolding() {
  const routes = `
import { createRouter } from '@coherentjs/api';

const router = createRouter();

// Example route with validation
router.get('/users/:id', {
  params: {
    id: { type: 'number', required: true }
  },
  handler: async (req, res) => {
    const { id } = req.params;
    // Fetch user logic here
    return { id, name: 'Example User', email: 'user@example.com' };
  }
});

// Example POST route with body validation
router.post('/users', {
  body: {
    name: { type: 'string', required: true, minLength: 2 },
    email: { type: 'string', required: true, pattern: /^[^@]+@[^@]+\\.[^@]+$/ }
  },
  handler: async (req, res) => {
    const { name, email } = req.body;
    // Create user logic here
    return { id: 1, name, email };
  }
});

export default router;
`;

  return {
    'src/api/routes.js': routes,
    dependencies: {
      '@coherentjs/api': '^1.0.0'
    }
  };
}

/**
 * Generate @coherentjs/client scaffolding
 */
export function generateClientScaffolding() {
  const hydration = `
import { hydrate } from '@coherentjs/client';

// Hydrate interactive components on page load
document.addEventListener('DOMContentLoaded', () => {
  // Find all components marked for hydration
  const components = document.querySelectorAll('[data-hydrate]');

  components.forEach(async (element) => {
    const componentName = element.getAttribute('data-hydrate');

    try {
      // Dynamically import component
      const module = await import(\`../components/\${componentName}.js\`);
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

// Client-side hydration logic
if (typeof window !== 'undefined') {
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
}
`;

  return {
    'public/js/hydration.js': hydration,
    'src/components/InteractiveCounter.js': interactiveExample,
    dependencies: {
      '@coherentjs/client': '^1.0.0'
    }
  };
}

/**
 * Generate @coherentjs/i18n scaffolding
 */
export function generateI18nScaffolding() {
  const config = `
import { createI18n } from '@coherentjs/i18n';

export const i18n = createI18n({
  defaultLocale: 'en',
  locales: ['en', 'fr', 'es'],
  fallbackLocale: 'en',
  messages: {
    en: () => import('./locales/en.json'),
    fr: () => import('./locales/fr.json'),
    es: () => import('./locales/es.json')
  }
});
`;

  const enLocale = JSON.stringify({
    common: {
      welcome: 'Welcome',
      hello: 'Hello, {name}!',
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
      hello: 'Bonjour, {name}!',
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
      hello: '¡Hola, {name}!',
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
      '@coherentjs/i18n': '^1.0.0'
    }
  };
}

/**
 * Generate @coherentjs/forms scaffolding
 */
export function generateFormsScaffolding() {
  const exampleForm = `
import { createForm, validators } from '@coherentjs/forms';

export function ContactForm(props = {}) {
  const form = createForm({
    fields: {
      name: {
        type: 'text',
        label: 'Name',
        required: true,
        validators: [validators.minLength(2)]
      },
      email: {
        type: 'email',
        label: 'Email',
        required: true,
        validators: [validators.email()]
      },
      message: {
        type: 'textarea',
        label: 'Message',
        required: true,
        validators: [validators.minLength(10)]
      }
    },
    onSubmit: async (data) => {
      // Handle form submission
      console.log('Form submitted:', data);
    }
  });

  return {
    form: {
      className: 'contact-form',
      children: [
        form.renderField('name'),
        form.renderField('email'),
        form.renderField('message'),
        {
          button: {
            type: 'submit',
            className: 'submit-button',
            text: 'Submit'
          }
        }
      ]
    }
  };
}
`;

  return {
    'src/components/ContactForm.js': exampleForm,
    dependencies: {
      '@coherentjs/forms': '^1.0.0'
    }
  };
}

/**
 * Generate @coherentjs/devtools scaffolding
 */
export function generateDevtoolsScaffolding() {
  const config = `
import { setupDevtools } from '@coherentjs/devtools';

export function initDevtools(app) {
  if (process.env.NODE_ENV === 'development') {
    setupDevtools(app, {
      // Enable component inspector
      inspector: true,
      // Enable performance profiling
      profiler: true,
      // Enable state debugger
      stateDebugger: true,
      // Custom panel port (optional)
      port: 3001
    });

    console.log('🛠️  Devtools enabled at http://localhost:3001');
  }
}
`;

  return {
    'src/utils/devtools.js': config,
    dependencies: {
      '@coherentjs/devtools': '^1.0.0'
    }
  };
}

/**
 * Generate @coherentjs/seo scaffolding
 */
export function generateSeoScaffolding() {
  const metaHelper = `
import { createMetaTags, generateSitemap } from '@coherentjs/seo';

export function getPageMeta(page, data = {}) {
  const baseUrl = process.env.BASE_URL || 'https://example.com';

  const metaConfigs = {
    home: {
      title: 'Welcome to Coherent.js',
      description: 'A high-performance server-side rendering framework',
      image: \`\${baseUrl}/images/og-home.jpg\`,
      url: baseUrl
    },
    about: {
      title: 'About Us - Coherent.js',
      description: 'Learn more about Coherent.js and our mission',
      image: \`\${baseUrl}/images/og-about.jpg\`,
      url: \`\${baseUrl}/about\`
    }
  };

  const config = metaConfigs[page] || metaConfigs.home;

  return createMetaTags({
    ...config,
    siteName: 'Coherent.js',
    twitterHandle: '@coherentjs',
    type: 'website',
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
      '@coherentjs/seo': '^1.0.0'
    }
  };
}

/**
 * Generate @coherentjs/testing scaffolding
 */
export function generateTestingScaffolding() {
  const testHelper = `
import { render, createTestContext } from '@coherentjs/testing';
import { describe, it, expect } from 'vitest';

/**
 * Example component test
 */
export function testComponent(Component, props = {}) {
  describe(Component.name || 'Component', () => {
    it('should render without errors', () => {
      const html = render(Component(props));
      expect(html).toBeTruthy();
      expect(html).toBeTypeOf('string');
    });

    it('should contain expected content', () => {
      const html = render(Component(props));
      // Add your assertions here
    });
  });
}

/**
 * Create a test context with mocked dependencies
 */
export function createMockContext(overrides = {}) {
  return createTestContext({
    req: {
      url: '/',
      method: 'GET',
      headers: {},
      ...overrides.req
    },
    res: {
      status: 200,
      headers: {},
      ...overrides.res
    },
    ...overrides
  });
}
`;

  const exampleTest = `
import { describe, it, expect } from 'vitest';
import { render } from '@coherentjs/testing';
import { HomePage } from '../src/components/HomePage.js';

describe('HomePage', () => {
  it('should render the home page', () => {
    const html = render(HomePage({}));
    expect(html).toContain('Welcome');
  });

  it('should render with custom props', () => {
    const html = render(HomePage({ title: 'Custom Title' }));
    expect(html).toContain('Custom Title');
  });
});
`;

  return {
    'tests/helpers/testing.js': testHelper,
    'tests/components/HomePage.test.js': exampleTest,
    dependencies: {
      '@coherentjs/testing': '^1.0.0'
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
export function generatePackageScaffolding(packages) {
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
        scaffolding = generateSeoScaffolding();
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
