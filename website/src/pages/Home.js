// Home.js - simple landing content
import { Island } from '../../../packages/core/src/index.js';

// Counter component wrapped with Island() for automatic hydration attributes
const CounterIsland = Island(function CounterComponent() {
  return {
    div: {
      id: 'counter-demo',
      className: 'demo-container',
      'data-coherent-state': 'eyJjb3VudCI6MH0=',
      children: [
        { div: { className: 'counter-display', children: [
          { span: { className: 'counter-label', text: 'Count: ' } },
          { span: { id: 'counter-value', className: 'counter-value', text: '0' } }
        ] } },
        { div: { className: 'counter-buttons', children: [
          { button: { id: 'decrement-btn', className: 'button', 'aria-label': 'Decrement counter', text: '−' } },
          { button: { id: 'increment-btn', className: 'button primary', 'aria-label': 'Increment counter', text: '+' } },
          { button: { id: 'reset-btn', className: 'button', text: 'Reset' } }
        ] } },
        { div: { className: 'demo-info', children: [
          { small: { text: 'Only this Island is interactive. Check DevTools console for hydration logs.' } }
        ] } }
      ]
    }
  };
});

export function Home() {
  return {
    section: {
      className: 'home',
      children: [
        // Hero
        { div: { className: 'hero', children: [
          // Animated dot grid behind the hero
          { div: { className: 'hero-grid', 'aria-hidden': 'true' } },
          // Floating accent orb
          { div: { className: 'hero-orb', 'aria-hidden': 'true' } },
          { h1: { className: 'title', text: 'Coherent.js' } },
          { p: { className: 'lead', text: 'Fast SSR and hydration with plain JS objects. Minimal API. Maximum clarity.' } },
          { div: { className: 'badges', children: [
            { img: { src: 'https://img.shields.io/badge/version-1.0.0--beta.7-blue', alt: 'version', className: 'badge' } }
          ] } },
          { div: { className: 'cta', children: [
            { a: { className: 'button primary', href: 'starter-app', text: 'Get Started' } },
            { a: { className: 'button secondary', href: 'docs', text: 'Documentation' } },
            { a: { className: 'button', href: 'examples', text: 'Examples' } }
          ] } },
          // Inline code preview
          { div: { className: 'hero-code-preview', children: [
            { pre: { className: 'hero-code', children: [
              { code: { text: `const App = () => ({
  div: {
    className: 'app',
    children: [
      { h1: { text: 'Hello World' } },
      { p: { text: 'Pure objects. Zero JSX.' } }
    ]
  }
});` } }
            ] } }
          ] } },
        ] } },

        // Install
        { section: { className: 'install reveal', children: [
          { h2: { text: 'Install' } },
          { div: { className: 'install-tabs', children: [
            { button: { className: 'install-tab active', 'data-pkg': 'pnpm', text: 'pnpm', onclick: 'switchInstallTab(this, "pnpm add @coherent.js/core")' } },
            { button: { className: 'install-tab', 'data-pkg': 'npm', text: 'npm', onclick: 'switchInstallTab(this, "npm install @coherent.js/core")' } },
            { button: { className: 'install-tab', 'data-pkg': 'yarn', text: 'yarn', onclick: 'switchInstallTab(this, "yarn add @coherent.js/core")' } }
          ] } },
          { div: { className: 'code-block-wrapper', children: [
            { pre: { className: 'code-block', children: [ { code: { id: 'install-cmd', text: 'pnpm add @coherent.js/core' } } ] } },
            { button: { className: 'copy-btn', 'aria-label': 'Copy to clipboard', onclick: 'copyCode(this)', text: 'Copy' } }
          ] } }
        ] } },

        // Key features
        { section: { className: 'features reveal', children: [
          { h2: { text: 'Why Coherent.js?' } },
          { ul: { className: 'features-grid', children: [
            { li: { children: [ { span: { className: 'feature-icon', text: '🧩' } }, { h3: { text: 'Object-Based Components' } }, { p: { text: 'Author UI as plain JS objects. Zero JSX, zero build step required for core rendering.' } } ] } },
            { li: { children: [ { span: { className: 'feature-icon', text: '🏝️' } }, { h3: { text: 'Islands Architecture' } }, { p: { text: 'Ship zero JavaScript by default. Only hydrate the interactive parts of your page.' } } ] } },
            { li: { children: [ { span: { className: 'feature-icon', text: '🔧' } }, { h3: { text: 'FP-First Patterns' } }, { p: { text: 'Built-in composition tools (HOCs, pipe, combine) for functional programming lovers.' } } ] } },
            { li: { children: [ { span: { className: 'feature-icon', text: '⚡' } }, { h3: { text: 'Extreme Performance' } }, { p: { text: '50x faster cache key generation and streaming SSR for lightning-fast responses.' } } ] } }
          ] } }
        ] } },

        // Interactive Island Demo — uses Island() wrapper from @coherent.js/core
        { section: { className: 'hydration-demo reveal', children: [
          { h2: { text: '🏝️ Live Island Demo' } },
          { p: { className: 'demo-description', text: 'This counter is an "Island". Only this component is hydrated, while the rest of the page remains static and zero-JS.' } },
          CounterIsland()
        ] } },

        // Quick links
        { section: { className: 'quick-links reveal', children: [
          { h2: { text: 'Quick Links' } },
          { ul: { className: 'links', children: [
            { li: { children: [ { a: { href: 'docs/getting-started/installation', text: 'Getting Started' } } ] } },
            { li: { children: [ { a: { href: 'docs/api/reference', text: 'API Reference' } } ] } },
            { li: { children: [ { a: { href: 'docs/deployment/integrations', text: 'Framework Integrations' } } ] } },
            { li: { children: [ { a: { href: 'changelog', text: 'Changelog' } } ] } }
          ] } }
        ] } },

        // Inline scripts for install tabs, copy button, and mouse-tracking
        { script: { text: `
          function switchInstallTab(btn, cmd) {
            document.querySelectorAll('.install-tab').forEach(function(t) { t.classList.remove('active'); });
            btn.classList.add('active');
            document.getElementById('install-cmd').textContent = cmd;
          }
          function copyCode(btn) {
            var code = btn.closest('.code-block-wrapper').querySelector('code');
            if (code) {
              navigator.clipboard.writeText(code.textContent).then(function() {
                btn.textContent = 'Copied!';
                setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
              });
            }
          }
          // Feature card mouse-tracking glow
          document.querySelectorAll('.features-grid li').forEach(function(card) {
            card.addEventListener('mousemove', function(e) {
              var rect = card.getBoundingClientRect();
              var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
              var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
              card.style.setProperty('--mouse-x', x + '%');
              card.style.setProperty('--mouse-y', y + '%');
            });
          });
        ` } }
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
