/**
 * Context Example
 * 
 * This example demonstrates context usage patterns in Coherent.js:
 * - Creating and using context providers
 * - Theme switching with context
 * - Nested context providers
 * - Context consumption in components
 */

import { createContextProvider, useContext } from '../src/state/state-manager.js';

// Themed button component that uses context
export const ThemedButton = ({ text = 'Click me', variant = 'primary' }) => {
  const theme = useContext('theme') || 'light';
  const user = useContext('user') || { name: 'Guest' };
  
  return {
    button: {
      className: `btn btn-${variant} theme-${theme}`,
      text: `${text} (${user.name})`,
      onclick: typeof window !== 'undefined' ? () => {
        console.log(`Button clicked by ${user.name} with ${theme} theme`);
      } : null
    }
  };
};

// Card component that uses multiple contexts
export const ThemedCard = ({ title, content }) => {
  const theme = useContext('theme') || 'light';
  const settings = useContext('settings') || { fontSize: 'medium' };
  
  return {
    div: {
      className: `card theme-${theme} font-${settings.fontSize}`,
      children: [
        {
          h3: {
            text: title,
            className: 'card-title'
          }
        },
        {
          p: {
            text: content,
            className: 'card-content'
          }
        },
        ThemedButton({ text: 'Learn More', variant: 'secondary' })
      ]
    }
  };
};

// Navigation component
export const Navigation = () => {
  const theme = useContext('theme') || 'light';
  const user = useContext('user') || { name: 'Guest', role: 'visitor' };
  
  return {
    nav: {
      className: `navigation theme-${theme}`,
      children: [
        {
          div: {
            className: 'nav-brand',
            children: [
              { span: { text: 'Coherent.js Context Demo', className: 'brand-text' } }
            ]
          }
        },
        {
          div: {
            className: 'nav-user',
            children: [
              { span: { text: `Welcome, ${user.name}`, className: 'user-greeting' } },
              { span: { text: `(${user.role})`, className: 'user-role' } }
            ]
          }
        }
      ]
    }
  };
};

