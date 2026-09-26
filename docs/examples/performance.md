# 📊 Performance Testing Page Example

This example builds an interactive page that benchmarks Coherent.js rendering in the browser: the server renders the page, and a client script runs the tests when a button is clicked. It follows the approach of the documentation website's `/performance` page (`website/src/pages/Performance.js` and `website/public/performance.js`).

For reproducible numbers, use the repository benchmark instead: `pnpm perf:render` renders realistic trees with warm-up rounds and compares them with a hand-written template-string baseline.

## Overview

1. A server-rendered component lays out the controls and an empty results area.
2. A browser bundle imports `render` from `@coherent.js/core` and runs the benchmarks.
3. The page is interactive either through `hydrate()` (handlers on the component) or through plain DOM listeners.

## 1. Benchmark Functions

Pure functions that build test trees and time `render()`:

```javascript
// benchmarks.js — runs in the browser and in Node
import { render } from '@coherent.js/core';

export const HeavyComponent = ({ depth = 0, maxDepth = 6, label = 'Node' }) =>
  depth >= maxDepth
    ? { span: { className: 'leaf-node', text: `${label} ${depth}` } }
    : {
        div: {
          className: `level-${depth}`,
          children: [0, 1].map((i) => HeavyComponent({ depth: depth + 1, maxDepth, label: `${label}-${i}` }))
        }
      };

export const DataTable = ({ rows }) => ({
  table: {
    children: [{
      tbody: {
        children: rows.map((row) => ({
          tr: { key: row.id, children: [{ td: { text: row.name } }, { td: { text: String(row.score) } }] }
        }))
      }
    }]
  }
});

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function benchmark(name, buildTree, { warmup = 20, rounds = 100 } = {}) {
  for (let i = 0; i < warmup; i++) render(buildTree());

  const times = [];
  let size = 0;
  for (let i = 0; i < rounds; i++) {
    const tree = buildTree();          // fresh data every round
    const start = performance.now();
    size = render(tree).length;
    times.push(performance.now() - start);
  }
  return { name, medianMs: median(times), htmlBytes: size };
}

export function runAllTests() {
  const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Row ${i}`, score: i % 100 }));
  return [
    benchmark('Nested tree (depth 6)', () => HeavyComponent({})),
    benchmark('Table, 1,000 rows', () => DataTable({ rows }), { rounds: 20 })
  ];
}
```

## 2. Server-Side Component

```javascript
// components/PerformancePage.js
export function PerformancePage({ results = [], running = false }) {
  return {
    div: {
      className: 'performance-page',
      children: [
        { h1: { text: 'Performance Testing' } },
        {
          button: {
            id: 'run-all-tests',
            className: 'button primary',
            disabled: running,
            text: running ? 'Running…' : 'Run All Performance Tests',
            onClick: (event) => {
              event.setState({ running: true });
              // Let the browser paint the "Running…" state before blocking the thread
              setTimeout(() => event.setState({ running: false, results: runAllTests() }), 0);
            }
          }
        },
        {
          table: {
            className: 'results',
            children: results.map((r) => ({
              tr: {
                key: r.name,
                children: [
                  { td: { text: r.name } },
                  { td: { text: `${r.medianMs.toFixed(3)} ms` } },
                  { td: { text: `${(r.htmlBytes / 1024).toFixed(1)} KB` } }
                ]
              }
            }))
          }
        }
      ]
    }
  };
}
```

The `onClick` handler renders nothing on the server; in the browser, `hydrate()` attaches it, and `event.setState()` re-renders the results table.

## 3. Client-Side Hydration Script

```javascript
// client.js — bundle with esbuild or Vite
import { hydrate } from '@coherent.js/client';
import { PerformancePage } from './components/PerformancePage.js';

const root = document.querySelector('.performance-page');
if (root) hydrate(PerformancePage, root, { initialState: { results: [], running: false } });
```

`components/PerformancePage.js` needs `runAllTests` in scope (import it from `benchmarks.js`).

### Alternative: Plain DOM Listeners

The website's own page renders inline string handlers (`onclick: 'runPerformanceTests()'`) that call global functions defined by `public/performance.js`. Plain DOM listeners in a module script work without globals:

```javascript
// public/performance.js
import { runAllTests } from './benchmarks.js';

document.getElementById('run-all-tests')?.addEventListener('click', () => {
  const output = document.querySelector('.results');
  output.textContent = '';
  for (const r of runAllTests()) {
    const row = output.insertRow();
    row.insertCell().textContent = r.name;
    row.insertCell().textContent = `${r.medianMs.toFixed(3)} ms`;
  }
});
```

Use `textContent` (not `innerHTML`) for values, so nothing is interpreted as markup.

## 4. HTML Integration

```javascript
// server.js
import { render } from '@coherent.js/core';
import { PerformancePage } from './components/PerformancePage.js';

app.get('/performance', (req, res) => {
  res.send(`<!DOCTYPE html>${render({
    html: {
      children: [
        { head: { children: [{ title: { text: 'Performance' } }, { script: { type: 'module', src: '/client.js' } }] } },
        { body: { children: [PerformancePage({})] } }
      ]
    }
  })}`);
});
```

## 5. Interpreting the Numbers

- Measure medians over many rounds after a warm-up; the first renders include JIT compilation.
- Build fresh data per round: a real server renders new data on every request.
- Browser timers may be coarsened (`performance.now()` precision is reduced in some browsers), so sub-millisecond results are approximate.
- Rendering cost grows with the number of nodes; depth costs more than breadth.
- Caching is opt-in: `memo()` for components rendered repeatedly with the same props, and `render(tree, { enableCache: true, cache })` only for identical trees. See the [Performance Guide](../deployment/performance.md).

## 6. Common Issues

### Buttons don't work

1. Check that the client bundle loads (network tab) and calls `hydrate()` with the component's root element (`.performance-page`), not a wrapper.
2. Check that the handler is a function prop on the component passed to `hydrate()`.

### The page freezes during a test

Benchmarks run on the main thread. Keep rounds small in the browser, yield between tests (`setTimeout`), or move them to a Web Worker.

### State not updating

Update through `event.setState()` (or the instance's `setState()`); mutating `event.state` does not re-render.

## Conclusion

Server-render the page, keep benchmark logic in plain functions, and let `hydrate()` (or a small script) wire the controls. For numbers you want to compare over time, rely on `pnpm perf:render` and the CI performance gate rather than an in-browser page.
