import { test } from 'node:test';
import assert from 'node:assert';
import { defineComponent, memo } from '../../../src/components/component-system.js';

test('Component system', async (t) => {
  await t.test('creates basic component', () => {
    const Button = defineComponent({
      name: 'Button',
      render: ({ text = 'Click me' }) => ({
        button: { text }
      })
    });
    
    const component = Button({ text: 'Hello' });
    assert.deepStrictEqual(component, { button: { text: 'Hello' } });
  });

  await t.test('memoizes component results', () => {
    let callCount = 0;
    const ExpensiveComponent = memo(() => {
      callCount++;
      return { div: { text: 'Expensive' } };
    });
    
    const result1 = ExpensiveComponent();
    const result2 = ExpensiveComponent();
    
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(result1, result2);
  });

  await t.test('component with props', () => {
    const Greeting = defineComponent({
      name: 'Greeting',
      render: ({ name, title }) => ({
        div: {
          children: [
            { h2: { text: title || 'Hello' } },
            { p: { text: `Welcome, ${name}!` } }
          ]
        }
      })
    });
    
    const component = Greeting({ name: 'John', title: 'Hi there' });
    assert.deepStrictEqual(component, {
      div: {
        children: [
          { h2: { text: 'Hi there' } },
          { p: { text: 'Welcome, John!' } }
        ]
      }
    });
  });
});