// Complete context demo page
export const contextDemo = {
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'Context Demo - Coherent.js' } },
            {
              style: {
                text: `
                body { 
                  font-family: Arial, sans-serif; 
                  max-width: 1000px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  line-height: 1.6;
                  transition: all 0.3s ease;
                }
                .demo-container {
                  background: white;
                  padding: 30px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .theme-section {
                  margin: 30px 0;
                  padding: 25px;
                  border-radius: 8px;
                  border: 2px solid #e0e0e0;
                }
                .theme-light {
                  background: #ffffff;
                  color: #333333;
                  border-color: #007bff;
                }
                .theme-dark {
                  background: #2d3748;
                  color: #ffffff;
                  border-color: #4a5568;
                }
                .theme-colorful {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: #ffffff;
                  border-color: #667eea;
                }
                .navigation {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 15px 20px;
                  border-radius: 6px;
                  margin-bottom: 20px;
                }
                .navigation.theme-light {
                  background: #f8f9fa;
                  border: 1px solid #dee2e6;
                }
                .navigation.theme-dark {
                  background: #1a202c;
                  border: 1px solid #4a5568;
                }
                .navigation.theme-colorful {
                  background: rgba(255,255,255,0.1);
                  border: 1px solid rgba(255,255,255,0.2);
                }
                .brand-text {
                  font-weight: bold;
                  font-size: 1.2em;
                }
                .user-greeting {
                  margin-right: 10px;
                }
                .user-role {
                  opacity: 0.7;
                  font-style: italic;
                }
                .card {
                  padding: 20px;
                  border-radius: 6px;
                  margin: 15px 0;
                  transition: all 0.3s ease;
                }
                .card.theme-light {
                  background: #f8f9fa;
                  border: 1px solid #dee2e6;
                }
                .card.theme-dark {
                  background: #1a202c;
                  border: 1px solid #4a5568;
                }
                .card.theme-colorful {
                  background: rgba(255,255,255,0.1);
                  border: 1px solid rgba(255,255,255,0.2);
                }
                .card-title {
                  margin-bottom: 10px;
                  font-size: 1.3em;
                }
                .card-content {
                  margin-bottom: 15px;
                  line-height: 1.5;
                }
                .font-small { font-size: 0.9em; }
                .font-medium { font-size: 1em; }
                .font-large { font-size: 1.1em; }
                .btn {
                  padding: 10px 20px;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 14px;
                  transition: all 0.2s;
                  margin: 5px;
                }
                .btn-primary.theme-light {
                  background: #007bff;
                  color: white;
                }
                .btn-primary.theme-light:hover {
                  background: #0056b3;
                }
                .btn-primary.theme-dark {
                  background: #4a5568;
                  color: white;
                }
                .btn-primary.theme-dark:hover {
                  background: #2d3748;
                }
                .btn-primary.theme-colorful {
                  background: rgba(255,255,255,0.2);
                  color: white;
                  border: 1px solid rgba(255,255,255,0.3);
                }
                .btn-primary.theme-colorful:hover {
                  background: rgba(255,255,255,0.3);
                }
                .btn-secondary.theme-light {
                  background: #6c757d;
                  color: white;
                }
                .btn-secondary.theme-light:hover {
                  background: #545b62;
                }
                .btn-secondary.theme-dark {
                  background: #718096;
                  color: white;
                }
                .btn-secondary.theme-dark:hover {
                  background: #4a5568;
                }
                .btn-secondary.theme-colorful {
                  background: rgba(255,255,255,0.1);
                  color: white;
                  border: 1px solid rgba(255,255,255,0.2);
                }
                .btn-secondary.theme-colorful:hover {
                  background: rgba(255,255,255,0.2);
                }
                h1 {
                  text-align: center;
                  color: #333;
                  margin-bottom: 10px;
                }
                .subtitle {
                  text-align: center;
                  color: #666;
                  margin-bottom: 30px;
                  font-style: italic;
                }
                .section-title {
                  color: #007bff;
                  border-bottom: 2px solid #007bff;
                  padding-bottom: 5px;
                  margin-bottom: 20px;
                }
                `
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
                className: 'demo-container',
                children: [
                  { h1: { text: 'Context Usage Demo' } },
                  { p: { 
                    text: 'This demo shows how context providers work in Coherent.js, allowing components to share data without prop drilling.',
                    className: 'subtitle'
                  }},
                  
                  {
                    div: {
                      className: 'theme-section theme-light',
                      children: [
                        { h2: { text: 'Light Theme Context', className: 'section-title' } },
                        createContextProvider('theme', 'light', 
                          createContextProvider('user', { name: 'Alice', role: 'admin' },
                            createContextProvider('settings', { fontSize: 'medium' }, {
                              div: {
                                children: [
                                  Navigation(),
                                  ThemedCard({ 
                                    title: 'Light Theme Card', 
                                    content: 'This card uses the light theme context. All nested components automatically inherit the theme styling.' 
                                  }),
                                  {
                                    div: {
                                      children: [
                                        ThemedButton({ text: 'Primary Action' }),
                                        ThemedButton({ text: 'Secondary Action', variant: 'secondary' })
                                      ]
                                    }
                                  }
                                ]
                              }
                            })
                          )
                        )
                      ]
                    }
                  },
                  
                  {
                    div: {
                      className: 'theme-section theme-dark',
                      children: [
                        { h2: { text: 'Dark Theme Context', className: 'section-title' } },
                        createContextProvider('theme', 'dark',
                          createContextProvider('user', { name: 'Bob', role: 'user' },
                            createContextProvider('settings', { fontSize: 'large' }, {
                              div: {
                                children: [
                                  Navigation(),
                                  ThemedCard({ 
                                    title: 'Dark Theme Card', 
                                    content: 'This card uses the dark theme context. Notice how the same components render differently based on context.' 
                                  }),
                                  {
                                    div: {
                                      children: [
                                        ThemedButton({ text: 'Dark Action' }),
                                        ThemedButton({ text: 'Dark Secondary', variant: 'secondary' })
                                      ]
                                    }
                                  }
                                ]
                              }
                            })
                          )
                        )
                      ]
                    }
                  },
                  
                  {
                    div: {
                      className: 'theme-section theme-colorful',
                      children: [
                        { h2: { text: 'Colorful Theme Context', className: 'section-title' } },
                        createContextProvider('theme', 'colorful',
                          createContextProvider('user', { name: 'Charlie', role: 'designer' },
                            createContextProvider('settings', { fontSize: 'small' }, {
                              div: {
                                children: [
                                  Navigation(),
                                  ThemedCard({ 
                                    title: 'Colorful Theme Card', 
                                    content: 'This demonstrates a custom theme with gradient backgrounds. Context makes it easy to switch themes globally.' 
                                  }),
                                  {
                                    div: {
                                      children: [
                                        ThemedButton({ text: 'Colorful Action' }),
                                        ThemedButton({ text: 'Colorful Secondary', variant: 'secondary' })
                                      ]
                                    }
                                  }
                                ]
                              }
                            })
                          )
                        )
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

// Export the demo page as default for live preview
export default contextDemo;

