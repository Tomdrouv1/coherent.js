/**
 * Hydration analysis: inspects the server-rendered HTML of a running app.
 *
 * It fetches the page and counts the markers Coherent.js hydration relies
 * on. It cannot see hydration mismatches — those only exist once the page
 * runs in a browser, where hydrate() reports them in the console — so it
 * never claims to have found or ruled any out.
 */

/** Attributes that mark server-rendered output as hydratable. */
const HYDRATION_MARKERS = [
  'data-coherent-component',
  'data-coherent-island',
  'data-hydratable',
  'data-hydrate',
  'data-hydration-id',
  'data-state'
];

function countAttribute(html, name) {
  const pattern = new RegExp(`\\s${name}(?=[\\s=/>])`, 'gi');
  return (html.match(pattern) || []).length;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {Object} [options]
 * @param {string} [options.url='http://localhost:3000'] - Page to inspect.
 * @param {string} [options.components] - Comma-separated component names to look for.
 * @param {boolean} [options.compare] - Not supported yet (reported as an error).
 * @param {number} [options.timeoutMs=10000] - Request timeout.
 */
export async function analyzeHydration(options = {}) {
  const url = options.url || 'http://localhost:3000';
  const analysis = {
    timestamp: new Date().toISOString(),
    type: 'hydration-analysis',
    summary: { url },
    details: {},
    recommendations: []
  };

  if (options.compare) {
    analysis.summary.status = 'error';
    analysis.summary.error = '--compare (server vs. client output) is not implemented yet. '
      + 'Run the page in a browser: hydrate() logs mismatches to the console in development.';
    return analysis;
  }

  let response;
  let html;
  const started = performance.now();
  try {
    response = await globalThis.fetch(url, { signal: globalThis.AbortSignal.timeout(options.timeoutMs ?? 10_000) });
    html = await response.text();
  } catch (error) {
    analysis.summary.status = 'error';
    analysis.summary.error = `Could not fetch ${url}: ${error.cause?.code || error.cause?.message || error.message}. Start the app first, or pass --url.`;
    return analysis;
  }

  analysis.summary.httpStatus = response.status;
  analysis.summary.responseTime = `${Math.round(performance.now() - started)}ms`;
  analysis.summary.bytes = Buffer.byteLength(html);

  if (!response.ok) {
    analysis.summary.status = 'error';
    analysis.summary.error = `${url} answered HTTP ${response.status}`;
    return analysis;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('html')) {
    analysis.summary.status = 'error';
    analysis.summary.error = `${url} did not return HTML (content-type: ${contentType || 'none'})`;
    return analysis;
  }

  const markers = Object.fromEntries(HYDRATION_MARKERS.map((name) => [name, countAttribute(html, name)]));
  const total = Object.values(markers).reduce((sum, n) => sum + n, 0);
  analysis.summary.hydrationMarkers = total;
  analysis.details.markers = markers;

  if (options.components) {
    const names = String(options.components).split(',').map((n) => n.trim()).filter(Boolean);
    analysis.details.components = Object.fromEntries(names.map((name) => {
      const pattern = new RegExp(`data-(?:coherent-component|coherent-island-component|hydrate)=["']${escapeRegExp(name)}["']`, 'g');
      return [name, (html.match(pattern) || []).length];
    }));
    for (const [name, count] of Object.entries(analysis.details.components)) {
      if (count === 0) {
        analysis.recommendations.push({
          type: 'hydration',
          priority: 'medium',
          message: `No element on ${url} is marked as component "${name}".`
        });
      }
    }
  }

  analysis.summary.status = total > 0 ? 'success' : 'warning';
  if (total === 0) {
    analysis.recommendations.push({
      type: 'hydration',
      priority: 'medium',
      message: 'No hydration markers found: the page is static HTML, so there is nothing for the client to hydrate.'
    });
  }
  analysis.recommendations.push({
    type: 'info',
    priority: 'low',
    message: 'This inspects server HTML only. Mismatches show up in the browser console, where hydrate() reports them in development.'
  });

  return analysis;
}
