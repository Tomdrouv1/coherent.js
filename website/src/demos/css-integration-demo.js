/**
 * CSS Integration Demo for Coherent.js Website
 * Demonstrates CSS file loading, external links, and inline styles
 */

import { renderHTML } from "../../../packages/core/src/index.js";

// Demo components
const Button = ({ variant = 'primary', size = 'medium', children, onClick, disabled = false }) => ({
  button: {
    className: `btn btn--${variant} btn--${size}`,
    onclick: onClick,
    disabled,
    children: Array.isArray(children) ? children : [children]
  }
});

const Card = ({ title, content, footer, className = '' }) => ({
  div: {
    className: `card ${className}`,
    children: [
      title ? {
        div: {
          className: 'card-header',
          children: [
            { h3: { className: 'card-title', text: title } }
          ]
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

const CodeBlock = ({ code, language = 'javascript' }) => ({
  pre: {
    className: 'code-block',
    children: [
      {
        code: {
          className: `language-${language}`,
          text: code
        }
      }
    ]
  }
});

const DemoSection = ({ title, description, component, code }) => ({
  div: {
    className: 'demo-section',
    children: [
      { h2: { className: 'demo-title', text: title } },
      { p: { className: 'demo-description', text: description } },
      {
        div: {
          className: 'demo-content',
          children: [
            {
              div: {
                className: 'demo-preview',
                children: [component]
              }
            },
            code ? {
              div: {
                className: 'demo-code',
                children: [
                  { h4: { text: 'Code:' } },
                  CodeBlock({ code, language: 'javascript' })
                ]
              }
            } : null
          ].filter(Boolean)
        }
      }
    ]
  }
});

// Main demo application
const CSSIntegrationDemo = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'CSS Integration Demo - Coherent.js' } },
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } },
            { meta: { name: 'description', content: 'Demonstration of CSS file integration with Coherent.js' } }
          ]
        }
      },
      {
        body: {
          className: 'app',
          children: [
            {
              header: {
                className: 'hero',
                children: [
                  {
                    div: {
                      className: 'hero-content',
                      children: [
                        { h1: { className: 'hero-title', text: '📁 CSS File Integration' } },
                        { p: { className: 'hero-subtitle', text: 'Seamless CSS integration with Coherent.js' } },
                        {
                          div: {
                            className: 'hero-features',
                            children: [
                              { span: { className: 'feature-badge', text: 'CSS Files' } },
                              { span: { className: 'feature-badge', text: 'External Links' } },
                              { span: { className: 'feature-badge', text: 'Inline Styles' } },
                              { span: { className: 'feature-badge', text: 'Minification' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              main: {
                className: 'main-content',
                children: [
                  {
                    div: {
                      className: 'container',
                      children: [
                        DemoSection({
                          title: '1. Basic CSS File Loading',
                          description: 'Load external CSS files and inject them into the HTML head.',
                          component: Card({
                            title: 'Styled with CSS Files',
                            content: [
                              { p: { text: 'This card is styled using external CSS files loaded by Coherent.js.' } },
                              {
                                div: {
                                  className: 'button-group',
                                  children: [
                                    Button({ children: [{ text: 'Primary' }] }),
                                    Button({ variant: 'secondary', children: [{ text: 'Secondary' }] }),
                                    Button({ variant: 'success', children: [{ text: 'Success' }] })
                                  ]
                                }
                              }
                            ]
                          }),
                          code: `const html = await renderHTML(Component(), {
  cssFiles: [
    './styles/main.css',
    './styles/components.css'
  ]
});`
                        }),

                        DemoSection({
                          title: '2. External CSS Links',
                          description: 'Reference external CSS from CDNs, Google Fonts, or other sources.',
                          component: Card({
                            title: 'External Font Integration',
                            content: [
                              { p: { className: 'google-font-text', text: 'This text uses Google Fonts loaded via external CSS links.' } },
                              { p: { className: 'bootstrap-alert alert-info', text: 'This alert uses Bootstrap classes from CDN.' } }
                            ],
                            className: 'external-demo'
                          }),
                          code: `const html = await renderHTML(Component(), {
  cssLinks: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'
  ]
});`
                        }),

                        DemoSection({
                          title: '3. Inline CSS Override',
                          description: 'Add inline CSS for quick customizations and overrides.',
                          component: Card({
                            title: 'Custom Styled Card',
                            content: [
                              { p: { text: 'This card has custom styling applied via inline CSS.' } },
                              Button({ 
                                variant: 'primary', 
                                size: 'large', 
                                children: [{ text: 'Custom Button' }] 
                              })
                            ],
                            className: 'inline-styled-card'
                          }),
                          code: `const html = await renderHTML(Component(), {
  cssFiles: ['./styles/base.css'],
  cssInline: \`
    .inline-styled-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
    }
  \`
});`
                        }),

                        DemoSection({
                          title: '4. Mixed CSS Sources',
                          description: 'Combine multiple CSS sources for maximum flexibility.',
                          component: {
                            div: {
                              className: 'mixed-demo-grid',
                              children: [
                                Card({
                                  title: 'Grid Item 1',
                                  content: [{ p: { text: 'Styled with CSS files' } }],
                                  className: 'grid-card'
                                }),
                                Card({
                                  title: 'Grid Item 2',
                                  content: [{ p: { text: 'Enhanced with external fonts' } }],
                                  className: 'grid-card'
                                }),
                                Card({
                                  title: 'Grid Item 3',
                                  content: [{ p: { text: 'Customized with inline CSS' } }],
                                  className: 'grid-card'
                                }),
                                Card({
                                  title: 'Grid Item 4',
                                  content: [{ p: { text: 'Combined styling approach' } }],
                                  className: 'grid-card'
                                })
                              ]
                            }
                          },
                          code: `const html = await renderHTML(Component(), {
  cssFiles: ['./styles/grid.css'],
  cssLinks: ['https://fonts.googleapis.com/css2?family=Inter'],
  cssInline: '.grid-card:hover { transform: scale(1.05); }',
  cssMinify: true
});`
                        }),

                        DemoSection({
                          title: '5. Production Optimization',
                          description: 'Minified CSS and HTML for production builds.',
                          component: Card({
                            title: 'Optimized Build',
                            content: [
                              { p: { text: 'This demo shows CSS minification and optimization features.' } },
                              {
                                div: {
                                  className: 'optimization-stats',
                                  children: [
                                    { div: { className: 'stat', children: [
                                      { span: { className: 'stat-label', text: 'CSS Files:' } },
                                      { span: { className: 'stat-value', text: '3 loaded' } }
                                    ]}},
                                    { div: { className: 'stat', children: [
                                      { span: { className: 'stat-label', text: 'Minified:' } },
                                      { span: { className: 'stat-value', text: 'Yes' } }
                                    ]}},
                                    { div: { className: 'stat', children: [
                                      { span: { className: 'stat-label', text: 'Cached:' } },
                                      { span: { className: 'stat-value', text: 'Yes' } }
                                    ]}}
                                  ]
                                }
                              }
                            ]
                          }),
                          code: `const html = await renderHTML(Component(), {
  cssFiles: ['./styles/main.css', './styles/components.css'],
  cssMinify: process.env.NODE_ENV === 'production',
  minify: process.env.NODE_ENV === 'production'
});`
                        }),

                        // API Reference Section
                        {
                          div: {
                            className: 'api-reference-section',
                            children: [
                              { h2: { className: 'section-title', text: 'API Reference' } },
                              Card({
                                title: 'CSS Options',
                                content: [
                                  {
                                    div: {
                                      className: 'api-options',
                                      children: [
                                        {
                                          div: {
                                            className: 'api-option',
                                            children: [
                                              { strong: { text: 'cssFiles' } },
                                              { span: { text: ' (Array<string>): CSS file paths to load' } }
                                            ]
                                          }
                                        },
                                        {
                                          div: {
                                            className: 'api-option',
                                            children: [
                                              { strong: { text: 'cssLinks' } },
                                              { span: { text: ' (Array<string>): External CSS URLs' } }
                                            ]
                                          }
                                        },
                                        {
                                          div: {
                                            className: 'api-option',
                                            children: [
                                              { strong: { text: 'cssInline' } },
                                              { span: { text: ' (string): Inline CSS content' } }
                                            ]
                                          }
                                        },
                                        {
                                          div: {
                                            className: 'api-option',
                                            children: [
                                              { strong: { text: 'cssMinify' } },
                                              { span: { text: ' (boolean): Minify CSS content' } }
                                            ]
                                          }
                                        }
                                      ]
                                    }
                                  }
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
            },
            {
              footer: {
                className: 'demo-footer',
                children: [
                  {
                    div: {
                      className: 'container',
                      children: [
                        { p: { text: '🎨 CSS Integration Demo - Coherent.js Framework' } },
                        {
                          div: {
                            className: 'footer-links',
                            children: [
                              { a: { href: '/docs/css-file-integration', text: 'Documentation' } },
                              { a: { href: '/docs/api-reference', text: 'API Reference' } },
                              { a: { href: '/examples', text: 'More Examples' } }
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
});

// Export different demo variations
export async function basicCSSDemo() {
  return await renderHTML(CSSIntegrationDemo(), {
    cssFiles: [
      './website/styles/demo-base.css',
      './website/styles/demo-components.css'
    ]
  });
}

export async function advancedCSSDemo() {
  return await renderHTML(CSSIntegrationDemo(), {
    cssFiles: [
      './website/styles/demo-base.css',
      './website/styles/demo-components.css',
      './website/styles/demo-animations.css'
    ],
    cssLinks: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    ],
    cssInline: `
      .hero {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .inline-styled-card {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        border: none;
        box-shadow: 0 10px 20px rgba(240, 147, 251, 0.3);
      }
      
      .mixed-demo-grid .grid-card:hover {
        transform: translateY(-5px) scale(1.02);
        box-shadow: 0 15px 30px rgba(0,0,0,0.15);
      }
      
      .google-font-text {
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 1.1rem;
      }
    `,
    cssMinify: true
  });
}

export async function productionCSSDemo() {
  return await renderHTML(CSSIntegrationDemo(), {
    cssFiles: [
      './website/styles/demo-base.css',
      './website/styles/demo-components.css',
      './website/styles/demo-theme.css'
    ],
    cssLinks: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap'
    ],
    cssMinify: true,
    minify: true
  });
}

// Main export
export default CSSIntegrationDemo;