/**
 * Next.js integration behavior: route handler context and React resolution,
 * checked with real Request/Response objects and react-dom/server.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ReactNamespace from 'react';
import {
  createCoherentAppRouterHandler,
  createCoherentServerComponent,
  createCoherentClientComponent
} from '../../src/nextjs/index.js';

// react-dom ships as a dependency of the `next` peer; load it from there so it
// shares the `react` instance the adapter imports.
const nextDir = realpathSync(fileURLToPath(new URL('../../node_modules/next', import.meta.url)));
const { renderToStaticMarkup } = createRequire(join(nextDir, 'package.json'))('react-dom/server');

describe('Next.js App Router handler', () => {
  it('passes the route context (params) to the factory', async () => {
    const GET = createCoherentAppRouterHandler(async (request, { params }) => {
      const { slug } = await params;
      return { h1: { text: `${new URL(request.url).pathname} ${slug}` } };
    });

    const response = await GET(new Request('http://localhost/posts/hello'), {
      params: Promise.resolve({ slug: 'hello' })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await response.text()).toBe('<!DOCTYPE html>\n<h1>/posts/hello hello</h1>');
  });
});

describe('Next.js Server Component', () => {
  const Greeting = ({ name }) => ({ p: { text: `Hi ${name}` } });

  it('resolves React from the integrations package, not from core', async () => {
    const Server = await createCoherentServerComponent(Greeting);
    const element = await Server({ name: '<Ann>' });
    expect(renderToStaticMarkup(element)).toBe('<div><p>Hi &lt;Ann&gt;</p></div>');
  });

  it('uses an injected React (module or namespace)', async () => {
    const createElement = vi.fn(ReactNamespace.createElement);
    const Server = await createCoherentServerComponent(Greeting, { React: { createElement } });
    await Server({ name: 'x' });
    expect(createElement).toHaveBeenCalledWith('div', { dangerouslySetInnerHTML: { __html: '<p>Hi x</p>' } });

    const FromNamespace = await createCoherentServerComponent(Greeting, { React: ReactNamespace });
    expect(renderToStaticMarkup(await FromNamespace({ name: 'y' }))).toBe('<div><p>Hi y</p></div>');
  });
});

describe('Next.js Client Component', () => {
  it('resolves React and server-renders an empty shell', async () => {
    const Client = await createCoherentClientComponent(() => ({ p: { text: 'later' } }));
    expect(renderToStaticMarkup(ReactNamespace.createElement(Client, {}))).toBe('<div></div>');
  });
});
