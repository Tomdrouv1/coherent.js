/**
 * Attribute and content values core rendered wrongly:
 *
 * - `htmlFor` came out as `htmlFor="x"`, which browsers read as an unknown
 *   `htmlfor` attribute, so labels (including the CLI's generated forms)
 *   were not associated with their controls;
 * - style values that were null/undefined/false came out as "color: false",
 *   an empty style object as `style=""`, and `--mainColor` as `--main-color`
 *   (custom properties are case-sensitive);
 * - a `text` function returning null, and `html: null`, came out as "null";
 * - with both `class` and `className`, a function value was joined as its
 *   source code.
 */

import { describe, it, expect } from 'vitest';
import { render, dangerouslySetInnerContent } from '../src/index.js';

describe('attribute values', () => {
  it('writes htmlFor as for', () => {
    expect(render({ label: { htmlFor: 'email', text: 'Email' } })).toBe('<label for="email">Email</label>');
  });

  it('leaves out style values that are null, undefined or false', () => {
    const active = false;
    expect(render({ div: { style: { color: active && 'red', margin: null, padding: undefined, fontSize: '2px' } } }))
      .toBe('<div style="font-size: 2px"></div>');
  });

  it('writes no style attribute for an empty style', () => {
    expect(render({ div: { style: {}, id: 'a' } })).toBe('<div id="a"></div>');
    expect(render({ div: { style: { color: null } } })).toBe('<div></div>');
  });

  it('keeps the case of custom properties', () => {
    expect(render({ div: { style: { '--mainColor': 'red', backgroundColor: 'var(--mainColor)' } } }))
      .toBe('<div style="--mainColor: red; background-color: var(--mainColor)"></div>');
  });

  it('calls function values when merging class and className', () => {
    expect(render({ p: { class: () => ['a', false], className: () => 'b' } })).toBe('<p class="a b"></p>');
  });
});

describe('content values', () => {
  it('renders nothing for a text function that returns null or undefined', () => {
    expect(render({ p: { text: () => null } })).toBe('<p></p>');
    expect(render({ p: { text: () => undefined, children: ['after'] } })).toBe('<p>after</p>');
  });

  it('treats html: null like no raw HTML', () => {
    expect(render({ p: { html: null } })).toBe('<p></p>');
    expect(render({ p: { html: () => null, text: 'fallback' } })).toBe('<p>fallback</p>');
  });

  it('emits trusted content returned by a text function verbatim', () => {
    expect(render({ p: { text: () => dangerouslySetInnerContent('<i>x</i>') } })).toBe('<p><i>x</i></p>');
  });
});
