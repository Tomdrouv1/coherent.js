/**
 * Example demonstrating Next.js integration with Coherent.js
 * This example shows how to use Coherent.js with Next.js API routes
 */

import { createCoherentNextHandler } from '../src/nextjs/coherent-nextjs.js';

// A simple Coherent.js component
function HomePage({ name = 'World' }) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: 'Coherent.js Next.js Example' } },
              {
                style: {
                  text: `
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; color: #333; }
                    .content { margin-top: 30px; }
                    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 0.9em; }
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
                    { h1: { text: 'Welcome to Coherent.js!' } },
                    { p: { text: `Hello, ${name}!` } }
                  ]
                }
              },
              {
                div: {
                  className: 'content',
                  children: [
                    { h2: { text: 'Features' } },
                    {
                      ul: {
                        children: [
                          { li: { text: '✅ Server-side rendering with Coherent.js' } },
                          { li: { text: '✅ Automatic performance monitoring' } },
                          { li: { text: '✅ Next.js API route integration' } },
                          { li: { text: '✅ Zero-configuration setup' } }
                        ]
                      }
                    },
                    {
                      p: {
                        text: 'This page was rendered with Coherent.js and served by Next.js!'
                      }
                    }
                  ]
                }
              },
              {
                div: {
                  className: 'footer',
                  children: [
                    { p: { text: 'Built with Coherent.js and Next.js' } }
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

// A component that uses request data
function UserPage(req) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { title: { text: `User: ${req.query.username}` } }
            ]
          }
        },
        {
          body: {
            children: [
              { h1: { text: `User Profile: ${req.query.username}` } },
              { p: { text: `Path: ${req.url}` } },
              { p: { text: `User Agent: ${req.headers['user-agent']}` } },
              { a: { href: '/', text: '← Back to Home' } }
            ]
          }
        }
      ]
    }
  };
}

// Create Next.js API route handlers
export const homeHandler = createCoherentNextHandler((req, res) => {
  return HomePage({ name: 'Next.js Developer' });
}, {
  enablePerformanceMonitoring: true
});

export const userHandler = createCoherentNextHandler((req, res) => {
  return UserPage(req);
});

// Export as default for Next.js API routes
export default homeHandler;

console.log('Next.js integration example created!');
console.log('To use with Next.js:');
console.log('1. Create pages/api/home.js with: export { homeHandler as default }');
console.log('2. Create pages/api/user/[username].js with: export { userHandler as default }');
