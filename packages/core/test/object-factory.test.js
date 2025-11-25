import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createElement,
  createTextNode,
  h
} from '../src/core/object-factory.js';

describe('Object Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createElement', () => {
    it('should create a basic element with tag', () => {
      const result = createElement('div');

      expect(result).toHaveProperty('div');
      expect(result.div).toHaveProperty('_type', 'coherent-element');
    });

    it('should create element with properties', () => {
      const props = {
        className: 'test-class',
        id: 'test-id',
        text: 'Hello World'
      };
      const result = createElement('div', props);

      expect(result.div).toMatchObject(props);
      expect(result.div._type).toBe('coherent-element');
    });

    it('should handle empty props object', () => {
      const result = createElement('span', {});

      expect(result).toHaveProperty('span');
      expect(result.span).toHaveProperty('_type', 'coherent-element');
      expect(Object.keys(result.span)).toEqual(['_type']);
    });

    it('should handle default props when not provided', () => {
      const result = createElement('p');

      expect(result.p).toHaveProperty('_type', 'coherent-element');
      expect(Object.keys(result.p)).toEqual(['_type']);
    });

    it('should throw error for invalid HTML element', () => {
      expect(() => createElement('invalid-tag')).toThrow('Invalid HTML element: invalid-tag');
    });

    it('should throw error for null/undefined tag', () => {
      expect(() => createElement(null)).toThrow();
      expect(() => createElement(undefined)).toThrow();
    });

    it('should handle various valid HTML elements', () => {
      const elements = ['div', 'span', 'p', 'h1', 'a', 'img', 'button', 'input', 'form'];

      elements.forEach(tag => {
        const result = createElement(tag);
        expect(result).toHaveProperty(tag);
        expect(result[tag]).toHaveProperty('_type', 'coherent-element');
      });
    });

    it('should preserve all provided properties', () => {
      const props = {
        className: 'container',
        id: 'main',
        disabled: true,
        'data-testid': 'test',
        style: 'color: red;',
        text: 'Content'
      };
      const result = createElement('div', props);

      Object.keys(props).forEach(key => {
        expect(result.div[key]).toBe(props[key]);
      });
      expect(result.div._type).toBe('coherent-element');
    });

    it('should handle boolean properties', () => {
      const props = {
        disabled: true,
        readonly: false,
        required: true
      };
      const result = createElement('input', props);

      expect(result.input.disabled).toBe(true);
      expect(result.input.readonly).toBe(false);
      expect(result.input.required).toBe(true);
      expect(result.input._type).toBe('coherent-element');
    });

    it('should handle numeric properties', () => {
      const props = {
        tabindex: 1,
        maxlength: 100,
        size: 20
      };
      const result = createElement('input', props);

      expect(result.input.tabindex).toBe(1);
      expect(result.input.maxlength).toBe(100);
      expect(result.input.size).toBe(20);
      expect(result.input._type).toBe('coherent-element');
    });

    it('should handle array properties', () => {
      const props = {
        className: ['class1', 'class2'],
        dataset: { key: 'value' }
      };
      const result = createElement('div', props);

      expect(result.div.className).toEqual(['class1', 'class2']);
      expect(result.div.dataset).toEqual({ key: 'value' });
      expect(result.div._type).toBe('coherent-element');
    });
  });

  describe('createTextNode', () => {
    it('should create a text node with string content', () => {
      const result = createTextNode('Hello World');

      expect(result).toEqual({
        text: 'Hello World',
        _type: 'coherent-object'
      });
    });

    it('should convert numbers to strings', () => {
      const result = createTextNode(42);

      expect(result).toEqual({
        text: '42',
        _type: 'coherent-object'
      });
    });

    it('should convert boolean to strings', () => {
      const result = createTextNode(true);

      expect(result).toEqual({
        text: 'true',
        _type: 'coherent-object'
      });
    });

    it('should handle empty string', () => {
      const result = createTextNode('');

      expect(result).toEqual({
        text: '',
        _type: 'coherent-object'
      });
    });

    it('should handle null and undefined', () => {
      const result1 = createTextNode(null);
      const result2 = createTextNode(undefined);

      expect(result1).toEqual({
        text: 'null',
        _type: 'coherent-object'
      });
      expect(result2).toEqual({
        text: 'undefined',
        _type: 'coherent-object'
      });
    });

    it('should handle objects by converting to string', () => {
      const obj = { key: 'value' };
      const result = createTextNode(obj);

      expect(result).toEqual({
        text: '[object Object]',
        _type: 'coherent-object'
      });
    });

    it('should handle arrays by converting to string', () => {
      const arr = [1, 2, 3];
      const result = createTextNode(arr);

      expect(result).toEqual({
        text: '1,2,3',
        _type: 'coherent-object'
      });
    });
  });

  describe('h helper object', () => {
    it('should contain common HTML element creators', () => {
      const expectedElements = [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'img', 'button', 'input', 'form', 'ul', 'ol', 'li',
        'table', 'tr', 'td', 'th'
      ];

      expectedElements.forEach(element => {
        expect(h).toHaveProperty(element);
        expect(typeof h[element]).toBe('function');
      });
    });

    it('should create div elements correctly', () => {
      const props = { className: 'test', text: 'Content' };
      const result = h.div(props);

      expect(result).toHaveProperty('div');
      expect(result.div).toMatchObject(props);
      expect(result.div._type).toBe('coherent-element');
    });

    it('should create span elements correctly', () => {
      const props = { text: 'Span content' };
      const result = h.span(props);

      expect(result).toHaveProperty('span');
      expect(result.span).toMatchObject(props);
      expect(result.span._type).toBe('coherent-element');
    });

    it('should create heading elements correctly', () => {
      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

      headings.forEach(heading => {
        const props = { text: `Heading ${heading}` };
        const result = h[heading](props);

        expect(result).toHaveProperty(heading);
        expect(result[heading]).toMatchObject(props);
        expect(result[heading]._type).toBe('coherent-element');
      });
    });

    it('should create link elements correctly', () => {
      const props = { href: '#test', text: 'Link' };
      const result = h.a(props);

      expect(result).toHaveProperty('a');
      expect(result.a).toMatchObject(props);
      expect(result.a._type).toBe('coherent-element');
    });

    it('should create image elements correctly', () => {
      const props = { src: 'test.jpg', alt: 'Test image' };
      const result = h.img(props);

      expect(result).toHaveProperty('img');
      expect(result.img).toMatchObject(props);
      expect(result.img._type).toBe('coherent-element');
    });

    it('should create button elements correctly', () => {
      const props = { type: 'submit', text: 'Submit' };
      const result = h.button(props);

      expect(result).toHaveProperty('button');
      expect(result.button).toMatchObject(props);
      expect(result.button._type).toBe('coherent-element');
    });

    it('should create input elements correctly', () => {
      const props = { type: 'text', placeholder: 'Enter text' };
      const result = h.input(props);

      expect(result).toHaveProperty('input');
      expect(result.input).toMatchObject(props);
      expect(result.input._type).toBe('coherent-element');
    });

    it('should create form elements correctly', () => {
      const props = { method: 'post', action: '/submit' };
      const result = h.form(props);

      expect(result).toHaveProperty('form');
      expect(result.form).toMatchObject(props);
      expect(result.form._type).toBe('coherent-element');
    });

    it('should create list elements correctly', () => {
      const ulProps = { className: 'list' };
      const liProps = { text: 'List item' };

      const ulResult = h.ul(ulProps);
      const liResult = h.li(liProps);

      expect(ulResult).toHaveProperty('ul');
      expect(ulResult.ul).toMatchObject(ulProps);
      expect(ulResult.ul._type).toBe('coherent-element');

      expect(liResult).toHaveProperty('li');
      expect(liResult.li).toMatchObject(liProps);
      expect(liResult.li._type).toBe('coherent-element');
    });

    it('should create table elements correctly', () => {
      const tableProps = { className: 'table' };
      const trProps = { className: 'row' };
      const tdProps = { text: 'Cell' };
      const thProps = { text: 'Header' };

      const tableResult = h.table(tableProps);
      const trResult = h.tr(trProps);
      const tdResult = h.td(tdProps);
      const thResult = h.th(thProps);

      expect(tableResult).toHaveProperty('table');
      expect(tableResult.table._type).toBe('coherent-element');

      expect(trResult).toHaveProperty('tr');
      expect(trResult.tr._type).toBe('coherent-element');

      expect(tdResult).toHaveProperty('td');
      expect(tdResult.td._type).toBe('coherent-element');

      expect(thResult).toHaveProperty('th');
      expect(thResult.th._type).toBe('coherent-element');
    });
  });

  describe('Integration Tests', () => {
    it('should work together to create complex structures', () => {
      const divElement = h.div({
        className: 'container',
        children: [
          h.h1({ text: 'Title' }),
          h.p({ text: 'Paragraph' }),
          h.button({ text: 'Click me' })
        ]
      });

      expect(divElement).toHaveProperty('div');
      expect(divElement.div.className).toBe('container');
      expect(divElement.div._type).toBe('coherent-element');
    });

    it('should combine createElement and createTextNode', () => {
      const textNode = createTextNode('Hello World');
      const container = createElement('div', {
        className: 'wrapper',
        children: [textNode]
      });

      expect(container).toHaveProperty('div');
      expect(container.div.className).toBe('wrapper');
      expect(container.div._type).toBe('coherent-element');
      expect(textNode.text).toBe('Hello World');
      expect(textNode._type).toBe('coherent-object');
    });

    it('should handle nested element creation', () => {
      const form = h.form({
        method: 'post',
        children: [
          h.div({
            className: 'form-group',
            children: [
              h.span({ text: 'Name:' }),
              h.input({ type: 'text', name: 'name' })
            ]
          }),
          h.button({ type: 'submit', text: 'Submit' })
        ]
      });

      expect(form).toHaveProperty('form');
      expect(form.form.method).toBe('post');
      expect(form.form._type).toBe('coherent-element');
    });
  });
});
