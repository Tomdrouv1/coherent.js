/**
 * Page generator
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Generate a new page
 */
export async function generatePage(name, options = {}) {
  const { path = 'src/pages', template = 'basic', skipTest = false } = options;
  
  // Ensure page name is PascalCase
  const pageName = toPascalCase(name);
  const fileName = pageName;
  
  // Create output directory
  const outputDir = join(process.cwd(), path);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files = [];
  const nextSteps = [];

  // Generate page file
  const pagePath = join(outputDir, `${fileName}.js`);
  const pageContent = generatePageContent(pageName, template);
  writeFileSync(pagePath, pageContent);
  files.push(pagePath);

  // Generate test file
  if (!skipTest) {
    const testPath = join(outputDir, `${fileName}.test.js`);
    const testContent = generateTestContent(pageName);
    writeFileSync(testPath, testContent);
    files.push(testPath);
  }

  // Add next steps
  nextSteps.push(`Import the page: import { ${pageName} } from '${path}/${fileName}.js'`);
  nextSteps.push(`Add route to your router for /${name.toLowerCase()}`);
  nextSteps.push(`Visit http://localhost:3000/${name.toLowerCase()} to see the page`);
  
  if (!skipTest) {
    nextSteps.push('Run tests: npm test');
  }

  return { files, nextSteps };
}

/**
 * Generate page content based on template
 */
function generatePageContent(name, template) {
  switch (template) {
    case 'dashboard':
      return generateDashboardPage(name);
    case 'form':
      return generateFormPage(name);
    case 'list':
      // List page uses basic template as foundation
      return generateBasicPage(name);
    case 'detail':
      // Detail page uses basic template as foundation
      return generateBasicPage(name);
    default:
      return generateBasicPage(name);
  }
}

/**
 * Generate basic page
 */
function generateBasicPage(name) {
  const routeName = name.toLowerCase();
  
  return `import { createComponent } from '@coherentjs/core';

/**
 * ${name} Page Component
 * Route: /${routeName}
 * 
 * @param {Object} props - Page properties
 * @param {Object} props.params - Route parameters
 * @param {Object} props.query - Query parameters
 * @param {Object} props.request - Request object (SSR only)
 */
export const ${name} = createComponent(({ params = {}, query = {}, request, ...props }) => {
  // Page metadata
  const pageTitle = '${name}';
  const pageDescription = '${name} page description';

  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: pageTitle } },
              { 
                meta: { 
                  name: 'description',
                  content: pageDescription
                } 
              },
              { 
                meta: { 
                  name: 'viewport', 
                  content: 'width=device-width, initial-scale=1.0' 
                } 
              }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  className: 'page ${routeName}-page',
                  children: [
                    // Header
                    {
                      header: {
                        className: 'page-header',
                        children: [
                          {
                            h1: {
                              className: 'page-title',
                              text: pageTitle
                            }
                          },
                          {
                            p: {
                              className: 'page-description',
                              text: pageDescription
                            }
                          }
                        ]
                      }
                    },

                    // Main content
                    {
                      main: {
                        className: 'page-content',
                        children: [
                          {
                            section: {
                              className: 'welcome-section',
                              children: [
                                {
                                  h2: {
                                    text: 'Welcome to ${name}!'
                                  }
                                },
                                {
                                  p: {
                                    text: 'This is a generated page component. You can customize it by editing the ${name}.js file.'
                                  }
                                },
                                {
                                  div: {
                                    className: 'page-actions',
                                    children: [
                                      {
                                        button: {
                                          className: 'btn btn-primary',
                                          onclick: () => console.log('Button clicked!'),
                                          text: 'Get Started'
                                        }
                                      },
                                      {
                                        a: {
                                          href: '/',
                                          className: 'btn btn-secondary',
                                          text: 'Back to Home'
                                        }
                                      }
                                    ]
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    },

                    // Footer
                    {
                      footer: {
                        className: 'page-footer',
                        children: [
                          {
                            p: {
                              text: \`© \${new Date().getFullYear()} ${name} Page\`
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
});

// Page configuration (optional)
${name}.route = '/${routeName}';
${name}.title = '${name}';
${name}.description = '${name} page description';

// Usage in router:
// app.get('/${routeName}', (req, res) => {
//   const html = render(${name}({ 
//     params: req.params, 
//     query: req.query,
//     request: req 
//   }));
//   res.send(html);
// });
`;
}

/**
 * Generate dashboard page
 */
