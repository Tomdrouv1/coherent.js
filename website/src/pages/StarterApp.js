/**
 * Starter App Tutorial Page
 * Complete full-stack tutorial for Coherent.js
 */

export const StarterAppPage = ({ highlightCode } = {}) => ({
  div: {
    className: 'starter-app-page',
    children: [
      // Page header
      { div: { className: 'page-header', children: [
        { h1: { text: 'Starter App' } },
        { p: { className: 'page-lead', text: 'A simple, working full-stack example that actually works.' } }
      ] } },

      // Main Content
      {
        div: {
          className: 'starter-container',
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
                      className: 'code-wrapper',
                      html: highlightCode
                        ? highlightCode('# Clone the repository\ngit clone https://github.com/coherentjs/coherent.git\ncd coherent/examples/starter-app\n\n# Run the server\nnode server.js\n\n# Open http://localhost:3000', 'bash')
                        : '<pre class="code-block"><code># Clone the repository\ngit clone https://github.com/coherentjs/coherent.git\ncd coherent/examples/starter-app\n\n# Run the server\nnode server.js\n\n# Open http://localhost:3000</code></pre>'
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
                  (() => {
                    const code = `import { withState } from '@coherent.js/core';

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
}));`;
                    return {
                      div: {
                        className: 'code-wrapper',
                        html: highlightCode
                          ? highlightCode(code, 'javascript')
                          : `<pre class="code-block"><code>${code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`
                      }
                    };
                  })()
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
                            href: 'docs/getting-started/quick-start',
                            className: 'starter-doc-card',
                            children: [
                              { h3: { text: 'Quick Start Guide', className: 'starter-doc-title' } },
                              { p: { text: 'Get up and running in 5 minutes with the quick start guide.', className: 'starter-doc-desc' } }
                            ]
                          }
                        },
                        {
                          a: {
                            href: 'docs/components/basics',
                            className: 'starter-doc-card',
                            children: [
                              { h3: { text: 'Component Basics', className: 'starter-doc-title' } },
                              { p: { text: 'Learn the object syntax and component fundamentals.', className: 'starter-doc-desc' } }
                            ]
                          }
                        },
                        {
                          a: {
                            href: 'docs/api/reference',
                            className: 'starter-doc-card',
                            children: [
                              { h3: { text: 'API Reference', className: 'starter-doc-title' } },
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
                className: 'starter-section',
                children: [
                  { h2: { text: 'Ready to Start?', className: 'starter-section-title' } },
                  { p: { text: 'Get the starter app and build your first Coherent.js application in minutes.', className: 'starter-code-intro' } },
                  {
                    div: {
                      className: 'starter-cta-buttons',
                      children: [
                        {
                          a: {
                            href: 'https://github.com/Tomdrouv1/coherent.js/tree/main/examples/starter-app',
                            target: '_blank',
                            className: 'button primary',
                            text: 'Download Starter App'
                          }
                        },
                        {
                          a: {
                            href: '/examples',
                            className: 'button secondary',
                            text: 'View More Examples'
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
