/**
 * Tests for the shared framework-integration render utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  renderWithTemplate,
  renderComponentFactory,
  isCoherentComponent
} from '../src/utils/render-utils.js';

describe('renderWithTemplate', () => {
  it('inserts the rendered component at {{content}}', () => {
    const html = renderWithTemplate({ p: { text: 'hi' } }, { template: '<body>{{content}}</body>' });
    expect(html).toBe('<body><p>hi</p></body>');
  });

  it('defaults to a doctype-prefixed template', () => {
    expect(renderWithTemplate({ p: { text: 'hi' } })).toBe('<!DOCTYPE html>\n<p>hi</p>');
  });

  it('does not expand String.replace patterns ($&, $`, $\', $$) in page text', () => {
    const template = '<head><title>T</title></head><body>{{content}}</body>';
    const text = "Pay $$10 or $` or $' or $&";
    const html = renderWithTemplate({ p: { text } }, { template });

    expect(html).toBe(`<head><title>T</title></head><body><p>Pay $$10 or $\` or $&#39; or $&amp;</p></body>`);
    // The `$\`` pattern used to splice the template prefix into the page.
    expect(html.match(/<head>/g)).toHaveLength(1);
  });

  it('keeps $-patterns in raw html content intact', () => {
    const html = renderWithTemplate({ div: { html: "<b>$'</b>" } }, { template: '[{{content}}]' });
    expect(html).toBe("[<div><b>$'</b></div>]");
  });

  it('is used by renderComponentFactory', async () => {
    const html = await renderComponentFactory(
      (name) => ({ p: { text: `$$${name}` } }),
      ['x'],
      { template: '<{{content}}>' }
    );
    expect(html).toBe('<<p>$$x</p>>');
  });
});

describe('isCoherentComponent', () => {
  it('matches any single-key object (a shape heuristic)', () => {
    expect(isCoherentComponent({ div: { text: 'x' } })).toBe(true);
    // Documented limitation: JSON with one key has the same shape.
    expect(isCoherentComponent({ ok: true })).toBe(true);
  });

  it('rejects non-objects, arrays and multi-key objects', () => {
    expect(isCoherentComponent(null)).toBe(false);
    expect(isCoherentComponent('div')).toBe(false);
    expect(isCoherentComponent([{ div: {} }])).toBe(false);
    expect(isCoherentComponent({ a: 1, b: 2 })).toBe(false);
  });
});
