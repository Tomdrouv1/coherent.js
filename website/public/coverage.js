// Helper function to get coverage color class based on percentage
function getCoverageClass(percentage) {
  const pct = parseFloat(percentage);
  if (pct >= 95) return 'coverage-excellent';
  if (pct >= 80) return 'coverage-good';
  if (pct >= 60) return 'coverage-fair';
  return 'coverage-poor';
}

// Simple browser-compatible render function
function render(component) {
  if (!component || typeof component !== 'object') return '';

  function renderElement(element) {
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return String(element);
    if (!element || typeof element !== 'object') return '';

    for (const tag in element) {
      const props = element[tag];
      if (typeof props === 'string') return `<${tag}>${props}</${tag}>`;
      if (typeof props === 'number') return `<${tag}>${props}</${tag}>`;

      let html = `<${tag}`;
      if (props.className) html += ` class="${props.className}"`;
      if (props.id) html += ` id="${props.id}"`;
      if (props.style) html += ` style="${props.style}"`;
      html += '>';

      if (props.text) html += props.text;
      if (props.html) html += props.html;
      if (props.children) {
        html += props.children.map(renderElement).join('');
      }

      html += `</${tag}>`;
      return html;
    }
    return '';
  }

  return renderElement(component);
}

async function loadCoverageData() {
  try {
    const response = await fetch('/coverage-summary.json');
    const data = await response.json();

    // Create coverage summary component using Coherent.js
    const summaryEl = document.getElementById('coverage-data');
    if (summaryEl && data.total) {
      const summaryComponent = {
        div: {
          className: 'coverage-stats',
          children: [
            {
              div: {
                className: 'stat',
                children: [
                  {
                    div: {
                      className: `stat-value ${getCoverageClass(data.total.lines.pct)}`,
                      text: `${data.total.lines.pct}%`
                    }
                  },
                  {
                    div: {
                      className: 'stat-label',
                      text: `Lines (${data.total.lines.covered}/${data.total.lines.total})`
                    }
                  }
                ]
              }
            },
            {
              div: {
                className: 'stat',
                children: [
                  {
                    div: {
                      className: `stat-value ${getCoverageClass(data.total.functions.pct)}`,
                      text: `${data.total.functions.pct}%`
                    }
                  },
                  {
                    div: {
                      className: 'stat-label',
                      text: `Functions (${data.total.functions.covered}/${data.total.functions.total})`
                    }
                  }
                ]
              }
            },
            {
              div: {
                className: 'stat',
                children: [
                  {
                    div: {
                      className: `stat-value ${getCoverageClass(data.total.branches.pct)}`,
                      text: `${data.total.branches.pct}%`
                    }
                  },
                  {
                    div: {
                      className: 'stat-label',
                      text: `Branches (${data.total.branches.covered}/${data.total.branches.total})`
                    }
                  }
                ]
              }
            }
          ]
        }
      };

      summaryEl.innerHTML = render(summaryComponent);
    }

    // Update package coverage table using Coherent.js
    const tableEl = document.getElementById('package-coverage-table');
    if (tableEl && data.packages) {
      // Check if we have meaningful package data (more than one package or different from total)
      const hasMultiplePackages = data.packages.length > 1;
      const hasUniquePackageData = data.packages.some(pkg =>
        pkg.lines.pct !== data.total.lines.pct ||
        pkg.functions.pct !== data.total.functions.pct ||
        pkg.branches.pct !== data.total.branches.pct
      );

      if (hasMultiplePackages || hasUniquePackageData) {
        const packageComponent = {
          div: {
            className: 'coverage-grid',
            children: data.packages.map(pkg => ({
              div: {
                className: 'coverage-item',
                children: [
                  {
                    div: {
                      className: 'package-name',
                      children: [{ strong: { text: pkg.name } }]
                    }
                  },
                  {
                    div: {
                      className: 'coverage-metrics',
                      children: [
                        {
                          div: {
                            className: 'metric',
                            children: [
                              {
                                div: {
                                  className: 'metric-label',
                                  text: 'Lines'
                                }
                              },
                              {
                                div: {
                                  className: `coverage-cell ${getCoverageClass(pkg.lines.pct)}`,
                                  text: `${pkg.lines.pct}%`
                                }
                              },
                              {
                                div: {
                                  className: 'coverage-detail',
                                  text: `(${pkg.lines.covered}/${pkg.lines.total})`
                                }
                              }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'metric',
                            children: [
                              {
                                div: {
                                  className: 'metric-label',
                                  text: 'Functions'
                                }
                              },
                              {
                                div: {
                                  className: `coverage-cell ${getCoverageClass(pkg.functions.pct)}`,
                                  text: `${pkg.functions.pct}%`
                                }
                              },
                              {
                                div: {
                                  className: 'coverage-detail',
                                  text: `(${pkg.functions.covered}/${pkg.functions.total})`
                                }
                              }
                            ]
                          }
                        },
                        {
                          div: {
                            className: 'metric',
                            children: [
                              {
                                div: {
                                  className: 'metric-label',
                                  text: 'Branches'
                                }
                              },
                              {
                                div: {
                                  className: `coverage-cell ${getCoverageClass(pkg.branches.pct)}`,
                                  text: `${pkg.branches.pct}%`
                                }
                              },
                              {
                                div: {
                                  className: 'coverage-detail',
                                  text: `(${pkg.branches.covered}/${pkg.branches.total})`
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }))
          }
        };

        tableEl.innerHTML = render(packageComponent);
      } else {
        // Hide the package section if it's just duplicating the global data
        const noteComponent = {
          p: {
            className: 'coverage-note',
            text: 'Package-level coverage data is the same as the overall project coverage shown above.'
          }
        };
        tableEl.innerHTML = render(noteComponent);
      }
    }
  } catch (error) {
    console.error('Failed to load coverage data:', error);
    const summaryEl = document.getElementById('coverage-data');
    if (summaryEl) {
      const errorComponent = {
        p: {
          className: 'error',
          text: 'Failed to load coverage data. Please try again later.'
        }
      };
      summaryEl.innerHTML = render(errorComponent);
    }
  }
}

// Load coverage data when page loads
if (typeof window !== 'undefined') {
  loadCoverageData();
}
