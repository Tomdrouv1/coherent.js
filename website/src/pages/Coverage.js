// Coverage.js - Test coverage statistics and reports
export function Coverage() {
  return {
    div: {
      className: 'coverage-page',
      children: [
        { h1: { text: 'Test Coverage' } },
        
        // Coverage badges
        { section: { className: 'coverage-badges', children: [
          { h2: { text: 'Current Status' } },
          { div: { className: 'badges-row', children: [
            { img: { src: 'https://img.shields.io/endpoint?url=https://coherent.js.org/coverage/badge.json&label=overall%20coverage&style=for-the-badge', alt: 'Overall Coverage' } },
            { img: { src: 'https://codecov.io/gh/Tomdrouv1/coherent.js/branch/main/graph/badge.svg', alt: 'Codecov Coverage' } }
          ] } }
        ] } },

        // Coverage summary
        { section: { className: 'coverage-summary', children: [
          { h2: { text: 'Coverage Summary' } },
          { p: { text: 'Real-time coverage data is fetched from our CI pipeline and updated with each commit.' } },
          { div: { id: 'coverage-data', className: 'coverage-data', text: 'Loading coverage data...' } }
        ] } },

        // Coverage by package
        { section: { className: 'package-coverage', children: [
          { h2: { text: 'Coverage by Package' } },
          { div: { id: 'package-coverage-table', className: 'coverage-table', text: 'Loading package coverage...' } }
        ] } },

        // Coverage reports
        { section: { className: 'coverage-reports', children: [
          { h2: { text: 'Detailed Reports' } },
          { ul: { children: [
            { li: { children: [
              { a: { href: '/coverage/lcov-report/', text: 'HTML Coverage Report', target: '_blank' } },
              { span: { text: ' - Interactive line-by-line coverage report' } }
            ] } },
            { li: { children: [
              { a: { href: '/coverage/coverage-report.md', text: 'Markdown Report', target: '_blank' } },
              { span: { text: ' - Summary report in markdown format' } }
            ] } },
            { li: { children: [
              { a: { href: '/coverage-summary.json', text: 'JSON Data', target: '_blank' } },
              { span: { text: ' - Raw coverage data for integration' } }
            ] } }
          ] } }
        ] } },

        // Testing information
        { section: { className: 'testing-info', children: [
          { h2: { text: 'Testing Strategy' } },
          { div: { className: 'testing-grid', children: [
            { div: { className: 'testing-card', children: [
              { h3: { text: 'Unit Tests' } },
              { p: { text: 'Comprehensive unit tests for core functionality, utilities, and components using Node.js built-in test runner.' } }
            ] } },
            { div: { className: 'testing-card', children: [
              { h3: { text: 'Integration Tests' } },
              { p: { text: 'Framework integration tests ensuring compatibility with Express, Fastify, Koa, and Next.js.' } }
            ] } },
            { div: { className: 'testing-card', children: [
              { h3: { text: 'Performance Tests' } },
              { p: { text: 'Benchmarks and performance regression tests to ensure optimal rendering speed.' } }
            ] } },
            { div: { className: 'testing-card', children: [
              { h3: { text: 'Example Tests' } },
              { p: { text: 'All example code is tested to ensure documentation accuracy and prevent regressions.' } }
            ] } }
          ] } }
        ] } },

        // Script to load coverage data
        { script: {
          text: `
            async function loadCoverageData() {
              try {
                const response = await fetch('/coverage-summary.json');
                const data = await response.json();
                
                // Update coverage summary
                const summaryEl = document.getElementById('coverage-data');
                if (summaryEl && data.total) {
                  summaryEl.innerHTML = \`
                    <div class="coverage-stats">
                      <div class="stat">
                        <div class="stat-value">\${data.total.lines.pct}%</div>
                        <div class="stat-label">Lines (\${data.total.lines.covered}/\${data.total.lines.total})</div>
                      </div>
                      <div class="stat">
                        <div class="stat-value">\${data.total.functions.pct}%</div>
                        <div class="stat-label">Functions (\${data.total.functions.covered}/\${data.total.functions.total})</div>
                      </div>
                      <div class="stat">
                        <div class="stat-value">\${data.total.branches.pct}%</div>
                        <div class="stat-label">Branches (\${data.total.branches.covered}/\${data.total.branches.total})</div>
                      </div>
                    </div>
                  \`;
                }
                
                // Update package coverage table
                const tableEl = document.getElementById('package-coverage-table');
                if (tableEl && data.packages) {
                  const tableHTML = \`
                    <table class="coverage-table">
                      <thead>
                        <tr>
                          <th>Package</th>
                          <th>Lines</th>
                          <th>Functions</th>
                          <th>Branches</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${data.packages.map(pkg => \`
                          <tr>
                            <td><strong>\${pkg.name}</strong></td>
                            <td class="coverage-cell">\${pkg.lines.pct}% <span class="coverage-detail">(\${pkg.lines.covered}/\${pkg.lines.total})</span></td>
                            <td class="coverage-cell">\${pkg.functions.pct}% <span class="coverage-detail">(\${pkg.functions.covered}/\${pkg.functions.total})</span></td>
                            <td class="coverage-cell">\${pkg.branches.pct}% <span class="coverage-detail">(\${pkg.branches.covered}/\${pkg.branches.total})</span></td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  \`;
                  tableEl.innerHTML = tableHTML;
                }
              } catch (error) {
                console.error('Failed to load coverage data:', error);
                const summaryEl = document.getElementById('coverage-data');
                if (summaryEl) {
                  summaryEl.innerHTML = '<p class="error">Failed to load coverage data. Please try again later.</p>';
                }
              }
            }
            
            // Load coverage data when page loads
            if (typeof window !== 'undefined') {
              loadCoverageData();
            }
          `
        } }
      ]
    }
  };
}