/**
 * Coherent.js Testing Demo
 * 
 * Comprehensive examples of testing Coherent.js components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderComponent,
  renderComponentAsync,
  createTestRenderer,
  shallowRender,
  fireEvent,
  waitFor,
  waitForElement,
  act,
  createMock,
  createSpy,
  cleanup,
  within,
  screen,
  userEvent,
  extendExpect,
  assertions
} from '../packages/testing/src/index.js';

// Extend expect with custom matchers
extendExpect(expect);

describe('Coherent.js Testing Utilities', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('should render a simple component', () => {
      const component = {
        div: {
          'data-testid': 'my-div',
          text: 'Hello World'
        }
      };

      const { getByTestId } = renderComponent(component);
      const element = getByTestId('my-div');

      expect(element).toHaveText('Hello World');
      expect(element).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const component = {
        div: {
          className: 'container',
          children: [
            { h1: { text: 'Title' } },
            { p: { text: 'Description' } }
          ]
        }
      };

      const result = renderComponent(component);
      
      expect(result.getByText('Title')).toBeInTheDocument();
      expect(result.getByText('Description')).toBeInTheDocument();
      expect(result.getByClassName('container')).toBeInTheDocument();
    });

    it('should handle components with multiple children', () => {
      const component = {
        ul: {
          'data-testid': 'list',
          children: [
            { li: { text: 'Item 1' } },
            { li: { text: 'Item 2' } },
            { li: { text: 'Item 3' } }
          ]
        }
      };

      const result = renderComponent(component);
      const items = result.getAllByTagName('li');

      expect(items).toHaveLength(3);
      expect(items[0]).toHaveText('Item 1');
      expect(items[2]).toHaveText('Item 3');
    });
  });

  describe('Querying Elements', () => {
    const testComponent = {
      div: {
        children: [
          { 
            button: { 
              'data-testid': 'submit-btn',
              className: 'btn btn-primary',
              text: 'Submit'
            }
          },
          {
            p: {
              'data-testid': 'message',
              text: 'Welcome to testing'
            }
          }
        ]
      }
    };

    it('should query by test ID', () => {
      const { getByTestId, queryByTestId } = renderComponent(testComponent);

      expect(getByTestId('submit-btn')).toBeInTheDocument();
      expect(queryByTestId('non-existent')).toBeNull();
    });

    it('should query by text', () => {
      const { getByText, queryByText } = renderComponent(testComponent);

      expect(getByText('Submit')).toBeInTheDocument();
      expect(getByText('Welcome to testing')).toBeInTheDocument();
      expect(queryByText('Not here')).toBeNull();
    });

    it('should query by class name', () => {
      const { getByClassName } = renderComponent(testComponent);

      expect(getByClassName('btn-primary')).toBeInTheDocument();
      expect(getByClassName('btn')).toBeInTheDocument();
    });

    it('should check element existence', () => {
      const { exists } = renderComponent(testComponent);

      expect(exists('submit-btn', 'testId')).toBe(true);
      expect(exists('Submit', 'text')).toBe(true);
      expect(exists('non-existent', 'testId')).toBe(false);
    });
  });

  describe('Test Renderer', () => {
    it('should create a test renderer', () => {
      const component = {
        div: { text: 'Initial' }
      };

      const renderer = createTestRenderer(component);
      const result = renderer.render();

      expect(result.getByText('Initial')).toBeInTheDocument();
      expect(renderer.getRenderCount()).toBe(1);
    });

    it('should update and re-render', () => {
      const initial = { div: { text: 'Initial' } };
      const updated = { div: { text: 'Updated' } };

      const renderer = createTestRenderer(initial);
      renderer.render();

      expect(renderer.getByText('Initial')).toBeInTheDocument();

      renderer.update(updated);
      
      expect(renderer.getByText('Updated')).toBeInTheDocument();
      expect(renderer.getRenderCount()).toBe(2);
    });

    it('should unmount component', () => {
      const renderer = createTestRenderer({ div: { text: 'Test' } });
      renderer.render();
      
      expect(renderer.getResult()).not.toBeNull();
      
      renderer.unmount();
      
      expect(renderer.getResult()).toBeNull();
    });
  });

  describe('Async Rendering', () => {
    it('should render async components', async () => {
      const asyncComponent = async () => ({
        div: {
          'data-testid': 'async-div',
          text: 'Loaded'
        }
      });

      const result = await renderComponentAsync(asyncComponent);
      
      expect(result.getByTestId('async-div')).toHaveText('Loaded');
    });

    it('should handle async component with props', async () => {
      const asyncComponent = async (props) => ({
        div: {
          text: `Hello ${props.name}`
        }
      });

      const result = await renderComponentAsync(asyncComponent, { name: 'World' });
      
      expect(result.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Shallow Rendering', () => {
    it('should shallow render component', () => {
      const component = {
        div: {
          children: [
            { h1: { text: 'Title' } },
            { 
              section: {
                children: [
                  { p: { text: 'Deep content' } }
                ]
              }
            }
          ]
        }
      };

      const shallow = shallowRender(component);
      
      expect(shallow.div.children).toBeDefined();
      expect(shallow.div.children[0]._shallow).toBe(true);
    });
  });

  describe('Event Simulation', () => {
    it('should simulate click events', () => {
      const handleClick = createMock();
      
      const component = {
        button: {
          'data-testid': 'click-btn',
          text: 'Click me',
          onclick: handleClick
        }
      };

      const { getByTestId } = renderComponent(component);
      const button = getByTestId('click-btn');

      fireEvent(button, 'click');

      expect(handleClick).toHaveBeenCalled();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should simulate user typing', async () => {
      const handleInput = createMock();
      
      const input = {
        value: '',
        oninput: handleInput
      };

      await userEvent.type(input, 'Hello');

      expect(handleInput).toHaveBeenCalledTimes(5); // Once per character
    });

    it('should simulate user click', async () => {
      const handleClick = createMock();
      const button = { onclick: handleClick };

      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Waiting Utilities', () => {
    it('should wait for condition', async () => {
      let value = false;
      
      setTimeout(() => { value = true; }, 100);

      await waitFor(() => value === true, { timeout: 500 });

      expect(value).toBe(true);
    });

    it('should timeout if condition not met', async () => {
      await expect(
        waitFor(() => false, { timeout: 100 })
      ).rejects.toThrow('Timeout');
    });

    it('should wait for element to appear', async () => {
      let component = { div: { text: 'Loading...' } };
      
      setTimeout(() => {
        component = { div: { 'data-testid': 'loaded', text: 'Loaded!' } };
      }, 100);

      const { queryByTestId } = renderComponent(component);

      await waitForElement(() => queryByTestId('loaded'), { timeout: 500 });
    });
  });

  describe('Mock Functions', () => {
    it('should create mock function', () => {
      const mock = createMock();

      mock('arg1', 'arg2');
      mock('arg3');

      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mock.mock.calls[0]).toEqual(['arg1', 'arg2']);
      expect(mock.mock.calls[1]).toEqual(['arg3']);
    });

    it('should mock implementation', () => {
      const mock = createMock((x) => x * 2);

      expect(mock(5)).toBe(10);
      expect(mock(3)).toBe(6);
    });

    it('should mock return value', () => {
      const mock = createMock();
      mock.mockReturnValue(42);

      expect(mock()).toBe(42);
      expect(mock()).toBe(42);
    });

    it('should mock resolved value', async () => {
      const mock = createMock();
      mock.mockResolvedValue('success');

      const result = await mock();
      
      expect(result).toBe('success');
    });

    it('should mock rejected value', async () => {
      const mock = createMock();
      mock.mockRejectedValue(new Error('Failed'));

      await expect(mock()).rejects.toThrow('Failed');
    });

    it('should clear mock', () => {
      const mock = createMock();
      
      mock('test');
      expect(mock).toHaveBeenCalledTimes(1);
      
      mock.mockClear();
      expect(mock).toHaveBeenCalledTimes(0);
    });
  });

  describe('Spy Functions', () => {
    it('should spy on object method', () => {
      const obj = {
        method: (x) => x * 2
      };

      const spy = createSpy(obj, 'method');

      const result = obj.method(5);

      expect(result).toBe(10);
      expect(spy).toHaveBeenCalledWith(5);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });

  describe('Act Utility', () => {
    it('should batch updates', async () => {
      const state = { count: 0 };

      await act(async () => {
        state.count++;
        state.count++;
      });

      expect(state.count).toBe(2);
    });
  });

  describe('Within Utility', () => {
    it('should scope queries to container', () => {
      const component = {
        div: {
          'data-testid': 'container',
          children: [
            { p: { 'data-testid': 'inner', text: 'Inner text' } }
          ]
        }
      };

      const result = renderComponent(component);
      const container = result.getByTestId('container');
      const scoped = within(container);

      expect(scoped.getByTestId('inner')).toHaveText('Inner text');
    });
  });

  describe('Screen Utility', () => {
    it('should use screen for global queries', () => {
      const component = {
        div: { 'data-testid': 'test', text: 'Screen test' }
      };

      const result = renderComponent(component);
      screen.setResult(result);

      expect(screen.getByTestId('test')).toHaveText('Screen test');
      expect(screen.getByText('Screen test')).toBeInTheDocument();
    });
  });

  describe('Custom Matchers', () => {
    it('should use toHaveText matcher', () => {
      const element = { text: 'Hello' };
      expect(element).toHaveText('Hello');
    });

    it('should use toContainText matcher', () => {
      const element = { text: 'Hello World' };
      expect(element).toContainText('World');
    });

    it('should use toHaveClass matcher', () => {
      const element = { className: 'btn btn-primary' };
      expect(element).toHaveClass('btn-primary');
    });

    it('should use toBeInTheDocument matcher', () => {
      const element = { exists: true };
      expect(element).toBeInTheDocument();
    });

    it('should use toBeVisible matcher', () => {
      const element = { text: 'Visible text' };
      expect(element).toBeVisible();
    });

    it('should use toBeEmpty matcher', () => {
      const element = { text: '' };
      expect(element).toBeEmpty();
    });

    it('should use toContainHTML matcher', () => {
      const result = { html: '<div class="test">Content</div>' };
      expect(result).toContainHTML('class="test"');
    });

    it('should use toRenderSuccessfully matcher', () => {
      const result = { html: '<div>Success</div>' };
      expect(result).toRenderSuccessfully();
    });
  });

  describe('Assertions', () => {
    it('should assert element has text', () => {
      const element = { text: 'Hello' };
      assertions.assertHasText(element, 'Hello');
    });

    it('should assert element exists', () => {
      const element = { exists: true };
      assertions.assertExists(element);
    });

    it('should assert element has class', () => {
      const element = { className: 'btn btn-primary' };
      assertions.assertHasClass(element, 'btn-primary');
    });

    it('should assert HTML contains string', () => {
      const html = '<div class="test">Content</div>';
      assertions.assertContainsHTML(html, 'class="test"');
    });

    it('should assert component rendered', () => {
      const result = { html: '<div>Rendered</div>' };
      assertions.assertRendered(result);
    });
  });

  describe('Snapshot Testing', () => {
    it('should create snapshot', () => {
      const component = {
        div: {
          className: 'snapshot-test',
          children: [
            { h1: { text: 'Title' } },
            { p: { text: 'Content' } }
          ]
        }
      };

      const result = renderComponent(component);
      const snapshot = result.toSnapshot();

      expect(snapshot).toMatchSnapshot();
    });
  });

  describe('Debug Utilities', () => {
    it('should debug component', () => {
      const component = { div: { text: 'Debug test' } };
      const result = renderComponent(component);

      // This would print to console
      result.debug();
    });
  });

  describe('Real-World Example: Counter Component', () => {
    const createCounter = (initialCount = 0) => {
      let count = initialCount;
      
      return {
        div: {
          className: 'counter',
          children: [
            { 
              p: { 
                'data-testid': 'count-display',
                text: `Count: ${count}` 
              }
            },
            {
              button: {
                'data-testid': 'increment-btn',
                text: 'Increment',
                onclick: () => { count++; }
              }
            },
            {
              button: {
                'data-testid': 'decrement-btn',
                text: 'Decrement',
                onclick: () => { count--; }
              }
            }
          ]
        }
      };
    };

    it('should render counter with initial count', () => {
      const counter = createCounter(5);
      const { getByTestId } = renderComponent(counter);

      expect(getByTestId('count-display')).toContainText('Count: 5');
    });

    it('should have increment and decrement buttons', () => {
      const counter = createCounter();
      const { getByTestId } = renderComponent(counter);

      expect(getByTestId('increment-btn')).toHaveText('Increment');
      expect(getByTestId('decrement-btn')).toHaveText('Decrement');
    });
  });
});

console.log('\n✅ All tests defined! Run with: npm test\n');
