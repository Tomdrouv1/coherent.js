/**
 * Rendering benchmark: what render() costs on realistic trees, measured
 * against a hand-written template-string baseline that produces the same
 * HTML. The baseline is the floor any object-to-HTML renderer pays for;
 * the ratio is the framework overhead.
 *
 * Every case runs in its own warm-up + several timed rounds and reports the
 * median, with fresh data on each render so nothing is served from a cache.
 *
 *   node benchmarks/render-bench.js            # print a table
 *   node benchmarks/render-bench.js --json     # machine-readable
 *   node benchmarks/render-bench.js --check    # also fail when a case is
 *                                              # slower than its budget
 */

import { render } from '../packages/core/src/index.js';

const escape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// ---------------------------------------------------------------------------
// Cases: build(seed) returns the component; baseline(seed) the same HTML.
// ---------------------------------------------------------------------------

const page = {
  name: 'page (~300 nodes)',
  build(seed) {
    return {
      div: {
        className: 'page',
        children: [
          { header: { className: 'top', children: [{ h1: { text: `Shop #${seed}` } }, { nav: { children: ['Home', 'Deals', 'Cart'].map((label) => ({ a: { href: `/${label.toLowerCase()}`, text: label } })) } }] } },
          {
            main: {
              children: Array.from({ length: 60 }, (_, i) => ({
                article: {
                  className: i % 2 ? 'card odd' : 'card',
                  'data-id': String(i),
                  children: [
                    { h2: { text: `Item ${i} <v${seed}>` } },
                    { p: { text: `Price & tax: ${(seed * i) % 997}` } },
                    { a: { href: `/p/${i}?ref=${seed}`, text: 'Details' } }
                  ]
                }
              }))
            }
          },
          { footer: { children: [{ small: { text: '© Shop' } }] } }
        ]
      }
    };
  },
  baseline(seed) {
    let html = `<div class="page"><header class="top"><h1>${escape(`Shop #${seed}`)}</h1><nav>`;
    for (const label of ['Home', 'Deals', 'Cart']) html += `<a href="/${label.toLowerCase()}">${label}</a>`;
    html += '</nav></header><main>';
    for (let i = 0; i < 60; i++) {
      html += `<article class="${i % 2 ? 'card odd' : 'card'}" data-id="${i}"><h2>${escape(`Item ${i} <v${seed}>`)}</h2><p>${escape(`Price & tax: ${(seed * i) % 997}`)}</p><a href="${escape(`/p/${i}?ref=${seed}`)}">Details</a></article>`;
    }
    return `${html}</main><footer><small>© Shop</small></footer></div>`;
  }
};

const table = {
  name: 'table (1,000 x 5)',
  build(seed) {
    return {
      table: {
        children: [{
          tbody: {
            children: Array.from({ length: 1000 }, (_, r) => ({
              tr: { key: r, children: Array.from({ length: 5 }, (__, c) => ({ td: { text: `${r}:${c}:${seed}` } })) }
            }))
          }
        }]
      }
    };
  },
  baseline(seed) {
    let html = '<table><tbody>';
    for (let r = 0; r < 1000; r++) {
      html += '<tr>';
      for (let c = 0; c < 5; c++) html += `<td>${escape(`${r}:${c}:${seed}`)}</td>`;
      html += '</tr>';
    }
    return `${html}</tbody></table>`;
  }
};

const DEPTH = 90; // below the default maxDepth (100)
const deep = {
  name: `deep tree (${DEPTH} levels)`,
  build(seed) {
    let node = { span: { text: `leaf ${seed}` } };
    for (let i = 0; i < DEPTH; i++) node = { div: { className: `l${i}`, children: [node] } };
    return node;
  },
  baseline(seed) {
    let html = `<span>${escape(`leaf ${seed}`)}</span>`;
    for (let i = 0; i < DEPTH; i++) html = `<div class="l${i}">${html}</div>`;
    return html;
  }
};

// Budgets for --check: median ms per render on a typical CI runner, with
// generous headroom. They catch order-of-magnitude regressions (like the
// default cache that took a page from 1 ms to 500 ms), not small drifts.
const BUDGET_MS = { [page.name]: 5, [table.name]: 60, [deep.name]: 5 };

// ---------------------------------------------------------------------------

function time(fn, seconds) {
  const samples = [];
  const end = performance.now() + seconds * 1000;
  let seed = 0;
  while (performance.now() < end) {
    const start = performance.now();
    fn(seed++);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

function bench(testCase, { warmup = 0.5, rounds = 3, seconds = 1 } = {}) {
  const expected = testCase.baseline(1);
  const actual = render(testCase.build(1));
  if (actual !== expected) {
    throw new Error(`${testCase.name}: render() output differs from the baseline\n  expected: ${expected.slice(0, 200)}\n  actual:   ${actual.slice(0, 200)}`);
  }

  const coherent = (seed) => render(testCase.build(seed));
  const naive = (seed) => testCase.baseline(seed);
  time(coherent, warmup);
  time(naive, warmup);

  const coherentMs = [];
  const naiveMs = [];
  for (let i = 0; i < rounds; i++) {
    coherentMs.push(time(coherent, seconds));
    naiveMs.push(time(naive, seconds));
  }
  const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const coherentMedian = median(coherentMs);
  const naiveMedian = median(naiveMs);

  return {
    name: testCase.name,
    coherentMs: Number(coherentMedian.toFixed(4)),
    baselineMs: Number(naiveMedian.toFixed(4)),
    overhead: Number((coherentMedian / naiveMedian).toFixed(1)),
    rendersPerSecond: Math.round(1000 / coherentMedian),
    budgetMs: BUDGET_MS[testCase.name]
  };
}

const args = new Set(process.argv.slice(2));
const quick = args.has('--quick');
const results = [page, table, deep].map((testCase) => bench(testCase, quick ? { warmup: 0.2, rounds: 1, seconds: 0.5 } : undefined));

if (args.has('--json')) {
  console.log(JSON.stringify({ node: process.version, results }, null, 2));
} else {
  console.log(`Node ${process.version}`);
  console.table(results.map(({ name, coherentMs, baselineMs, overhead, rendersPerSecond }) => ({
    case: name, 'render() ms': coherentMs, 'baseline ms': baselineMs, 'x baseline': overhead, 'renders/s': rendersPerSecond
  })));
}

if (args.has('--check')) {
  const over = results.filter((r) => r.coherentMs > r.budgetMs);
  for (const r of over) console.error(`✗ ${r.name}: ${r.coherentMs} ms > budget ${r.budgetMs} ms`);
  if (over.length) process.exit(1);
  console.log('✓ every case within budget');
}
