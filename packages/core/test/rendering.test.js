import { describe, it, expect } from 'vitest';
import { renderToString } from '../../../src/coherent.js';

describe('Component Rendering', () => {
  it('renders basic component correctly', () => {
    const BasicComponent = {
      div: {
        className: 'test',
        text: 'Hello, World!'
      }
    };

    const html = renderToString(BasicComponent, {
      enableCache: true,
      enableMonitoring: false
    });
    
    expect(html).toBe('<div class="test">Hello, World!</div>');
  });

  it('renders component with children correctly', () => {
    const ComponentWithChildren = {
      div: {
        className: 'parent',
        children: [
          { h1: { text: 'Title' } },
          { p: { text: 'Content' } }
        ]
      }
    };

    const html = renderToString(ComponentWithChildren, {
      enableCache: true,
      enableMonitoring: false
    });

    expect(html).toMatch(/<div class="parent"><h1>Title<\/h1><p>Content<\/p><\/div>/);
  });

  it('renders boolean values as text', () => {
    const ComponentWithBooleans = {
      div: {
        children: [
          { span: { text: true } },
          { span: { text: false } }
        ]
      }
    };

    const html = renderToString(ComponentWithBooleans, {
      enableCache: true,
      enableMonitoring: false
    });

    expect(html).toMatch(/<div><span>true<\/span><span>false<\/span><\/div>/);
  });

  it('handles complex nested structures', () => {
    const ComplexComponent = {
      article: {
        className: 'post',
        children: [
          {
            header: {
              children: [
                { h1: { text: 'Article Title' } },
                { time: { datetime: '2023-01-01', text: 'Jan 1, 2023' } }
              ]
            }
          },
          {
            main: {
              children: [
                { p: { text: 'First paragraph' } },
                { p: { text: 'Second paragraph' } }
              ]
            }
          }
        ]
      }
    };

    const html = renderToString(ComplexComponent);
    expect(html).toContain('class="post"');
    expect(html).toContain('Article Title');
    expect(html).toContain('First paragraph');
  });
});