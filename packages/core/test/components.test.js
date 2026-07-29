import { describe, it, expect } from 'vitest';
import { createComponent, memo } from '../src/components/component-system.js';
import { render } from '../src/index.js';

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

// Regression: createComponent used to return a bare Component instance, so the
// documented `render(Counter({ count: 2 }))` contract threw "X is not a
// function" -- and passing the instance to render() silently emitted
// `<definition name="..." render=""></definition>` instead of failing.
describe('createComponent returns a callable component', () => {
  const Eyebrow = () => createComponent(({ className = '', children, ...props }) => ({
    div: { className: `eyebrow ${className}`.trim(), children, ...props }
  }));

  it('is callable', () => {
    expect(typeof Eyebrow()).toBe('function');
  });

  it('renders when invoked with props', () => {
    const html = render(Eyebrow()({
      className: 'lead',
      children: [{ span: { text: 'hi' } }]
    }));

    expect(html).toBe('<div class="eyebrow lead"><span>hi</span></div>');
  });

  it('supports the documented README example', () => {
    const Counter = createComponent(({ count = 0 }) => ({
      div: {
        class: 'counter',
        children: [{ span: { text: `Count: ${count}` } }]
      }
    }));

    expect(render(Counter({ count: 2 })))
      .toBe('<div class="counter"><span>Count: 2</span></div>');
  });

  it('never renders the component definition as an element', () => {
    const html = render(Eyebrow());

    expect(html).not.toContain('<definition');
    expect(html).toContain('<div class="eyebrow">');
  });

  it('preserves the Component instance API', () => {
    const component = Eyebrow();

    expect(typeof component.render).toBe('function');
    expect(component.render({ className: 'x' }).div.className).toBe('eyebrow x');
    expect(component.name).toBe('FunctionalComponent');
    expect(typeof component.state.get).toBe('function');
    expect(component.getMetadata().renderCount).toBeGreaterThan(0);
  });

  it('keeps lifecycle chaining callable', () => {
    const component = Eyebrow();
    const mounted = component.mount();

    expect(typeof mounted).toBe('function');
    expect(component.isMounted).toBe(true);
    expect(render(mounted({ className: 'y' }))).toBe('<div class="eyebrow y"></div>');
  });

  it('clones into another callable component', () => {
    const clone = Eyebrow().clone();

    expect(typeof clone).toBe('function');
    expect(render(clone({ className: 'z' }))).toBe('<div class="eyebrow z"></div>');
  });

  it('exposes properties a lifecycle hook assigns after construction', () => {
    const component = createComponent({
      name: 'Timer',
      render: () => ({ div: {} }),
      mounted() { this.timerId = 42; }
    });

    component.mount();

    expect(component.timerId).toBe(42);
  });

  it('writes through to the instance for new keys', () => {
    const component = Eyebrow();

    component.late = 'value';

    expect(component.late).toBe('value');
    expect('late' in component).toBe(true);
  });

  it('accepts an object definition as before', () => {
    const Titled = createComponent({
      name: 'Titled',
      render: ({ title = 'Default' }) => ({ h1: { text: title } })
    });

    expect(Titled.name).toBe('Titled');
    expect(render(Titled({ title: 'Hello' }))).toBe('<h1>Hello</h1>');
  });
});