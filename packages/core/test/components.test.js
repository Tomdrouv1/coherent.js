import { describe, it, expect } from 'vitest';
import { createComponent, memo } from '../../../src/components/component-system.js';

describe('Component system', () => {
  it('creates basic component instance', () => {
    const Button = createComponent(({ text = 'Click me' }) => ({
      button: { text }
    }));
    
    expect(Button).toBeDefined();
    expect(typeof Button.render).toBe('function');
  });

  it('creates memoized function', () => {
    let callCount = 0;
    const ExpensiveComponent = memo(() => {
      callCount++;
      return { div: { text: 'Expensive' } };
    });
    
    const result1 = ExpensiveComponent();
    const result2 = ExpensiveComponent();
    
    expect(callCount).toBe(1);
    expect(result1).toEqual(result2);
  });

  it('handles component creation with props', () => {
    const Card = createComponent(({ title = 'Default', content }) => ({
      div: {
        className: 'card',
        children: [
          { h3: { text: title } },
          { p: { text: content } }
        ]
      }
    }));

    expect(Card).toBeDefined();
    expect(typeof Card.render).toBe('function');
    
    // Test the render function directly
    const rendered = Card.render({ 
      title: 'Test Card', 
      content: 'This is test content' 
    });

    expect(rendered.div.className).toBe('card');
    expect(rendered.div.children[0].h3.text).toBe('Test Card');
    expect(rendered.div.children[1].p.text).toBe('This is test content');
  });
});