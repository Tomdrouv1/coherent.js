import { StaticRuntime } from '@coherent.js/runtime/static';

// Create components
const Layout = ({ title, children }) => ({
  html: {
    head: {
      title: { text: title },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    },
    body: {
      children: [
        { header: { h1: { text: 'My Static Site' } } },
        { main: { children } },
        { footer: { p: { text: '© 2025 My Site' } } }
      ]
    }
  }
});

const HomePage = () => Layout({
  title: 'Home',
  children: [
    { h2: { text: 'Welcome!' } },
    { p: { text: 'This is a static site built with Coherent.js' } }
  ]
});

const AboutPage = () => Layout({
  title: 'About', 
  children: [
    { h2: { text: 'About Us' } },
    { p: { text: 'We build awesome static sites!' } }
  ]
});

// Build the site
const site = StaticRuntime.createApp({
  outputDir: 'dist',
  baseUrl: 'https://mysite.com'
});

site.component('Layout', Layout);
site.component('HomePage', HomePage);
site.component('AboutPage', AboutPage);

site.page('/', 'HomePage');
site.page('/about', 'AboutPage');

const result = await site.build();
console.log(`Built ${result.stats.pagesGenerated} pages in ${result.stats.buildTime}ms`);