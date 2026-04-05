// Playground.js - Client-side Coherent.js component playground

// The runPlaygroundComponent function is now loaded from playground.js script

export function Playground() {
    return {
        section: {
            className: 'playground-container',
            children: [
                {div: { className: 'page-header', children: [
                    {h1: {text: 'Playground'}},
                    {p: {className: 'page-lead', text: 'Create and test Coherent.js components using JavaScript! Write components as pure JavaScript objects and see them rendered in real-time with live preview and HTML generation.'}}
                ] } },

                {
                    div: {
                        className: 'playground-controls reveal',
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
                                                onclick: 'toggleTemplatesMenu(event)',
                                                text: 'Templates ▼'
                                            }
                                        },
                                        {
                                            div: {
                                                id: 'templates-menu',
                                                className: 'templates-dropdown',
                                                children: [
                                                    { button: { className: 'template-option', text: 'Basic Component', onclick: `if(window.setEditorContent){window.setEditorContent(\`const Welcome = () => ({\\n  div: {\\n    style: 'padding: 24px; font-family: system-ui;',\\n    children: [\\n      { h1: { text: 'Hello Coherent.js!' } },\\n      { p: { text: 'Edit this and click Execute.' } }\\n    ]\\n  }\\n});\\n\\nreturn Welcome();\`)}var m=document.getElementById('templates-menu');m.removeAttribute('data-open');m.style.display='none';` } },
                                                    { button: { className: 'template-option', text: 'Interactive Button', onclick: `if(window.setEditorContent){window.setEditorContent(\`const App = () => ({\\n  div: {\\n    style: 'padding: 24px; font-family: system-ui;',\\n    children: [\\n      { h2: { text: 'Interactive Button' } },\\n      {\\n        button: {\\n          text: 'Click Me',\\n          style: 'padding: 12px 24px; font-size: 16px; background: #00e5a0; color: #0b0e13; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;',\\n          onclick: 'this.textContent = this.textContent === \"Clicked!\" ? \"Click Me\" : \"Clicked!\";'\\n        }\\n      }\\n    ]\\n  }\\n});\\n\\nreturn App();\`)}var m=document.getElementById('templates-menu');m.removeAttribute('data-open');m.style.display='none';` } },
                                                    { button: { className: 'template-option', text: 'Data List', onclick: `if(window.setEditorContent){window.setEditorContent(\`const data = [\\n  { id: 1, name: 'Alice', role: 'Developer' },\\n  { id: 2, name: 'Bob', role: 'Designer' },\\n  { id: 3, name: 'Carol', role: 'Manager' }\\n];\\n\\nconst DataList = ({ items }) => ({\\n  div: {\\n    style: 'padding: 24px; font-family: system-ui;',\\n    children: [\\n      { h2: { text: 'Team Members' } },\\n      {\\n        div: {\\n          style: 'display: grid; gap: 12px; margin-top: 16px;',\\n          children: items.map(item => ({\\n            div: {\\n              style: 'padding: 16px; border: 1px solid #ddd; border-radius: 8px;',\\n              children: [\\n                { h4: { text: item.name, style: 'margin: 0 0 4px;' } },\\n                { p: { text: item.role, style: 'margin: 0; color: #666;' } }\\n              ]\\n            }\\n          }))\\n        }\\n      }\\n    ]\\n  }\\n});\\n\\nreturn DataList({ items: data });\`)}var m=document.getElementById('templates-menu');m.removeAttribute('data-open');m.style.display='none';` } },
                                                    { button: { className: 'template-option', text: 'Greeting Cards', onclick: `if(window.setEditorContent){window.setEditorContent(\`const Greeting = ({ name, mood }) => ({\\n  div: {\\n    style: 'padding: 16px; margin: 8px 0; border-radius: 8px; border: 1px solid #ddd;',\\n    children: [\\n      { h3: { text: 'Hello, ' + name + '!' } },\\n      { p: { text: 'You seem ' + mood + ' today.' } }\\n    ]\\n  }\\n});\\n\\nconst App = () => ({\\n  div: {\\n    style: 'padding: 24px; font-family: system-ui; max-width: 600px;',\\n    children: [\\n      { h1: { text: 'Greeting Cards' } },\\n      Greeting({ name: 'Alice', mood: 'happy' }),\\n      Greeting({ name: 'Bob', mood: 'excited' }),\\n      Greeting({ name: 'Carol', mood: 'fantastic' })\\n    ]\\n  }\\n});\\n\\nreturn App();\`)}var m=document.getElementById('templates-menu');m.removeAttribute('data-open');m.style.display='none';` } }
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
                        className: 'playground-grid reveal',
                        style: 'margin-top: 16px;',
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
