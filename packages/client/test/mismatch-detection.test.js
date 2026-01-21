import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectMismatch, reportMismatches, formatPath } from '../src/hydration/index.js';

// Helper to create mock DOM element
function createMockElement(tagName, attrs = {}, children = []) {
  const element = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    getAttribute: vi.fn((name) => attrs[name] || null),
    className: attrs.class || '',
    id: attrs.id || '',
    textContent: '',
    childNodes: [],
    parentElement: null
  };

  // Process children
  children.forEach(child => {
    if (typeof child === 'string') {
      const textNode = {
        nodeType: 3,
        textContent: child,
        parentElement: element
      };
      element.childNodes.push(textNode);
      element.textContent += child;
    } else {
      child.parentElement = element;
      element.childNodes.push(child);
      element.textContent += child.textContent || '';
    }
  });

  return element;
}

describe('formatPath', () => {
  it('returns "root" for empty path', () => {
    expect(formatPath([])).toBe('root');
  });

  it('returns "root" for null/undefined', () => {
    expect(formatPath(null)).toBe('root');
    expect(formatPath(undefined)).toBe('root');
  });

  it('joins path segments with dots', () => {
    expect(formatPath(['children[0]', '@class'])).toBe('children[0].@class');
  });
});

describe('detectMismatch', () => {
  it('returns empty array for matching elements', () => {
    const dom = createMockElement('div', { class: 'container' }, ['Hello']);
    const vdom = { div: { className: 'container', text: 'Hello' } };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches).toEqual([]);
  });

  it('detects tag name mismatch', () => {
    const dom = createMockElement('span');
    const vdom = { div: {} };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBe(1);
    expect(mismatches[0].type).toBe('tagName');
    expect(mismatches[0].expected).toBe('div');
    expect(mismatches[0].actual).toBe('span');
  });

  it('detects className mismatch', () => {
    const dom = createMockElement('div', { class: 'wrong-class' });
    const vdom = { div: { className: 'expected-class' } };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBe(1);
    expect(mismatches[0].type).toBe('attribute');
    expect(mismatches[0].path).toContain('@class');
    expect(mismatches[0].expected).toBe('expected-class');
    expect(mismatches[0].actual).toBe('wrong-class');
  });

  it('detects text content mismatch', () => {
    const dom = createMockElement('span', {}, ['Wrong text']);
    const vdom = { span: { text: 'Expected text' } };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches.some(m => m.type === 'text')).toBe(true);
  });

  it('detects missing DOM child', () => {
    const dom = createMockElement('div');
    const vdom = {
      div: {
        children: [{ span: { text: 'Child' } }]
      }
    };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches.some(m => m.type === 'children_count' || m.type === 'missing_dom_child')).toBe(true);
  });

  it('detects extra DOM child', () => {
    const dom = createMockElement('div', {}, [
      createMockElement('span', {}, ['Child 1']),
      createMockElement('span', {}, ['Child 2'])
    ]);
    const vdom = {
      div: {
        children: [{ span: { text: 'Child 1' } }]
      }
    };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches.some(m => m.type === 'children_count' || m.type === 'extra_dom_child')).toBe(true);
  });

  it('handles nested structure comparison', () => {
    const dom = createMockElement('div', {}, [
      createMockElement('ul', {}, [
        createMockElement('li', {}, ['Item 1']),
        createMockElement('li', {}, ['Wrong Item 2'])
      ])
    ]);

    const vdom = {
      div: {
        children: [{
          ul: {
            children: [
              { li: { text: 'Item 1' } },
              { li: { text: 'Item 2' } }
            ]
          }
        }]
      }
    };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBeGreaterThan(0);
    // Should find mismatch in nested li
    expect(mismatches.some(m => m.path.includes('children'))).toBe(true);
  });

  it('handles null/undefined virtual node', () => {
    const dom = createMockElement('div');
    expect(detectMismatch(dom, null)).toEqual([]);
    expect(detectMismatch(dom, undefined)).toEqual([]);
  });

  it('provides DOM path for debugging', () => {
    const dom = createMockElement('div', { class: 'container', id: 'app' });
    const vdom = { div: { className: 'wrong' } };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches[0].domPath).toBeDefined();
    expect(mismatches[0].domPath).toContain('div');
  });

  it('detects boolean attribute mismatch', () => {
    const dom = createMockElement('input', { disabled: null });
    const vdom = { input: { disabled: true } };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches.some(m => m.path.includes('@disabled'))).toBe(true);
  });

  it('detects id attribute mismatch', () => {
    const dom = createMockElement('div', { id: 'wrong-id' });
    const vdom = { div: { id: 'correct-id' } };

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches.length).toBe(1);
    expect(mismatches[0].type).toBe('attribute');
    expect(mismatches[0].path).toContain('@id');
  });

  it('handles string and number virtual nodes', () => {
    const textNode = {
      nodeType: 3,
      textContent: 'Hello World',
      parentElement: null
    };

    const mismatches = detectMismatch(textNode, 'Hello World');
    expect(mismatches).toEqual([]);

    const mismatchesNum = detectMismatch(textNode, 42);
    expect(mismatchesNum.length).toBe(1);
    expect(mismatchesNum[0].type).toBe('text');
  });

  it('handles array virtual nodes', () => {
    const dom = createMockElement('div', {}, [
      createMockElement('span', {}, ['One']),
      createMockElement('span', {}, ['Two'])
    ]);

    const vdom = [
      { span: { text: 'One' } },
      { span: { text: 'Two' } }
    ];

    const mismatches = detectMismatch(dom, vdom);
    expect(mismatches).toEqual([]);
  });
});

