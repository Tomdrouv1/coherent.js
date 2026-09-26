/**
 * Remix integration: withCoherent must produce a React component whose
 * server-rendered output is the Coherent.js markup, not escaped HTML text.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { withCoherent, createRemixAdapter } from '../../src/remix/index.js';

// react-dom is installed as a dependency of the `next` peer; load it from
// there so it shares the `react` instance the adapter imports.
const nextDir = realpathSync(fileURLToPath(new URL('../../node_modules/next', import.meta.url)));
const { renderToStaticMarkup } = createRequire(join(nextDir, 'package.json'))('react-dom/server');

const UserCard = ({ name }) => ({ p: { children: [{ strong: { text: name } }] } });

describe('Remix: withCoherent', () => {
  it('renders the component markup instead of escaped HTML text', () => {
    const Card = withCoherent(UserCard);
    expect(renderToStaticMarkup(createElement(Card, { name: 'Bob' })))
      .toBe('<div><p><strong>Bob</strong></p></div>');
  });

  it('still escapes user-provided text', () => {
    const Card = withCoherent(UserCard);
    expect(renderToStaticMarkup(createElement(Card, { name: '<img src=x onerror=alert(1)>' })))
      .toBe('<div><p><strong>&lt;img src=x onerror=alert(1)&gt;</strong></p></div>');
  });

  it('accepts a component object and a custom wrapper tag', () => {
    const Banner = withCoherent({ em: { text: 'hi' } }, { as: 'section' });
    expect(renderToStaticMarkup(createElement(Banner))).toBe('<section><em>hi</em></section>');
  });
});

describe('Remix: createRemixAdapter', () => {
  it('createLoader answers with rendered HTML', async () => {
    const loader = createRemixAdapter().createLoader(UserCard, ({ params }) => ({ name: params.name }));
    const response = await loader({ request: new Request('http://x/'), params: { name: 'Ann' }, context: {} });

    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await response.text()).toBe('<p><strong>Ann</strong></p>');
  });
});
