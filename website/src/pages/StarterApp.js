/**
 * Starter App Tutorial Page
 * Complete full-stack tutorial for Coherent.js
 */

export const StarterAppPage = () => ({
  div: {
    className: 'starter-app-page',
    children: [
      // Hero Section
      {
        div: {
          className: 'starter-hero-section',
          children: [
            { h1: { text: '🚀 Coherent.js Starter App', className: 'starter-hero-title' } },
            { 
              p: { 
                text: 'A simple, working full-stack example that actually works',
                className: 'starter-hero-subtitle'
              } 
            },
            {
              div: {
                style: 'margin-top: 30px; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;',
                children: [
                  {
                    a: {
                      href: 'https://github.com/coherentjs/coherent/tree/main/examples/starter-app',
                      target: '_blank',
                      className: 'btn btn-primary starter-btn',
                      text: '📁 View Code on GitHub'
                    }
                  },
                  {
                    a: {
                      href: '#quick-start',
                      className: 'btn btn-outline starter-btn-outline',
                      text: '▶️ Quick Start'
                    }
                  }
                ]
              }
            }
          ]
        }
      },

      // Main Content
      {
        div: {
          className: 'container starter-container',
          children: [
            // What You'll Build
            {
              section: {
                className: 'starter-section',
                children: [
                  { h2: { text: '🎯 What You\'ll Build', className: 'starter-section-title' } },
                  {
                    div: {
                      className: 'starter-info-box',
                      children: [
                        { p: { text: 'A simple counter app that demonstrates:', className: 'starter-info-title' } },
                        {
                          ul: {
                            className: 'starter-feature-list',
                            children: [
                              { li: { text: '✅ Server-Side Rendering (SSR)', className: 'starter-feature-item' } },
                              { li: { text: '✅ Client-Side Hydration', className: 'starter-feature-item' } },
                              { li: { text: '✅ Interactive Components', className: 'starter-feature-item' } },
                              { li: { text: '✅ State Management', className: 'starter-feature-item' } }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'starter-meta-box',
                            children: [
                              { p: { text: '⏱️ Time to complete: 10 minutes', className: 'starter-meta-item' } },
                              { p: { text: '📊 Difficulty: Beginner', className: 'starter-meta-item' } },
                              { p: { text: '📦 Prerequisites: Node.js 18+', className: 'starter-meta-item' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            },

            // Quick Start
            {
              section: {
                id: 'quick-start',
                className: 'starter-section',
                children: [
                  { h2: { text: '⚡ Quick Start', className: 'starter-section-title' } },
                  {
                    div: {
                      className: 'starter-code-block',
                      children: [
                        { pre: { text: '# Clone the repository\ngit clone https://github.com/coherentjs/coherent.git\ncd coherent/examples/starter-app\n\n# Run the server\nnode server.js\n\n# Open http://localhost:3000' } }
                      ]
                    }
                  },
                  {
                    p: {
                      text: 'That\'s it! The counter works, buttons click, state updates. Everything just works.',
                      className: 'starter-success-text'
                    }
                  }
                ]
              }
            },

            // Key Features
            {
              section: {
                className: 'starter-section',
                children: [
                  { h2: { text: '✨ Key Features', className: 'starter-section-title' } },
                  {
                    div: {
                      className: 'starter-features-grid',
                      children: [
                        {
                          div: {
                            className: 'starter-feature-card starter-feature-card-1',
                            children: [
                              { h3: { text: '🖥️ Server-Side Rendering', className: 'starter-feature-title' } },
                              { p: { text: 'Fast initial page loads with complete HTML rendered on the server. SEO-friendly and works without JavaScript.', className: 'starter-feature-desc' } }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'starter-feature-card starter-feature-card-2',
                            children: [
                              { h3: { text: '⚡ Client Hydration', className: 'starter-feature-title' } },
                              { p: { text: 'Makes server-rendered HTML interactive. Preserves content, attaches event handlers, enables state management.', className: 'starter-feature-desc' } }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'starter-feature-card starter-feature-card-3',
                            children: [
                              { h3: { text: '🔄 State Management', className: 'starter-feature-title' } },
                              { p: { text: 'Built-in reactive state with withState. Simple setState calls trigger automatic re-rendering.', className: 'starter-feature-desc' } }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'starter-feature-card starter-feature-card-4',
                            children: [
                              { h3: { text: '🎯 Simple Setup', className: 'starter-feature-title' } },
                              { p: { text: 'Just 2 files and one command to run. No build steps, no complex configuration. It just works.', className: 'starter-feature-desc' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            },

            // Code Example
            {
              section: {
                className: 'starter-section',
                children: [
                  { h2: { text: '💻 Code Example', className: 'starter-section-title' } },
                  { p: { text: 'Here\'s the complete Counter component:', className: 'starter-code-intro' } },
                  {
                    div: {
                      className: 'starter-code-block',
                      children: [
                        { 
                          pre: { 
                            text: `import { withState } from '@coherent.js/core';

export const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    'data-coherent-component': 'counter',
    className: 'counter',
    children: [
      { h2: { text: 'Interactive Counter' } },
      { p: { text: \`Count: \${state.count}\` } },
      {
        button: {
          text: '+',
          onclick: (event, state, setState) => {
            setState({ count: state.count + 1 });
          }
        }
      }
    ]
  }
}));`
                          } 
                        }
                      ]
                    }
                  }
                ]
              }
            },

            // Documentation Links
            {
              section: {
                className: 'starter-section',
                children: [
                  { h2: { text: '📚 Documentation', className: 'starter-section-title' } },
                  {
                    div: {
                      className: 'starter-docs-grid',
                      children: [
                        {
                          a: {
                            href: 'https://github.com/coherentjs/coherent/blob/main/examples/starter-app/README.md',
                            target: '_blank',
                            className: 'starter-doc-card',
                            children: [
                              { h3: { text: '📖 Starter App README', className: 'starter-doc-title' } },
                              { p: { text: 'Complete guide to the starter app with usage examples and customization tips.', className: 'starter-doc-desc' } }
                            ]
                          }
                        },
                        {
                          a: {
                            href: 'https://github.com/coherentjs/coherent/blob/main/docs/FULL_STACK_TUTORIAL.md',
                            target: '_blank',
                            className: 'starter-doc-card',
                            children: [
                              { h3: { text: '🎓 Full-Stack Tutorial', className: 'starter-doc-title' } },
                              { p: { text: 'Step-by-step tutorial covering SSR, hydration, state management, and more.', className: 'starter-doc-desc' } }
                            ]
                          }
                        },
                        {
                          a: {
                            href: '/docs',
                            className: 'starter-doc-card',
                            children: [
                              { h3: { text: '📘 API Documentation', className: 'starter-doc-title' } },
                              { p: { text: 'Complete API reference for all Coherent.js features and utilities.', className: 'starter-doc-desc' } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            },

            // Next Steps
            {
              section: {
                className: 'starter-cta-section',
                children: [
                  { h2: { text: '🚀 Ready to Start?', className: 'starter-cta-title' } },
                  { p: { text: 'Get the starter app and build your first Coherent.js application in minutes!', className: 'starter-cta-subtitle' } },
                  {
                    div: {
                      className: 'starter-cta-buttons',
                      children: [
                        {
                          a: {
                            href: 'https://github.com/coherentjs/coherent/tree/main/examples/starter-app',
                            target: '_blank',
                            className: 'btn btn-primary starter-btn',
                            text: '📥 Download Starter App'
                          }
                        },
                        {
                          a: {
                            href: '/examples',
                            className: 'btn btn-outline starter-btn-outline',
                            text: '🎨 View More Examples'
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
