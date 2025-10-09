// Layout.js - shared layout for static site
export function Layout({
  title = 'Coherent.js',
  sidebar = [],
  currentPath = '/',
  baseHref = '/',
}) {
  return {
    html: {
      children: [
        {
          head: {
            children: [
              { meta: { charset: 'utf-8' } },
              {
                meta: {
                  name: 'viewport',
                  content: 'width=device-width, initial-scale=1',
                },
              },
              {
                meta: {
                  name: 'description',
                  content:
                    'Coherent.js — Lightweight, fast SSR with object-based components and great DX.',
                },
              },
              { meta: { name: 'theme-color', content: '#0b0e14' } },
              { title: { text: title } },
              { base: { href: baseHref } },
              {
                link: {
                  rel: 'icon',
                  type: 'image/svg+xml',
                  href: './favicon.svg',
                },
              },
              { link: { rel: 'stylesheet', href: './styles.css' } },
              { script: { src: './theme-init.js' } },
              { script: { src: './header-search.js', defer: true } },
              { script: { src: './toc-active.js', defer: true } },
              ...(currentPath === 'playground'
                ? [
                    { script: { src: './codemirror-editor.js', type: 'module', defer: true } },
                    { script: { src: './playground.js', defer: true } }
                  ]
                : []),
              ...(currentPath === 'performance'
                ? [{ script: { src: './performance.js', defer: true } }]
                : []),
            ],
          },
        },
        {
          body: {
            children: [
              {
                header: {
                  className: 'site-header',
                  children: [
                    {
                      a: {
                        className: 'logo-link',
                        href: baseHref,
                        children: [
                          {
                            img: {
                              src: './coherent-logo.svg',
                              alt: 'Coherent.js',
                              className: 'logo-svg',
                              width: '180',
                              height: '50',
                            },
                          },
                        ],
                      },
                    },
                    {
                      button: {
                        className: 'menu-button',
                        'aria-label': 'Toggle menu',
                        text: '☰',
                        onclick: 'document.body.classList.toggle("menu-open");',
                      },
                    },
                    {
                      nav: {
                        className: 'top-nav',
                        children: [
                          {
                            a: {
                              href: baseHref,
                              className: currentPath === '' ? 'active' : '',
                              text: 'Home',
                            },
                          },
                          {
                            a: {
                              href: 'docs',
                              className: currentPath.startsWith('docs')
                                ? 'active'
                                : '',
                              text: 'Docs',
                            },
                          },
                          {
                            a: {
                              href: 'examples',
                              className: currentPath.startsWith('examples')
                                ? 'active'
                                : '',
                              text: 'Examples',
                            },
                          },
                          {
                            a: {
                              href: 'playground',
                              className: currentPath.startsWith('playground')
                                ? 'active'
                                : '',
                              text: 'Playground',
                            },
                          },
                          {
                            a: {
                              href: 'performance',
                              className: currentPath.startsWith('performance')
                                ? 'active'
                                : '',
                              text: 'Performance',
                            },
                          },
                          {
                            a: {
                              href: 'coverage',
                              className: currentPath.startsWith('coverage')
                                ? 'active'
                                : '',
                              text: 'Coverage',
                            },
                          },
                          {
                            a: {
                              href: 'changelog',
                              className: currentPath.startsWith('changelog')
                                ? 'active'
                                : '',
                              text: 'Changelog',
                            },
                          },
                        ],
                      },
                    },
                    {
                      div: {
                        className: 'header-tools',
                        children: [
                          {
                            div: {
                              className: 'search-container',
                              children: [
                                {
                                  input: {
                                    type: 'search',
                                    id: 'header-search',
                                    placeholder: 'Search docs…',
                                    className: 'search',
                                    oninput: 'handleHeaderSearch(this.value)'
                                  },
                                },
                                {
                                  div: {
                                    id: 'header-search-results',
                                    className: 'header-search-results',
                                    style: 'display: none;'
                                  }
                                }
                              ]
                            }
                          },
                          {
                            button: {
                              className: 'button theme-toggle',
                              id: 'theme-toggle',
                              'aria-label': 'Toggle theme',
                              onclick: `
                    var current = document.documentElement.getAttribute('data-theme') || 'dark';
                    var next = current === 'light' ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', next);
                    this.innerHTML = next === 'dark' ? '🌙' : '☀️';
                    try { localStorage.setItem('theme', next); } catch(e) {}
                  `,
                              text: '🌙', // Default to dark theme (moon icon)
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                main: {
                  className: (function () {
                    const isDocs =
                      typeof currentPath === 'string' &&
                      currentPath.startsWith('docs');
                    return isDocs ? 'container docs' : 'container single';
                  })(),
                  children: (function () {
                    const isDocs =
                      typeof currentPath === 'string' &&
                      currentPath.startsWith('docs');
                    const nodes = [];
                    if (isDocs) {
                      nodes.push({
                        aside: {
                          className: 'sidebar',
                          children: buildSidebar(sidebar),
                        },
                      });
                    }
                    nodes.push({
                      article: {
                        className: 'content',
                        children: [
                          isDocs && currentPath !== 'docs'
                            ? {
                                nav: {
                                  className: 'breadcrumbs',
                                  text: '[[[COHERENT_BREADCRUMBS_PLACEHOLDER]]]',
                                },
                              }
                            : null,
                          {
                            div: {
                              id: 'coherent-content-placeholder',
                              text: '[[[COHERENT_CONTENT_PLACEHOLDER]]]',
                            },
                          },
                        ].filter(Boolean),
                      },
                    });
                    if (isDocs && currentPath !== 'docs') {
                      nodes.push({
                        aside: {
                          className: 'toc',
                          children: [
                            {
                              div: {
                                id: 'coherent-toc-placeholder',
                                text: '[[[COHERENT_TOC_PLACEHOLDER]]]',
                              },
                            },
                          ],
                        },
                      });
                    } else if (isDocs && currentPath === 'docs') {
                      // Show helpful message for docs index page
                      nodes.push({
                        aside: {
                          className: 'toc toc-empty',
                          children: [
                            {
                              div: {
                                className: 'toc-placeholder-message',
                                children: [
                                  {
                                    div: {
                                      className: 'toc-icon',
                                      text: '📖'
                                    }
                                  },
                                  {
                                    p: {
                                      text: 'Table of contents will appear here when you navigate to a specific documentation page.'
                                    }
                                  }
                                ]
                              },
                            },
                          ],
                        },
                      });
                    }
                    return nodes;
                  })(),
                },
              },
              {
                footer: {
                  className: 'site-footer',
                  children: [
                    {
                      p: {
                        text: `© ${new Date().getFullYear()} Coherent.js`,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function buildSidebar(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return [];
  return groups.map((group) => ({
    section: {
      children: [
        { h4: { text: group.title } },
        {
          ul: {
            children: (group.items || []).map((item) => ({
              li: { children: [{ a: { href: item.href, text: item.label } }] },
            })),
          },
        },
      ],
    },
  }));
}
