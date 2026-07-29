/**
 * Trusted content tests
 *
 * Regression coverage for `dangerouslySetInnerContent()`, which used to be
 * dead code: it returned `{ __html, __trusted }`, but nothing in the renderer
 * ever inspected the marker, so every key rendered `[object Object]` (or
 * nothing at all for `children`).
 */

import { describe, it, expect } from 'vitest';
import { render, dangerouslySetInnerContent, isTrustedContent } from '../src/index.js';
import { renderToStream } from '../src/rendering/html-renderer.js';

const RAW = '<em>bold</em>';

async function streamToString(component) {
  let html = '';
  for await (const chunk of renderToStream(component)) {
    html += chunk;
  }
  return html;
}

describe('dangerouslySetInnerContent', () => {
  it('marks content as trusted', () => {
    expect(isTrustedContent(dangerouslySetInnerContent(RAW))).toBe(true);
    expect(isTrustedContent({ __html: RAW })).toBe(false);
    expect(isTrustedContent(RAW)).toBe(false);
    expect(isTrustedContent(null)).toBe(false);
  });

  it('renders verbatim through the text key', () => {
    expect(render({ div: { text: dangerouslySetInnerContent(RAW) } }))
      .toBe(`<div>${RAW}</div>`);
  });

  it('renders verbatim through the html key', () => {
    expect(render({ div: { html: dangerouslySetInnerContent(RAW) } }))
      .toBe(`<div>${RAW}</div>`);
  });

  it('renders verbatim as a child', () => {
    expect(render({ div: { children: [dangerouslySetInnerContent(RAW)] } }))
      .toBe(`<div>${RAW}</div>`);
  });

  it('renders verbatim alongside sibling children', () => {
    const html = render({
      div: { children: [{ p: { text: 'a' } }, dangerouslySetInnerContent(RAW)] }
    });

    expect(html).toBe(`<div><p>a</p>${RAW}</div>`);
  });

  it('never emits [object Object]', () => {
    for (const key of ['text', 'html', 'children']) {
      const value = key === 'children'
        ? [dangerouslySetInnerContent(RAW)]
        : dangerouslySetInnerContent(RAW);

      expect(render({ div: { [key]: value } })).not.toContain('[object Object]');
    }
  });

  // A marker is an inert leaf, so reusing one is not a cycle.
  it('renders the same marker more than once', () => {
    const marker = dangerouslySetInnerContent(RAW);

    expect(render({ div: { children: [marker, marker] } }))
      .toBe(`<div>${RAW}${RAW}</div>`);
  });

  it('still detects genuine circular references', () => {
    const node = { div: { children: [] } };
    node.div.children.push(node);

    expect(() => render(node)).toThrow(/[Cc]ircular/);
  });

  it('still escapes untrusted strings', () => {
    expect(render({ div: { text: RAW } })).toBe('<div>&lt;em&gt;bold&lt;/em&gt;</div>');
  });

  it('supports inline scripts', () => {
    expect(render({ script: { text: dangerouslySetInnerContent('var a=1<2;') } }))
      .toBe('<script>var a=1<2;</script>');
  });

  it('renders verbatim when streaming', async () => {
    expect(await streamToString({ div: { text: dangerouslySetInnerContent(RAW) } }))
      .toBe(`<div>${RAW}</div>`);
  });

  // The streaming renderer destructured only `children` and `text`, so a raw
  // `html` prop leaked into formatAttributes and became an attribute.
  it('treats the streaming html key as content, not an attribute', async () => {
    const html = await streamToString({ div: { html: RAW } });

    expect(html).toBe(`<div>${RAW}</div>`);
    expect(html).not.toContain('html=');
  });
});