describe('reportMismatches', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('does nothing for empty mismatches', () => {
    reportMismatches([]);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does nothing for null/undefined mismatches', () => {
    reportMismatches(null);
    reportMismatches(undefined);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs detailed warning for mismatches', () => {
    const mismatches = [{
      path: 'children[0].@class',
      type: 'attribute',
      expected: 'expected',
      actual: 'actual',
      domPath: 'div > span'
    }];

    reportMismatches(mismatches, { componentName: 'TestComponent' });

    expect(consoleSpy).toHaveBeenCalled();
    const message = consoleSpy.mock.calls[0][0];
    expect(message).toContain('TestComponent');
    expect(message).toContain('children[0].@class');
    expect(message).toContain('expected');
    expect(message).toContain('actual');
  });

  it('throws in strict mode', () => {
    const mismatches = [{
      path: 'root',
      type: 'tagName',
      expected: 'div',
      actual: 'span',
      domPath: 'span'
    }];

    expect(() => {
      reportMismatches(mismatches, { strict: true });
    }).toThrow('Hydration failed');
  });

  it('includes debugging advice in warning', () => {
    const mismatches = [{
      path: 'root',
      type: 'text',
      expected: 'a',
      actual: 'b',
      domPath: 'div'
    }];

    reportMismatches(mismatches);

    const message = consoleSpy.mock.calls[0][0];
    expect(message).toContain('Date.now()');
    expect(message).toContain('Math.random()');
  });

  it('shows mismatch count in header', () => {
    const mismatches = [
      { path: 'a', type: 'text', expected: '1', actual: '2', domPath: 'div' },
      { path: 'b', type: 'text', expected: '3', actual: '4', domPath: 'div' },
      { path: 'c', type: 'text', expected: '5', actual: '6', domPath: 'div' }
    ];

    reportMismatches(mismatches, { componentName: 'MyComponent' });

    const message = consoleSpy.mock.calls[0][0];
    expect(message).toContain('3 difference');
    expect(message).toContain('MyComponent');
  });

  it('uses default component name when not provided', () => {
    const mismatches = [{
      path: 'root',
      type: 'text',
      expected: 'a',
      actual: 'b',
      domPath: 'div'
    }];

    reportMismatches(mismatches);

    const message = consoleSpy.mock.calls[0][0];
    expect(message).toContain('Unknown');
  });
});
