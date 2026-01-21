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
          { div: { className: 'badges', children: [
            { img: { id: 'coverage-badge', src: 'https://img.shields.io/badge/coverage-NA-red', alt: 'Coverage', className: 'badge' } },
            { img: { src: 'https://img.shields.io/badge/version-beta.5-blue', alt: 'version', className: 'badge' } },
            { img: { src: 'https://img.shields.io/github/actions/workflow/status/Tomdrouv1/coherent.js/ci.yml?branch=main', alt: 'CI Status', className: 'badge' } }
          ] } },
          { div: { className: 'cta', children: [
            { a: { className: 'button primary', href: 'starter-app', text: '🚀 Starter App' } },
            { a: { className: 'button', href: 'docs', text: 'Docs' } },
            { a: { className: 'button', href: 'examples', text: 'Examples' } }
          ] } }
        ] } },

        // Install
        { section: { className: 'install', children: [
          { h3: { text: 'Install' } },
          { pre: { className: 'code-block', children: [ { code: { text: 'pnpm add @coherent.js/core' } } ] } }
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

        // Interactive Hydration Demo
        { section: { className: 'hydration-demo', children: [
          { h3: { text: 'Live Hydration Demo' } },
          { p: { className: 'demo-description', text: 'This counter uses Phase 2 hydration: event delegation, state serialization, and the clean hydrate() API.' } },
          {
            div: {
              id: 'counter-demo',
              className: 'demo-container',
              'data-coherent-hydrate': 'CounterComponent',
              'data-state': 'eyUyMmNvdW50JTIyJTNBMH0=',  // Base64 encoded {"count":0}
              children: [
                { div: { className: 'counter-display', children: [
                  { span: { className: 'counter-label', text: 'Count: ' } },
                  { span: { id: 'counter-value', className: 'counter-value', text: '0' } }
                ] } },
                { div: { className: 'counter-buttons', children: [
                  { button: { id: 'decrement-btn', className: 'button', text: '−' } },
                  { button: { id: 'increment-btn', className: 'button primary', text: '+' } },
                  { button: { id: 'reset-btn', className: 'button', text: 'Reset' } }
                ] } },
                { div: { className: 'demo-info', children: [
                  { small: { text: 'Check DevTools console for hydration logs. State persists in data-state attribute.' } }
                ] } }
              ]
            }
          }
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

// Add script to load coverage badge
const coverageScript = `
<script>
  async function loadCoverageBadge() {
    try {
      const response = await fetch('/coverage-summary.json');
      if (response.ok) {
        const data = await response.json();
        const coverage = data.total.lines.pct;
        const badge = document.getElementById('coverage-badge');
        if (badge) {
          // Determine color based on coverage
          let color = 'red';
          if (coverage >= 80) color = 'brightgreen';
          else if (coverage >= 60) color = 'yellow';

          badge.src = \`https://img.shields.io/badge/coverage-\${coverage}%25-\${color}\`;
          badge.alt = \`Coverage: \${coverage}%\`;
        }
      }
    } catch (error) {
      console.log('Could not load coverage badge:', error);
    }
  }

  // Load coverage when page is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCoverageBadge);
  } else {
    loadCoverageBadge();
  }
</script>
`;

export { coverageScript };
