// Simple Examples component with direct onclick handlers
export function Examples({ items = [] } = {}) {
  return {
    section: {
      className: 'examples',
      children: [
        {
          div: {
            className: 'examples-hero',
            children: [
              { h1: { text: '⚡ Examples & Demos' } },
              {
                p: {
                  className: 'examples-lead',
                  text: 'Discover the power of Coherent.js through practical examples. From basic components to advanced integrations, see how pure object syntax makes building UIs intuitive and performant.',
                },
              },
              {
                div: {
                  className: 'run-instruction',
                  children: [
                    {
                      span: {
                        className: 'instruction-label',
                        text: '🚀 Quick Start:',
                      },
                    },
                    {
                      code: {
                        className: 'instruction-code',
                        text: 'node examples/<example>.js',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          div: {
            className: 'examples-stats',
            children: [
              {
                div: {
                  className: 'stat-item',
                  children: [
                    {
                      span: {
                        className: 'stat-number',
                        text: items.length.toString(),
                      },
                    },
                    {
                      span: { className: 'stat-label', text: 'Live Examples' },
                    },
                  ],
                },
              },
              {
                div: {
                  className: 'stat-item',
                  children: [
                    { span: { className: 'stat-number', text: '100%' } },
                    { span: { className: 'stat-label', text: 'Runnable' } },
                  ],
                },
              },
              {
                div: {
                  className: 'stat-item',
                  children: [
                    { span: { className: 'stat-number', text: 'Zero' } },
                    { span: { className: 'stat-label', text: 'Build Step' } },
                  ],
                },
              },
            ],
          },
        },
        items.length
          ? {
              ul: {
                className: 'examples-grid',
                children: items.map((ex) => ({
                  li: {
                    key: ex.file,
                    children: [
                      {
                        div: {
                          className: 'card-header',
                          children: [
                            { h4: { text: ex.label } },
                            {
                              div: {
                                className: 'example-badges',
                                children: [
                                  {
                                    span: {
                                      className: 'badge primary',
                                      text: 'JS',
                                    },
                                  },
                                  {
                                    span: {
                                      className: 'badge accent',
                                      text: 'Coherent',
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        p: {
                          className: 'card-desc',
                          text:
                            ex.description ||
                            'Explore this practical Coherent.js example.',
                        },
                      },
                      {
                        div: {
                          className: 'run-command',
                          children: [
                            {
                              span: { className: 'run-label', text: '▶️ Run:' },
                            },
                            {
                              code: {
                                className: 'run-cmd',
                                text: ex.runCmd || `node examples/${ex.file}`,
                              },
                            },
                          ],
                        },
                      },
                      {
                        div: {
                          className: 'actions',
                          children: [
                            {
                              button: {
                                className: 'button primary',
                                text: '👀 View Code',
                                id: `view-code-${ex.file.replace('.js', '')}`,
                                onclick: `
                                  const codeBlock = this.closest('li').querySelector('.example-code');
                                  if (codeBlock.style.display === 'block') {
                                    codeBlock.style.display = 'none';
                                    this.textContent = '👀 View Code';
                                  } else {
                                    codeBlock.style.display = 'block';
                                    this.textContent = '🙈 Hide Code';
                                    codeBlock.scrollIntoView({behavior:'smooth',block:'nearest'});
                                  }
                                `,
                              },
                            },
                            {
                              a: {
                                className: 'button',
                                href: `/playground/?file=${encodeURIComponent(ex.file)}`,
                                text: '🧪 Open in Playground',
                              },
                            },
                            {
                              button: {
                                className: 'button secondary',
                                text: '📋 Copy',
                                id: `copy-cmd-${ex.file.replace('.js', '')}`,
                                'data-cmd': ex.runCmd || `node examples/${ex.file}`,
                                onclick: `
                                  const cmd = this.getAttribute('data-cmd');
                                  if (navigator.clipboard && cmd) {
                                    navigator.clipboard.writeText(cmd).then(() => {
                                      const originalText = this.textContent;
                                      this.textContent = '✅ Copied!';
                                      setTimeout(() => { this.textContent = originalText; }, 1200);
                                    });
                                  }
                                `,
                              },
                            },
                            {
                              a: {
                                className: 'button accent',
                                href: `https://github.com/Tomdrouv1/coherent.js/blob/main/examples/${ex.file}`,
                                target: '_blank',
                                rel: 'noopener',
                                text: '🔗 View on GitHub',
                              },
                            },
                            {
                              a: {
                                className: 'button secondary',
                                href: `https://codesandbox.io/p/github/Tomdrouv1/coherent.js/tree/main?file=examples%2F${encodeURIComponent(ex.file)}`,
                                target: '_blank',
                                rel: 'noopener',
                                text: '🧰 Open in CodeSandbox',
                              },
                            },
                          ],
                        },
                      },
                      ex.code
                        ? {
                            pre: {
                              className: 'example-code',
                              id: `code-${ex.file.replace('.js', '')}`,
                              style: 'display: none;',
                              children: [{ code: { text: ex.code } }],
                            },
                          }
                        : null,
                    ].filter(Boolean),
                  },
                })),
              },
            }
          : {
              div: {
                className: 'no-examples',
                children: [
                  { div: { className: 'no-examples-icon', text: '🔍' } },
                  { h3: { text: 'No Examples Found' } },
                  {
                    p: {
                      text: 'Examples are being prepared. Check back soon for live demos and code samples!',
                    },
                  },
                ],
              },
            },
      ],
    },
  };
}
