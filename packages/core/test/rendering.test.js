import { test } from 'node:test';
import assert from 'node:assert';
import { renderToString } from '../../../src/rendering/html-renderer.js';

test('Core rendering functionality', async (t) => {
  await t.test('renders simple object to HTML', () => {
    const component = {
      div: { text: 'Hello World' }
    };
    
    const html = renderToString(component);
    assert.strictEqual(html, '<div>Hello World</div>');
  });

  await t.test('renders nested components', () => {
    const component = {
      div: {
        className: 'container',
        children: [
          { h1: { text: 'Title' } },
          { p: { text: 'Content' } }
        ]
      }
    };
    
    const html = renderToString(component);
    assert.strictEqual(html, '<div class="container"><h1>Title</h1><p>Content</p></div>');
  });

  await t.test('escapes HTML in text content', () => {
    const component = {
      p: { text: '<script>alert("xss")</script>' }
    };
    
    const html = renderToString(component);
    assert.strictEqual(html, '<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>');
  });
});