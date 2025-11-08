/**
 * Basic CSS File Usage Example
 * Demonstrates how to use external CSS files with Coherent.js
 */

import { render, renderSync } from "../packages/core/src/index.js";

// Simple component using CSS classes
const Button = ({ variant = 'primary', size = 'medium', children, onClick }) => ({
  button: {
    className: `btn btn--${variant} btn--${size}`,
    onclick: onClick,
    children: Array.isArray(children) ? children : [children]
  }
});

const Card = ({ title, content, footer }) => ({
  div: {
    className: 'card',
    children: [
      title ? {
        div: {
          className: 'card-header',
          children: [{ h3: { text: title } }]
        }
      } : null,
      {
        div: {
          className: 'card-body',
          children: Array.isArray(content) ? content : [content]
        }
      },
      footer ? {
        div: {
          className: 'card-footer',
          children: Array.isArray(footer) ? footer : [footer]
        }
      } : null
    ].filter(Boolean)
  }
});

const App = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'CSS File Example' } },
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
          ]
        }
      },
      {
        body: {
          className: 'app',
          children: [
            {
              div: {
                className: 'container',
                children: [
                  { h1: { className: 'page-title', text: 'CSS File Integration Demo' } },
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        Card({
                          title: 'Button Examples',
                          content: [
                            { p: { text: 'Different button styles using CSS files:' } },
                            {
                              div: {
                                className: 'button-group',
                                children: [
                                  Button({ variant: 'primary', children: [{ text: 'Primary' }] }),
                                  Button({ variant: 'secondary', children: [{ text: 'Secondary' }] }),
                                  Button({ variant: 'success', children: [{ text: 'Success' }] }),
                                  Button({ variant: 'danger', size: 'large', children: [{ text: 'Large Danger' }] })
                                ]
                              }
                            }
                          ]
                        })
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'demo-section',
                      children: [
                        Card({
                          title: 'Layout Examples',
                          content: [
                            {
                              div: {
                                className: 'grid-demo',
                                children: [
                                  { div: { className: 'grid-item', children: [{ text: 'Item 1' }] } },
                                  { div: { className: 'grid-item', children: [{ text: 'Item 2' }] } },
                                  { div: { className: 'grid-item', children: [{ text: 'Item 3' }] } },
                                  { div: { className: 'grid-item', children: [{ text: 'Item 4' }] } }
                                ]
                              }
                            }
                          ],
                          footer: [
                            { p: { className: 'text-muted', text: 'Styled with external CSS files' } }
                          ]
                        })
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
});

// Example 1: Basic CSS file loading
export async function basicExample() {
  const html = await render(App(), {
    cssFiles: [
      './examples/css-file-usage/styles/main.css',
      './examples/css-file-usage/styles/components.css'
    ]
  });
  
  return html;
}

// Example 2: CSS files with external CDN links
export async function cdnExample() {
  const html = await render(App(), {
    cssFiles: [
      './examples/css-file-usage/styles/custom.css'
    ],
    cssLinks: [
      'https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css',
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    ]
  });
  
  return html;
}

// Example 3: CSS files with inline overrides
export async function mixedExample() {
  const html = await render(App(), {
    cssFiles: [
      './examples/css-file-usage/styles/main.css'
    ],
    cssInline: `
      .page-title {
        color: #e74c3c !important;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
      }
      
      .demo-section {
        margin-bottom: 3rem;
      }
      
      .button-group .btn {
        margin-right: 1rem;
        margin-bottom: 0.5rem;
      }
    `,
    cssMinify: true
  });
  
  return html;
}

// Example 4: Production build with minification
export async function productionExample() {
  const html = await render(App(), {
    cssFiles: [
      './examples/css-file-usage/styles/main.css',
      './examples/css-file-usage/styles/components.css',
      './examples/css-file-usage/styles/themes/professional.css'
    ],
    cssMinify: true,
    minify: true
  });
  
  return html;
}

// Example 5: Synchronous rendering (no CSS files)
export function synchronousExample() {
  const html = renderSync(App(), {
    cssLinks: [
      'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'
    ],
    cssInline: `
      .app { 
        font-family: 'Inter', sans-serif; 
        line-height: 1.6; 
      }
      .container { 
        max-width: 1200px; 
        margin: 0 auto; 
        padding: 2rem; 
      }
    `
  });
  
  return html;
}

// Demo runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎨 CSS File Usage Examples\n');
  
  console.log('1. Basic CSS file loading...');
  const basic = await basicExample();
  console.log(`   Generated ${basic.length} characters of HTML\n`);
  
  console.log('2. CDN links example...');
  const cdn = await cdnExample();
  console.log(`   Generated ${cdn.length} characters of HTML\n`);
  
  console.log('3. Mixed CSS sources...');
  const mixed = await mixedExample();
  console.log(`   Generated ${mixed.length} characters of HTML\n`);
  
  console.log('4. Production build...');
  const prod = await productionExample();
  console.log(`   Generated ${prod.length} characters of HTML (minified)\n`);
  
  console.log('5. Synchronous rendering...');
  const sync = synchronousExample();
  console.log(`   Generated ${sync.length} characters of HTML\n`);
  
  console.log('✅ All examples completed successfully!');
}
