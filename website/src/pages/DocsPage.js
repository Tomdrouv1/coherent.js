// DocsPage.js - wraps markdown HTML inside layout content area
export function DocsPage({ title, html }) {
  return {
    section: {
      className: 'docs',
      children: [
        { h1: { text: title || '' } },
        // We inject pre-rendered, trusted HTML from our markdown renderer
        { div: { className: 'markdown-body', innerHTML: () => html } }
      ]
    }
  };
}
