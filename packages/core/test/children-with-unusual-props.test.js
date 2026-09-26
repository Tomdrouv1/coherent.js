import { describe, it, expect } from 'vitest';
import { render } from '../src/index.js';

describe('children of elements with non-tag-like prop names', () => {
  it('are rendered', () => {
    expect(render({ button: { '@click': 'save()', children: [{ span: { text: 'Save' } }] } }))
      .toBe('<button @click="save()"><span>Save</span></button>');
    expect(render({ div: { 'x-data': '{ open: false }', 'x-on:click': 'open = !open', children: [{ p: { text: 'menu' } }] } }))
      .toBe('<div x-data="{ open: false }" x-on:click="open = !open"><p>menu</p></div>');
    expect(render({ div: { data_id: '1', children: [{ p: { text: 'kept' } }] } }))
      .toBe('<div data_id="1"><p>kept</p></div>');
    expect(render({ svg: { 'xlink:href': '#i', children: { use: { href: '#i' } } } }))
      .toBe('<svg xlink:href="#i"><use href="#i"></use></svg>');
  });
});
