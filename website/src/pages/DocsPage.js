// DocsPage.js - Enhanced documentation page with search and navigation
export function DocsPage({ title, html }) {
  return {
    section: {
      className: 'docs-page',
      children: [
        // Header
        { 
          div: { 
            className: 'docs-header', 
            children: [
              { h1: { className: 'docs-title', text: title || 'Documentation' } }
            ]
          }
        },
        
        // Main content
        { 
          div: { 
            className: 'docs-content',
            children: [
              // We inject pre-rendered, trusted HTML from our markdown renderer  
              { div: { className: 'markdown-body', innerHTML: () => html } }
            ]
          }
        }
      ]
    }
  };
}

// Enhanced DocsIndexPage for the main documentation landing page
export function DocsIndexPage() {
  return {
    section: {
      className: 'docs-index-page',
      children: [
        // Hero section
        {
          div: {
            className: 'docs-hero',
            children: [
              { h1: { className: 'docs-hero-title', text: 'Documentation' } },
              { 
                div: { 
                  className: 'docs-hero-description', 
                  children: [
                    {
                      p: {
                        text: 'Coherent.js is a high-performance server-side rendering framework that lets you build components using pure JavaScript objects. No JSX, no complex build steps—just clean, readable code that renders blazingly fast.'
                      }
                    },
                    {
                      p: {
                        text: 'This documentation will guide you through everything from basic concepts to advanced patterns. Use the search above to quickly find what you need, or explore the sections below to learn systematically.'
                      }
                    }
                  ]
                } 
              }
            ]
          }
        },

        // Quick start section
        {
          section: {
            className: 'docs-section',
            children: [
              { h2: { text: '🚀 Getting Started' } },
              { p: { text: 'New to Coherent.js? Start here to get up and running quickly.' } },
              {
                div: {
                  className: 'docs-cards',
                  children: [
                    {
                      a: {
                        href: 'docs/getting-started/quick-start',
                        className: 'docs-card docs-card-primary',
                        children: [
                          { h3: { text: '⚡ Quick Start' } },
                          { p: { text: 'Get up and running in 5 minutes with our quick start guide.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/getting-started/installation',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '📦 Installation' } },
                          { p: { text: 'Detailed setup instructions for all environments.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/migration/from-other-frameworks',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🔄 Migration Guide' } },
                          { p: { text: 'Coming from React, Vue, or another framework? Start here.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Core concepts section
        {
          section: {
            className: 'docs-section',
            children: [
              { h2: { text: '🧩 Core Concepts' } },
              { p: { text: 'Master the fundamentals of building components with Coherent.js.' } },
              {
                div: {
                  className: 'docs-cards',
                  children: [
                    {
                      a: {
                        href: 'docs/components/basics',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🏗️ Basic Components' } },
                          { p: { text: 'Learn the object syntax and component fundamentals.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/components/state',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🔄 State Management' } },
                          { p: { text: 'Reactive components with the withState HOC.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/client/hydration-guide',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '💧 Hydration' } },
                          { p: { text: 'Make your components interactive on the client.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Advanced topics section  
        {
          section: {
            className: 'docs-section',
            children: [
              { h2: { text: '⚡ Advanced Topics' } },
              { p: { text: 'Deep dive into advanced patterns and production-ready features.' } },
              {
                div: {
                  className: 'docs-cards',
                  children: [
                    {
                      a: {
                        href: 'docs/components/advanced',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🎯 Advanced Components' } },
                          { p: { text: 'HOCs, composition patterns, and complex architectures.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/deployment/performance',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🚀 Performance' } },
                          { p: { text: 'Optimization strategies and caching techniques.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/deployment/index',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '☁️ Deployment' } },
                          { p: { text: 'Production deployment with Docker, Kubernetes, and more.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Integration section
        {
          section: {
            className: 'docs-section',
            children: [
              { h2: { text: '🔗 Integration & Frameworks' } },
              { p: { text: 'Use Coherent.js with your favorite frameworks and tools.' } },
              {
                div: {
                  className: 'docs-cards',
                  children: [
                    {
                      a: {
                        href: 'docs/deployment/integrations',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🌐 Framework Integrations' } },
                          { p: { text: 'Express, Fastify, Next.js, Koa, and more.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/database/index',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🗄️ Database Integration' } },
                          { p: { text: 'Work with databases and query builders.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/deployment/security',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '🛡️ Security' } },
                          { p: { text: 'Security best practices and guidelines.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        },

        // Reference section
        {
          section: {
            className: 'docs-section',
            children: [
              { h2: { text: '📖 Reference & Examples' } },
              { p: { text: 'Complete API documentation and practical examples.' } },
              {
                div: {
                  className: 'docs-cards',
                  children: [
                    {
                      a: {
                        href: 'docs/api/reference',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '📋 API Reference' } },
                          { p: { text: 'Complete function documentation and signatures.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'docs/DOCS_INDEX',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '📚 Complete Index' } },
                          { p: { text: 'Organized access to all documentation.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
                        ]
                      }
                    },
                    {
                      a: {
                        href: 'examples',
                        className: 'docs-card',
                        children: [
                          { h3: { text: '💡 Examples' } },
                          { p: { text: 'Real-world examples and code samples.' } },
                          { span: { className: 'docs-card-arrow', text: '→' } }
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
}
