// Layout.js - shared layout for static site
const navLinks = [
  { href: '', label: 'Home', match: (p) => p === '' || p === '/' },
  { href: 'docs', label: 'Docs', match: (p) => p.startsWith('docs') },
  { href: 'starter-app', label: 'Starter App', match: (p) => p.startsWith('starter-app') },
  { href: 'examples', label: 'Examples', match: (p) => p.startsWith('examples') },
  { href: 'playground', label: 'Playground', match: (p) => p.startsWith('playground') },
  { href: 'changelog', label: 'Changelog', match: (p) => p.startsWith('changelog') },
];

export function Layout({
  title = 'Coherent.js',
  sidebar = [],
  currentPath = '/',
  baseHref = '/',
  content = null,
  scripts = [],
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
              { script: { src: './coherent-animations.js', defer: true } },
              // Page-specific scripts (passed via props or hardcoded for build compatibility)
              ...(scripts.length > 0
                ? scripts.map(src => ({ script: { src, defer: true } }))
                : [
                    ...(currentPath === 'playground'
                      ? [
                          { script: { src: './codemirror-editor.js', type: 'module', defer: true } },
                          { script: { src: './playground.js', defer: true } }
                        ]
                      : []),
                    ...(currentPath === 'performance'
                      ? [{ script: { src: './performance.js', defer: true } }]
                      : []),
                  ]),
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
                        children: navLinks.map(({ href, label, match }) => {
                          const isActive = match(currentPath);
                          return {
                            a: {
                              href: href === '' ? baseHref : href,
                              className: isActive ? 'active' : '',
                              ...(isActive ? { 'aria-current': 'page' } : {}),
                              text: label,
                            },
                          };
                        }),
                      },
                    },
                    {
                      div: {
                        className: 'header-tools',
                        children: [
                          {
                            a: {
                              href: 'https://github.com/Tomdrouv1/coherent.js',
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              className: 'github-link',
                              'aria-label': 'GitHub repository',
                              children: [
                                {
                                  svg: {
                                    width: '20',
                                    height: '20',
                                    viewBox: '0 0 24 24',
                                    fill: 'currentColor',
                                    children: [
                                      { path: { d: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z' } }
                                    ]
                                  }
                                }
                              ]
                            }
                          },
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
                          // Use actual content component when provided, fall back to placeholder for static build
                          content
                            ? { div: { id: 'coherent-content', children: [content] } }
                            : { div: { id: 'coherent-content-placeholder', text: '[[[COHERENT_CONTENT_PLACEHOLDER]]]' } },
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
                      div: {
                        className: 'footer-content',
                        children: [
                          {
                            div: {
                              className: 'footer-col',
                              children: [
                                { h4: { text: 'Resources' } },
                                { ul: { children: [
                                  { li: { children: [{ a: { href: 'docs', text: 'Documentation' } }] } },
                                  { li: { children: [{ a: { href: 'examples', text: 'Examples' } }] } },
                                  { li: { children: [{ a: { href: 'starter-app', text: 'Starter App' } }] } },
                                  { li: { children: [{ a: { href: 'changelog', text: 'Changelog' } }] } },
                                ] } }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'footer-col',
                              children: [
                                { h4: { text: 'Community' } },
                                { ul: { children: [
                                  { li: { children: [{ a: { href: 'https://github.com/Tomdrouv1/coherent.js', target: '_blank', rel: 'noopener noreferrer', text: 'GitHub' } }] } },
                                  { li: { children: [{ a: { href: 'https://www.npmjs.com/package/@coherent.js/core', target: '_blank', rel: 'noopener noreferrer', text: 'npm' } }] } },
                                ] } }
                              ]
                            }
                          },
                          {
                            div: {
                              className: 'footer-col',
                              children: [
                                { h4: { text: 'Tools' } },
                                { ul: { children: [
                                  { li: { children: [{ a: { href: 'playground', text: 'Playground' } }] } },
                                  { li: { children: [{ a: { href: 'performance', text: 'Performance' } }] } },
                                  { li: { children: [{ a: { href: 'coverage', text: 'Coverage' } }] } },
                                ] } }
                              ]
                            }
                          },
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'footer-bottom',
                        children: [
                          {
                            p: {
                              text: `\u00A9 ${new Date().getFullYear()} Coherent.js`,
                            },
                          },
                          {
                            a: {
                              href: '#',
                              className: 'back-to-top',
                              'aria-label': 'Back to top',
                              onclick: 'window.scrollTo({top:0,behavior:"smooth"});return false;',
                              text: '\u2191 Back to top',
                            },
                          },
                        ]
                      }
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
