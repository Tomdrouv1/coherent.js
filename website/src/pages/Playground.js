// Playground.js - Client-side Coherent.js component playground

// The runPlaygroundComponent function is now loaded from playground.js script

export function Playground() {
    return {
        section: {
            className: 'playground-container',
            children: [
                {h1: {text: 'Coherent.js Playground'}},
                {p: {text: 'Create and test Coherent.js components using JavaScript! Write components as pure JavaScript objects and see them rendered in real-time with live preview and HTML generation.'}},

                {
                    div: {
                        className: 'playground-controls',
                        style: 'display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin: 16px 0;',
                        children: [
                            {
                                button: {
                                    id: 'run-btn',
                                    className: 'button primary',
                                    type: 'button',
                                    onclick: 'if(window.runPlaygroundComponent) { window.runPlaygroundComponent(); } else { console.error(\'runPlaygroundComponent not available\'); }',
                                    text: '🚀 Execute Code'
                                }
                            },
                            {
                                div: {
                                    style: 'position: relative; display: inline-block;',
                                    children: [
                                        {
                                            button: {
                                                id: 'templates-btn',
                                                className: 'button secondary',
                                                type: 'button',
                                                onclick: `
                                                  const menu = document.getElementById('templates-menu');
                                                  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                                                `,
                                                text: '📝 Templates ▼'
                                            }
                                        },
                                        {
                                            div: {
                                                id: 'templates-menu',
                                                style: 'display: none; position: absolute; top: 100%; left: 0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; min-width: 200px;',
                                                children: [
                                                    {
                                                        button: {
                                                            className: 'template-option',
                                                            style: 'width: 100%; text-align: left; padding: 12px 16px; border: none; background: none; cursor: pointer; border-bottom: 1px solid #eee;',
                                                            onclick: `
                                                              const code = \`// Welcome Component
const WelcomeComponent = () => ({
  div: {
    style: 'padding: 24px; font-family: system-ui, sans-serif; max-width: 600px;',
    children: [
      { 
        h1: { 
          text: 'Welcome to Coherent.js! 🚀',
          style: 'color: #7cc4ff; margin-bottom: 16px; font-weight: 700;'
        } 
      },
      { 
        p: { 
          text: 'Edit this code and click Execute!',
          style: 'color: #666; line-height: 1.6;'
        } 
      }
    ]
  }
});

return WelcomeComponent();\`;
                                                              if (window.setEditorContent) {
                                                                window.setEditorContent(code);
                                                              } else {
                                                                console.error('setEditorContent not available');
                                                              }
                                                              document.getElementById('templates-menu').style.display = 'none';
                                                            `,
                                                            text: '🚀 Basic Component'
                                                        }
                                                    },
                                                    {
                                                        button: {
                                                            className: 'template-option',
                                                            style: 'width: 100%; text-align: left; padding: 12px 16px; border: none; background: none; cursor: pointer; border-bottom: 1px solid #eee;',
                                                            onclick: `
                                                              const code = \`// Interactive Button Component
const ButtonComponent = () => ({
  div: {
    style: 'padding: 24px; font-family: system-ui, sans-serif;',
    children: [
      { h2: { text: 'Interactive Button Example' } },
      {
        button: {
          text: '🎉 Click Me!',
          style: 'padding: 12px 24px; font-size: 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;',
          onclick: 'this.textContent = this.textContent === "🎉 Click Me!" ? "✅ Clicked!" : "🎉 Click Me!"; this.style.background = this.textContent === "✅ Clicked!" ? "#10b981" : "#3b82f6";'
        }
      },
      { p: { text: 'This button changes when clicked!', style: 'margin-top: 16px; color: #666;' } }
    ]
  }
});

return ButtonComponent();\`;
                                                              if (window.setEditorContent) {
                                                                window.setEditorContent(code);
                                                              } else {
                                                                console.error('setEditorContent not available');
                                                              }
                                                              document.getElementById('templates-menu').style.display = 'none';
                                                            `,
                                                            text: '🎯 Interactive Component'
                                                        }
                                                    },
                                                    {
                                                        button: {
                                                            className: 'template-option',
                                                            style: 'width: 100%; text-align: left; padding: 12px 16px; border: none; background: none; cursor: pointer; border-bottom: 1px solid #eee;',
                                                            onclick: `
                                                              const code = \`// Full HTML Page (Preview-Safe Version)
// This creates a complete page structure without affecting the playground
const FullPage = () => ({
  div: {
    className: 'full-page-preview',
    style: 'font-family: system-ui, sans-serif; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;',
    children: [
      {
        div: {
          className: 'page-container',
          style: 'max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);',
          children: [
            {
              header: {
                style: 'text-align: center; margin-bottom: 30px;',
                children: [
                  { h1: { text: '🚀 My Coherent.js App', style: 'color: #1e293b; margin-bottom: 8px;' } },
                  { p: { text: 'A complete page layout built with Coherent.js', style: 'color: #64748b; margin: 0;' } }
                ]
              }
            },
            {
              main: {
                children: [
                  {
                    div: {
                      style: 'margin: 20px 0; padding: 20px; background: #f3f4f6; border-radius: 8px;',
                      children: [
                        { h3: { text: '✨ Feature One', style: 'color: #1e293b; margin-bottom: 8px;' } },
                        { p: { text: 'This demonstrates a complete page structure with scoped styling that will not interfere with the playground interface.', style: 'color: #475569; margin: 0;' } }
                      ]
                    }
                  },
                  {
                    div: {
                      style: 'margin: 20px 0; padding: 20px; background: #f3f4f6; border-radius: 8px;',
                      children: [
                        { h3: { text: '🎯 Feature Two', style: 'color: #1e293b; margin-bottom: 8px;' } },
                        { p: { text: 'All styles are applied inline or through scoped classes to prevent global style conflicts.', style: 'color: #475569; margin: 0;' } }
                      ]
                    }
                  },
                  {
                    div: {
                      style: 'margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;',
                      children: [
                        { h3: { text: '🌟 Styled Feature', style: 'margin-bottom: 8px;' } },
                        { p: { text: 'This example shows how to create rich, styled components without global CSS conflicts.', style: 'margin: 0; opacity: 0.9;' } }
                      ]
                    }
                  }
                ]
              }
            },
            {
              footer: {
                style: 'text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;',
                children: [
                  { p: { text: 'Built with Coherent.js - Pure JavaScript Components', style: 'color: #64748b; margin: 0; font-size: 14px;' } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
});

return FullPage();\`;
                                                              if (window.setEditorContent) {
                                                                window.setEditorContent(code);
                                                              } else {
                                                                console.error('setEditorContent not available');
                                                              }
                                                              document.getElementById('templates-menu').style.display = 'none';
                                                            `,
                                                            text: '📄 Full HTML Page'
                                                        }
                                                    },
                                                    {
                                                        button: {
                                                            className: 'template-option',
                                                            style: 'width: 100%; text-align: left; padding: 12px 16px; border: none; background: none; cursor: pointer;',
                                                            onclick: `
                                                              const code = \`// Data List Component
const data = [
  { id: 1, name: 'Alice', role: 'Developer' },
  { id: 2, name: 'Bob', role: 'Designer' },
  { id: 3, name: 'Carol', role: 'Manager' }
];

const DataList = ({ items }) => ({
  div: {
    style: 'padding: 24px; font-family: system-ui, sans-serif;',
    children: [
      { h2: { text: 'Team Members' } },
      {
        div: {
          style: 'display: grid; gap: 16px; margin-top: 20px;',
          children: items.map(item => ({
            div: {
              key: item.id,
              style: 'padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb;',
              children: [
                { h4: { text: item.name, style: 'margin: 0 0 8px 0; color: #1f2937;' } },
                { p: { text: item.role, style: 'margin: 0; color: #6b7280;' } }
              ]
            }
          }))
        }
      }
    ]
  }
});

// Render with data
return DataList({ items: data });\`;
                                                              if (window.setEditorContent) {
                                                                window.setEditorContent(code);
                                                              } else {
                                                                console.error('setEditorContent not available');
                                                              }
                                                              document.getElementById('templates-menu').style.display = 'none';
                                                            `,
                                                            text: '📊 Data List'
                                                        }
                                                    },
                                                    {
                                                        button: {
                                                            className: 'template-option',
                                                            style: 'width: 100%; text-align: left; padding: 12px 16px; border: none; background: none; cursor: pointer; border-bottom: 1px solid #eee;',
                                                            onclick: `
                                                              const code = \`// Real Coherent.js Example (based on basic-usage.js)
// Greeting component with conditional rendering
const Greeting = ({ name = 'World', mood = 'happy' }) => ({
  div: {
    className: 'greeting greeting--' + mood,
    style: 'padding: 20px; font-family: system-ui, sans-serif; border-radius: 8px; margin: 16px 0;',
    children: [
      { h2: { text: 'Hello, ' + name + '!', style: 'color: #1f2937; margin-bottom: 8px;' } },
      { p: { text: 'You seem ' + mood + ' today', style: 'color: #6b7280; margin-bottom: 12px;' } },
      mood === 'fantastic' ? {
        div: {
          className: 'celebration',
          style: 'background: #fef3c7; padding: 12px; border-radius: 6px; text-align: center;',
          children: [
            { span: { text: '🎉 Amazing! 🎉', style: 'color: #92400e; font-weight: bold;' } }
          ]
        }
      } : null
    ].filter(Boolean)
  }
});

// User profile component with styling
const UserCard = ({ user }) => ({
  div: {
    className: 'user-card',
    style: 'border: 1px solid #e5e7eb; padding: 16px; margin: 12px 0; border-radius: 8px; background: #f9fafb;',
    children: [
      { h3: { text: user.name, style: 'margin: 0 0 8px 0; color: #1f2937;' } },
      { p: { text: 'Email: ' + user.email, style: 'margin: 4px 0; color: #6b7280;' } },
      { p: { text: 'Role: ' + user.role, style: 'margin: 4px 0; color: #6b7280;' } }
    ]
  }
});

// Sample data
const sampleUsers = [
  { name: 'Alice Johnson', email: 'alice@example.com', role: 'Frontend Developer' },
  { name: 'Bob Smith', email: 'bob@example.com', role: 'Backend Developer' },
  { name: 'Carol Davis', email: 'carol@example.com', role: 'UI Designer' }
];

// Demo component combining everything
const Demo = () => ({
  div: {
    style: 'max-width: 800px; margin: 0 auto; padding: 20px;',
    children: [
      { h1: { text: 'Coherent.js Component Demo', style: 'text-align: center; color: #1f2937; margin-bottom: 24px;' } },
      Greeting({ name: 'Developer', mood: 'fantastic' }),
      Greeting({ name: 'Visitor', mood: 'happy' }),
      { h2: { text: 'Team Members', style: 'color: #1f2937; margin: 24px 0 16px 0;' } },
      ...sampleUsers.map(user => UserCard({ user }))
    ]
  }
});

// Render the demo
return Demo();\`;
                                                              if (window.setEditorContent) {
                                                                window.setEditorContent(code);
                                                              } else {
                                                                console.error('setEditorContent not available');
                                                              }
                                                              document.getElementById('templates-menu').style.display = 'none';
                                                            `,
                                                            text: '🎭 Component Demo'
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                span: {
                                    style: 'margin-left: 12px; font-size: 14px; color: #666;',
                                    text: '💡 Tip: Ctrl+Enter to execute • Ctrl+Space for autocomplete • Shift+Alt+F to format'
                                }
                            }
                        ]
                    }
                },

                {
                    div: {
                        className: 'playground-grid',
                        style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;',
                        children: [

                            // Left column: Code editor
                            {
                                div: {
                                    className: 'editor-section', children: [
                                        {h3: {text: 'JavaScript Code', style: 'margin-bottom: 8px;'}},
                                        {
                                            div: {
                                                id: 'editor-container',
                                                style: 'width: 100%; height: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box;'
                                            }
                                        }
                                    ]
                                }
                            },

                            // Right column: Output sections
                            {
                                div: {
                                    className: 'output-section', children: [
                                        // Status
                                        {
                                            div: {
                                                className: 'status-section', style: 'margin-bottom: 16px;', children: [
                                                    {h3: {text: 'Status', style: 'margin-bottom: 8px;'}},
                                                    {
                                                        div: {
                                                            id: 'output',
                                                            className: 'output-status',
                                                            style: 'padding: 12px; border-radius: 6px; background: #f3f4f6; color: #374151; font-size: 14px;',
                                                            text: 'Ready to run your component...'
                                                        }
                                                    }
                                                ]
                                            }
                                        },

                                        // Tabbed Output
                                        {
                                            div: {
                                                className: 'tabbed-output',
                                                style: 'flex: 1; display: flex; flex-direction: column;',
                                                children: [
                                                    // Tab buttons
                                                    {
                                                        div: {
                                                            className: 'tab-buttons',
                                                            style: 'display: flex; gap: 8px; margin-bottom: 16px;',
                                                            children: [
                                                                {
                                                                    button: {
                                                                        id: 'tab-preview',
                                                                        className: 'tab-button active',
                                                                        onclick: `
                        document.getElementById('tab-preview').classList.add('active');
                        document.getElementById('tab-html').classList.remove('active');
                        document.getElementById('panel-preview').style.display = 'block';
                        document.getElementById('panel-html').style.display = 'none';
                      `,
                                                                        text: 'Live Preview'
                                                                    }
                                                                },
                                                                {
                                                                    button: {
                                                                        id: 'tab-html',
                                                                        className: 'tab-button',
                                                                        onclick: `
                        document.getElementById('tab-html').classList.add('active');
                        document.getElementById('tab-preview').classList.remove('active');
                        document.getElementById('panel-html').style.display = 'block';
                        document.getElementById('panel-preview').style.display = 'none';
                      `,
                                                                        text: 'Generated HTML'
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    },

                                                    // Tab panels
                                                    {
                                                        div: {
                                                            className: 'tab-panels',
                                                            style: 'flex: 1; position: relative;',
                                                            children: [
                                                                // Live Preview panel
                                                                {
                                                                    div: {
                                                                        id: 'panel-preview',
                                                                        className: 'tab-panel',
                                                                        style: 'display: block; height: 100%;',
                                                                        children: [
                                                                            {
                                                                                div: {
                                                                                    id: 'preview',
                                                                                    style: 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; height: 100%; overflow: auto;',
                                                                                    text: 'Component preview will appear here...'
                                                                                }
                                                                            }
                                                                        ]
                                                                    }
                                                                },

                                                                // Generated HTML panel
                                                                {
                                                                    div: {
                                                                        id: 'panel-html',
                                                                        className: 'tab-panel',
                                                                        style: 'display: none; height: 100%;',
                                                                        children: [
                                                                            {
                                                                                pre: {
                                                                                    id: 'source',
                                                                                    style: 'background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; height: 100%; overflow: auto; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.4; white-space: pre-wrap; margin: 0;',
                                                                                    text: 'Generated HTML will appear here...'
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
}
