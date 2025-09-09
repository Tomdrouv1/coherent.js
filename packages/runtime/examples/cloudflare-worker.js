import { EdgeRuntime } from '@coherentjs/runtime/edge';

export default {
  async fetch(request) {
    const app = EdgeRuntime.createApp();
    
    // Define a simple page component
    const HomePage = () => ({
      html: {
        head: {
          title: { text: 'Hello from Cloudflare!' }
        },
        body: {
          children: [
            { h1: { text: 'Welcome to Coherent.js on Cloudflare Workers!' } },
            { p: { text: 'This page is rendered at the edge.' } },
            { 
              div: { 
                text: `Request time: ${new Date().toISOString()}` 
              } 
            }
          ]
        }
      }
    });
    
    app.route('/', () => ({
      component: HomePage
    }));
    
    app.route('/api/hello', () => ({
      json: { message: 'Hello from the edge!', timestamp: Date.now() }
    }));
    
    return app.fetch(request);
  }
};