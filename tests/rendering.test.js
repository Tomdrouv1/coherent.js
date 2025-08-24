import { test } from 'node:test';
import { strictEqual, match } from 'node:assert';
import { renderToString } from '../src/coherent.js';

// Test basic component rendering
const BasicComponent = {
  div: {
    className: 'test',
    text: 'Hello, World!'
  }
};

test('Basic component renders correctly', () => {
  const html = renderToString(BasicComponent);
  strictEqual(html, '<div class="test">Hello, World!</div>');
});

test('Component with children renders correctly', () => {
  const ComponentWithChildren = {
    div: {
      className: 'parent',
      children: [
        { h1: { text: 'Title' } },
        { p: { text: 'Content' } }
      ]
    }
  };
  
  const html = renderToString(ComponentWithChildren);
  match(html, /<div class="parent">/);
  match(html, /<h1>Title<\/h1>/);
  match(html, /<p>Content<\/p>/);
});

test('Boolean values render as text', () => {
  const ComponentWithBoolean = {
    div: {
      children: [
        { span: { text: true } },
        { span: { text: false } }
      ]
    }
  };
  
  const html = renderToString(ComponentWithBoolean);
  match(html, /<span>true<\/span>/);
  match(html, /<span>false<\/span>/);
});