function generateDashboardPage(name) {
  return `import { createComponent } from '@coherentjs/core';

/**
 * ${name} Dashboard Page
 * Route: /${name.toLowerCase()}
 */
export const ${name} = createComponent(({ stats = {}, user = null }) => {
  const defaultStats = {
    totalUsers: 0,
    totalOrders: 0,
    revenue: 0,
    ...stats
  };

  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: '${name} Dashboard' } },
              { 
                meta: { 
                  name: 'viewport', 
                  content: 'width=device-width, initial-scale=1.0' 
                } 
              }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  className: 'dashboard',
                  children: [
                    // Header
                    {
                      header: {
                        className: 'dashboard-header',
                        children: [
                          {
                            h1: {
                              text: '${name} Dashboard'
                            }
                          },
                          user ? {
                            p: {
                              text: \`Welcome back, \${user.name || 'User'}!\`
                            }
                          } : null
                        ].filter(Boolean)
                      }
                    },

                    // Stats grid
                    {
                      div: {
                        className: 'stats-grid',
                        children: [
                          {
                            div: {
                              className: 'stat-card',
                              children: [
                                {
                                  h3: {
                                    text: 'Total Users'
                                  }
                                },
                                {
                                  p: {
                                    className: 'stat-number',
                                    text: defaultStats.totalUsers.toLocaleString()
                                  }
                                }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'stat-card',
                              children: [
                                {
                                  h3: {
                                    text: 'Total Orders'
                                  }
                                },
                                {
                                  p: {
                                    className: 'stat-number',
                                    text: defaultStats.totalOrders.toLocaleString()
                                  }
                                }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'stat-card',
                              children: [
                                {
                                  h3: {
                                    text: 'Revenue'
                                  }
                                },
                                {
                                  p: {
                                    className: 'stat-number',
                                    text: \`$\${defaultStats.revenue.toLocaleString()}\`
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    },

                    // Main content area
                    {
                      main: {
                        className: 'dashboard-content',
                        children: [
                          {
                            section: {
                              className: 'recent-activity',
                              children: [
                                {
                                  h2: {
                                    text: 'Recent Activity'
                                  }
                                },
                                {
                                  p: {
                                    text: 'No recent activity to display.'
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
});
`;
}

/**
 * Generate form page
 */
function generateFormPage(name) {
  return `import { createComponent } from '@coherentjs/core';

/**
 * ${name} Form Page
 * Route: /${name.toLowerCase()}
 */
export const ${name} = createComponent(({ initialData = {}, errors = {} }) => {
  const handleSubmit = (formData) => {
    console.log('Form submitted:', formData);
    // Handle form submission logic here
  };

  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: '${name} Form' } },
              { 
                meta: { 
                  name: 'viewport', 
                  content: 'width=device-width, initial-scale=1.0' 
                } 
              }
            ]
          }
        },
        {
          body: {
            children: [
              {
                div: {
                  className: 'form-page',
                  children: [
                    {
                      header: {
                        className: 'form-header',
                        children: [
                          {
                            h1: {
                              text: '${name} Form'
                            }
                          },
                          {
                            p: {
                              text: 'Please fill out the form below.'
                            }
                          }
                        ]
                      }
                    },
                    {
                      main: {
                        className: 'form-content',
                        children: [
                          {
                            form: {
                              className: 'main-form',
                              onsubmit: (event) => {
                                event.preventDefault();
                                const formData = new FormData(event.target);
                                handleSubmit(Object.fromEntries(formData));
                              },
                              children: [
                                {
                                  div: {
                                    className: 'form-group',
                                    children: [
                                      {
                                        label: {
                                          htmlFor: 'name',
                                          text: 'Name'
                                        }
                                      },
                                      {
                                        input: {
                                          type: 'text',
                                          id: 'name',
                                          name: 'name',
                                          value: initialData.name || '',
                                          className: errors.name ? '_error' : '',
                                          required: true
                                        }
                                      },
                                      errors.name ? {
                                        span: {
                                          className: '_error-message',
                                          text: errors.name
                                        }
                                      } : null
                                    ].filter(Boolean)
                                  }
                                },
                                {
                                  div: {
                                    className: 'form-group',
                                    children: [
                                      {
                                        label: {
                                          htmlFor: 'email',
                                          text: 'Email'
                                        }
                                      },
                                      {
                                        input: {
                                          type: 'email',
                                          id: 'email',
                                          name: 'email',
                                          value: initialData.email || '',
                                          className: errors.email ? '_error' : '',
                                          required: true
                                        }
                                      },
                                      errors.email ? {
                                        span: {
                                          className: '_error-message',
                                          text: errors.email
                                        }
                                      } : null
                                    ].filter(Boolean)
                                  }
                                },
                                {
                                  div: {
                                    className: 'form-actions',
                                    children: [
                                      {
                                        button: {
                                          type: 'submit',
                                          className: 'btn btn-primary',
                                          text: 'Submit'
                                        }
                                      },
                                      {
                                        button: {
                                          type: 'reset',
                                          className: 'btn btn-secondary',
                                          text: 'Reset'
                                        }
                                      }
                                    ]
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
});
`;
}

/**
 * Generate test content
 */
function generateTestContent(name) {
  return `import { test } from 'node:test';
import assert from 'node:assert';
import { render } from '@coherentjs/core';
import { ${name} } from './${name}.js';

test('${name} page renders correctly', () => {
  const page = ${name}({});
  const html = render(page);
  
  assert(typeof html === 'string');
  assert(html.length > 0);
  assert(html.includes('<html>'));
  assert(html.includes('${name}'));
});

test('${name} page includes proper head elements', () => {
  const page = ${name}({});
  const html = render(page);
  
  assert(html.includes('<title>'));
  assert(html.includes('<meta'));
  assert(html.includes('viewport'));
});

test('${name} page renders with custom props', () => {
  const props = {
    params: { id: '123' },
    query: { search: 'test' }
  };
  
  const page = ${name}(props);
  const html = render(page);
  
  assert(html.includes('${name}'));
});
`;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}