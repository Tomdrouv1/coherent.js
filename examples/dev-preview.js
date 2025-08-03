import { renderToString } from '../src/coherent.js';

// Simple component for dev server preview
const DevPreview = ({ title = 'Coherent.js Dev Preview', message = 'Hello from the development server!' }) => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: title } },
            {
              style: {
                html: `
                  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                  .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
                  .content { margin: 20px 0; }
                  .feature { background: #e8f4fd; padding: 15px; margin: 10px 0; border-radius: 5px; }
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
                className: 'header',
                children: [
                  { h1: { text: title } },
                  { p: { text: 'This component is being rendered in the Coherent.js development server with live preview.' } }
                ]
              }
            },
            {
              div: {
                className: 'content',
                children: [
                  { h2: { text: 'Features' } },
                  {
                    div: {
                      className: 'feature',
                      children: [
                        { h3: { text: 'Live Preview' } },
                        { p: { text: 'Changes to this component are automatically reflected in the browser.' } }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'feature',
                      children: [
                        { h3: { text: 'Hot Reload' } },
                        { p: { text: 'The page automatically reloads when you save changes to source files.' } }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'feature',
                      children: [
                        { h3: { text: 'Component Rendering' } },
                        { p: { text: message } }
                      ]
                    }
                  }
                ]
              }
            },
            {
              div: {
                children: [
                  { p: { text: 'Try editing this file and saving it to see live updates!' } }
                ]
              }
            }
          ]
        }
      }
    ]
  }
});

// For direct preview in dev server
export default DevPreview;

// For testing in Node.js
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(renderToString(DevPreview()));
}
