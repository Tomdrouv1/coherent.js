/**
 * Dev Preview Component
 * 
 * This component is designed for testing the development server's live preview functionality.
 * It demonstrates basic component structure and styling capabilities.
 */

// Enhanced dev server preview component
export const DevPreview = ({ 
  title = 'Coherent.js Development Server', 
  message = 'Welcome to the live preview environment!' 
}) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title } },
            {
              style: {
                text: `
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  max-width: 900px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100dvh;
                  color: #333;
                }
                .container {
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                  overflow: hidden;
                }
                .header { 
                  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                  color: white;
                  padding: 30px; 
                  text-align: center;
                }
                .header h1 {
                  margin: 0 0 10px 0;
                  font-size: 2.5em;
                  font-weight: 300;
                }
                .header p {
                  margin: 0;
                  opacity: 0.9;
                  font-size: 1.1em;
                }
                .content { 
                  padding: 30px; 
                }
                .features-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 20px;
                  margin: 30px 0;
                }
                .feature { 
                  background: #f8f9fa; 
                  padding: 25px; 
                  border-radius: 8px; 
                  border-left: 4px solid #007bff;
                  transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .feature:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 4px 12px rgba(0,123,255,0.15);
                }
                .feature h3 {
                  color: #007bff;
                  margin: 0 0 10px 0;
                  font-size: 1.3em;
                }
                .feature p {
                  margin: 0;
                  line-height: 1.6;
                  color: #666;
                }
                .status-bar {
                  background: #e7f3ff;
                  border: 1px solid #007bff;
                  border-radius: 6px;
                  padding: 20px;
                  margin: 30px 0;
                  text-align: center;
                }
                .status-indicator {
                  display: inline-block;
                  width: 12px;
                  height: 12px;
                  background: #28a745;
                  border-radius: 50%;
                  margin-right: 8px;
                  animation: pulse 2s infinite;
                }
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.5; }
                  100% { opacity: 1; }
                }
                .footer {
                  background: #f8f9fa;
                  padding: 20px 30px;
                  border-top: 1px solid #e9ecef;
                  text-align: center;
                  color: #666;
                }
                .badge {
                  display: inline-block;
                  background: #007bff;
                  color: white;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-size: 0.8em;
                  font-weight: bold;
                  margin-left: 8px;
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
                className: 'container',
                children: [
                  {
                    div: {
                      className: 'header',
                      children: [
                        { h1: { text: title } },
                        { p: { text: 'Live Preview Environment with Hot Reload' } }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'content',
                      children: [
                        {
                          div: {
                            className: 'status-bar',
                            children: [
                              {
                                span: {
                                  children: [
                                    { span: { className: 'status-indicator' } },
                                    { span: { text: 'Development Server Active' } },
                                    { span: { text: 'LIVE', className: 'badge' } }
                                  ]
                                }
                              }
                            ]
                          }
                        },
                        { h2: { text: 'Development Features' } },
                        {
                          div: {
                            className: 'features-grid',
                            children: [
                              {
                                div: {
                                  className: 'feature',
                                  children: [
                                    { h3: { text: '🔄 Live Preview' } },
                                    { p: { text: 'Changes to components are automatically reflected in the browser without manual refresh.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature',
                                  children: [
                                    { h3: { text: '⚡ Hot Reload' } },
                                    { p: { text: 'The page automatically reloads when you save changes to source files, preserving development flow.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature',
                                  children: [
                                    { h3: { text: '🎨 Component Rendering' } },
                                    { p: { text: message } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature',
                                  children: [
                                    { h3: { text: '🔧 Development Tools' } },
                                    { p: { text: 'Built-in development server with file watching, error handling, and component isolation.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature',
                                  children: [
                                    { h3: { text: '📱 Responsive Design' } },
                                    { p: { text: 'Components are automatically tested across different viewport sizes and device types.' } }
                                  ]
                                }
                              },
                              {
                                div: {
                                  className: 'feature',
                                  children: [
                                    { h3: { text: '🚀 Fast Development' } },
                                    { p: { text: 'Optimized build pipeline ensures rapid iteration and immediate feedback during development.' } }
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
                    div: {
                      className: 'footer',
                      children: [
                        { p: { text: '💡 Try editing this file and saving it to see live updates in action!' } },
                        { p: { text: 'Powered by Coherent.js Development Server' } }
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

// Export the component as default for live preview
export default DevPreview;
