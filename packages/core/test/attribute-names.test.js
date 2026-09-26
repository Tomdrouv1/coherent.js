import { describe, it, expect } from 'vitest';
import { render, formatAttributes, isValidAttributeName } from '../src/index.js';

describe('attribute names', () => {
  it('rejects names that would break out of the tag', () => {
    const payloads = [
      'onmouseover="alert(1)" x',
      'x><script>alert(1)</script',
      "a'b",
      'a b',
      'a=b',
      'a/b',
      'a\u0000b',
      ''
    ];

    for (const name of payloads) {
      expect(isValidAttributeName(name)).toBe(false);
      expect(() => formatAttributes({ [name]: 'y' })).toThrow(/Invalid attribute name/);
      expect(() => render({ div: { [name]: 'y' } })).toThrow(/Invalid attribute name/);
    }
  });

  it('keeps the names frameworks and SVG rely on', () => {
    const html = render({
      div: {
        'data-id': '1',
        'aria-label': 'Close',
        'x-on:click': 'open = true',
        '@click': 'go()',
        ':class': 'cls',
        'hx-on::after-request': 'done()',
        'xlink:href': '#icon',
        data_id: '2'
      }
    });

    expect(html).toBe('<div data-id="1" aria-label="Close" x-on:click="open = true" @click="go()" :class="cls" hx-on::after-request="done()" xlink:href="#icon" data_id="2"></div>');
  });

  it('still escapes attribute values', () => {
    expect(render({ a: { title: '"><script>x</script>', text: 'x' } }))
      .toBe('<a title="&quot;&gt;&lt;script&gt;x&lt;/script&gt;">x</a>');
  });
});
