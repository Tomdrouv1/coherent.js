/**
 * Performance analysis: times real HTTP requests against a running app.
 *
 * Everything reported here is measured. Profiling individual components
 * or memory inside the server process is not implemented; asking for it
 * returns an error result rather than made-up numbers.
 */

const round = (ms) => Math.round(ms * 10) / 10;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

/**
 * @param {Object} [options]
 * @param {string} [options.url='http://localhost:3000'] - Page to request.
 * @param {string|number} [options.samples=100] - Maximum number of requests.
 * @param {string|number} [options.time=10] - Stop after this many seconds.
 * @param {string} [options.component] - Not supported yet (reported as an error).
 * @param {boolean} [options.memory] - Not supported yet (reported as an error).
 * @param {number} [options.timeoutMs=10000] - Per-request timeout.
 */
export async function analyzePerformance(options = {}) {
  const url = options.url || 'http://localhost:3000';
  const analysis = {
    timestamp: new Date().toISOString(),
    type: 'performance-analysis',
    summary: { url },
    details: {},
    recommendations: []
  };

  if (options.component || options.memory) {
    analysis.summary.status = 'error';
    analysis.summary.error = options.component
      ? 'Profiling a single component is not implemented yet. Run without a component name to time requests to --url.'
      : 'Memory profiling is not implemented yet. Use `node --inspect` or `--heap-prof` on the server process.';
    return analysis;
  }

  const maxSamples = Math.max(1, Number.parseInt(options.samples, 10) || 100);
  const maxMs = Math.max(0.1, Number.parseFloat(options.time) || 10) * 1000;
  const timeoutMs = options.timeoutMs ?? 10_000;

  const durations = [];
  const statusCodes = {};
  let failures = 0;
  let lastError = null;
  let bytes = null;
  const started = performance.now();

  while (durations.length + failures < maxSamples && performance.now() - started < maxMs) {
    const t0 = performance.now();
    try {
      const response = await globalThis.fetch(url, { signal: globalThis.AbortSignal.timeout(timeoutMs) });
      const body = await response.arrayBuffer();
      durations.push(performance.now() - t0);
      statusCodes[response.status] = (statusCodes[response.status] || 0) + 1;
      bytes = body.byteLength;
    } catch (error) {
      failures++;
      lastError = error.cause?.code || error.cause?.message || error.message;
      // Nothing is listening: one attempt is enough to say so.
      if (durations.length === 0) break;
    }
  }

  if (durations.length === 0) {
    analysis.summary.status = 'error';
    analysis.summary.error = `Could not fetch ${url}: ${lastError}. Start the app first, or pass --url.`;
    return analysis;
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const non2xx = Object.entries(statusCodes)
    .filter(([code]) => !code.startsWith('2'))
    .reduce((sum, [, count]) => sum + count, 0);

  analysis.summary.status = failures === 0 && non2xx === 0 ? 'success' : 'warning';
  analysis.summary.requests = durations.length;
  analysis.summary.failedRequests = failures;
  analysis.summary.meanResponseTime = `${round(mean)}ms`;
  analysis.summary.p95ResponseTime = `${round(percentile(sorted, 95))}ms`;

  analysis.details.metrics = {
    minMs: round(sorted[0]),
    medianMs: round(percentile(sorted, 50)),
    meanMs: round(mean),
    p95Ms: round(percentile(sorted, 95)),
    maxMs: round(sorted[sorted.length - 1]),
    responseBytes: bytes,
    statusCodes
  };

  if (non2xx > 0) {
    analysis.recommendations.push({
      type: 'errors',
      priority: 'high',
      message: `${non2xx} of ${durations.length} responses were not 2xx (${JSON.stringify(statusCodes)}).`
    });
  }
  if (failures > 0) {
    analysis.recommendations.push({
      type: 'errors',
      priority: 'high',
      message: `${failures} request(s) failed: ${lastError}.`
    });
  }

  return analysis;
}
