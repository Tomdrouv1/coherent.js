// Home.js - simple landing content
export function Home() {
  return {
    section: {
      className: 'home',
      children: [
        // Hero
        { div: { className: 'hero', children: [
          { h1: { className: 'title', text: 'Coherent.js' } },
          { p: { className: 'lead', text: 'Fast SSR and hydration with plain JS objects. Minimal API. Maximum clarity.' } },
          { div: { className: 'cta', children: [
            { a: { className: 'button primary', href: 'docs', text: 'Get Started' } },
            { a: { className: 'button', href: 'examples', text: 'Examples' } },
            { a: { className: 'button', href: 'performance', text: 'Performance' } }
          ] } }
        ] } },

        // Install
        { section: { className: 'install', children: [
          { h3: { text: 'Install' } },
          { pre: { className: 'code-block', children: [ { code: { text: 'pnpm add @coherentjs/core' } } ] } }
        ] } },

        // Key features
        { section: { className: 'features', children: [
          { h3: { text: 'Why Coherent.js?' } },
          { ul: { className: 'features-grid', children: [
            { li: { children: [ { strong: { text: 'Object-based components' } }, { p: { text: 'Author UI as plain JS objects. Zero JSX required.' } } ] } },
            { li: { children: [ { strong: { text: 'SSR-first, hydrable' } }, { p: { text: 'Render on the server and hydrate on the client when needed.' } } ] } },
            { li: { children: [ { strong: { text: 'Performance' } }, { p: { text: 'Outperforms Express and raw Node in API benchmarks.' } } ] } },
            { li: { children: [ { strong: { text: 'Tiny surface area' } }, { p: { text: 'Small API, easy mental model, fast to adopt.' } } ] } }
          ] } }
        ] } },

        // Quick links
        { section: { className: 'quick-links', children: [
          { h3: { text: 'Quick Links' } },
          { ul: { className: 'links', children: [
            { li: { children: [ { a: { href: 'docs/getting-started/installation', text: 'Getting Started' } } ] } },
            { li: { children: [ { a: { href: 'docs/api-reference', text: 'API Reference' } } ] } },
            { li: { children: [ { a: { href: 'docs/framework-integrations', text: 'Framework Integrations' } } ] } },
            { li: { children: [ { a: { href: 'changelog', text: 'Changelog' } } ] } }
          ] } }
        ] } }
      ]
    }
  };
}
