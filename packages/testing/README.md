# @coherentjs/testing

Complete testing utilities for Coherent.js applications.

## Installation

```bash
npm install --save-dev @coherentjs/testing
```

## Features

- ✅ **Test Renderer** - Render components in test environment
- ✅ **Query Utilities** - Find elements by testId, text, className
- ✅ **Event Simulation** - Simulate user interactions
- ✅ **Async Testing** - Wait for conditions and elements
- ✅ **Mock Functions** - Create mocks and spies
- ✅ **Custom Matchers** - Coherent.js-specific assertions
- ✅ **Snapshot Testing** - Component snapshot support
- ✅ **User Events** - Realistic user interaction simulation

## Quick Start

```javascript
import { describe, it, expect } from 'vitest';
import { renderComponent, extendExpect } from '@coherentjs/testing';

// Extend expect with custom matchers
extendExpect(expect);

describe('MyComponent', () => {
  it('should render correctly', () => {
    const component = {
      div: {
        'data-testid': 'my-div',
        text: 'Hello World'
      }
    };

    const { getByTestId } = renderComponent(component);
    
    expect(getByTestId('my-div')).toHaveText('Hello World');
  });
});
```

## API Reference

### Rendering

#### `renderComponent(component, options)`

Render a component for testing.

```javascript
const { getByTestId, getByText } = renderComponent({
  div: { 'data-testid': 'test', text: 'Hello' }
});
```

#### `renderComponentAsync(component, props, options)`

Render an async component.

```javascript
const result = await renderComponentAsync(asyncComponent, { name: 'World' });
```

#### `createTestRenderer(component, options)`

Create a test renderer for component updates.

```javascript
const renderer = createTestRenderer(component);
renderer.render();
renderer.update(newComponent);
```

#### `shallowRender(component)`

Shallow render (top-level only).

```javascript
const shallow = shallowRender(component);
```

### Queries

#### `getByTestId(testId)`

Get element by test ID (throws if not found).

```javascript
const element = getByTestId('submit-btn');
```

#### `queryByTestId(testId)`

Query element by test ID (returns null if not found).

```javascript
const element = queryByTestId('submit-btn');
```

#### `getByText(text)`

Get element by text content.

```javascript
const element = getByText('Submit');
```

#### `getByClassName(className)`

Get element by class name.

```javascript
const element = getByClassName('btn-primary');
```

#### `getAllByTagName(tagName)`

Get all elements by tag name.

```javascript
const items = getAllByTagName('li');
```

### Events

#### `fireEvent(element, eventType, eventData)`

Simulate an event.

```javascript
fireEvent(button, 'click');
fireEvent(input, 'change', { target: { value: 'test' } });
```

#### `userEvent`

Realistic user interactions.

```javascript
await userEvent.click(button);
await userEvent.type(input, 'Hello');
await userEvent.clear(input);
```

### Async Utilities

#### `waitFor(condition, options)`

Wait for a condition to be true.

```javascript
await waitFor(() => getByText('Loaded').exists, { timeout: 2000 });
```

#### `waitForElement(queryFn, options)`

Wait for an element to appear.

```javascript
const element = await waitForElement(() => queryByTestId('loaded'));
```

#### `waitForElementToBeRemoved(queryFn, options)`

Wait for an element to disappear.

```javascript
await waitForElementToBeRemoved(() => queryByTestId('loading'));
```

#### `act(callback)`

Batch updates.

```javascript
await act(async () => {
  // Perform updates
});
```

### Mocks & Spies

#### `createMock(implementation)`

Create a mock function.

```javascript
const mock = createMock((x) => x * 2);
mock(5); // returns 10

expect(mock).toHaveBeenCalledWith(5);
expect(mock).toHaveBeenCalledTimes(1);
```

#### `createSpy(object, method)`

Spy on an object method.

```javascript
const spy = createSpy(obj, 'method');
obj.method('test');
expect(spy).toHaveBeenCalledWith('test');
spy.mockRestore();
```

### Custom Matchers

Extend expect with Coherent.js-specific matchers:

```javascript
import { extendExpect } from '@coherentjs/testing';
extendExpect(expect);
```

Available matchers:

- `toHaveText(text)` - Element has exact text
- `toContainText(text)` - Element contains text
- `toHaveClass(className)` - Element has class
- `toBeInTheDocument()` - Element exists
- `toBeVisible()` - Element has visible content
- `toBeEmpty()` - Element is empty
- `toContainHTML(html)` - HTML contains string
- `toHaveAttribute(attr, value)` - Element has attribute
- `toHaveTagName(tagName)` - Element has tag name
- `toRenderSuccessfully()` - Component rendered
- `toBeValidHTML()` - HTML is valid
- `toHaveBeenCalled()` - Mock was called
- `toHaveBeenCalledWith(...args)` - Mock called with args
- `toHaveBeenCalledTimes(n)` - Mock called n times

### Utilities

#### `within(container)`

Scope queries to a container.

```javascript
const container = getByTestId('container');
const scoped = within(container);
scoped.getByText('Inner text');
```

#### `screen`

Global query utility.

```javascript
screen.setResult(result);
screen.getByTestId('test');
screen.debug();
```

#### `cleanup()`

Clean up after tests.

```javascript
afterEach(() => {
  cleanup();
});
```

## Examples

### Testing a Button Component

```javascript
import { renderComponent, fireEvent, createMock } from '@coherentjs/testing';

it('should handle click events', () => {
  const handleClick = createMock();
  
  const button = {
    button: {
      'data-testid': 'my-btn',
      text: 'Click me',
      onclick: handleClick
    }
  };

  const { getByTestId } = renderComponent(button);
  fireEvent(getByTestId('my-btn'), 'click');

  expect(handleClick).toHaveBeenCalled();
});
```

### Testing Async Components

```javascript
import { renderComponentAsync, waitForElement } from '@coherentjs/testing';

it('should load data', async () => {
  const AsyncComponent = async () => {
    const data = await fetchData();
    return { div: { text: data.message } };
  };

  const result = await renderComponentAsync(AsyncComponent);
  const element = await waitForElement(() => result.queryByText('Loaded'));

  expect(element).toBeInTheDocument();
});
```

### Testing Forms

```javascript
import { renderComponent, userEvent } from '@coherentjs/testing';

it('should submit form', async () => {
  const handleSubmit = createMock();
  
  const form = {
    form: {
      onsubmit: handleSubmit,
      children: [
        { input: { 'data-testid': 'name-input', type: 'text' } },
        { button: { 'data-testid': 'submit-btn', text: 'Submit' } }
      ]
    }
  };

  const { getByTestId } = renderComponent(form);
  
  await userEvent.type(getByTestId('name-input'), 'John');
  await userEvent.click(getByTestId('submit-btn'));

  expect(handleSubmit).toHaveBeenCalled();
});
```

### Snapshot Testing

```javascript
import { renderComponent } from '@coherentjs/testing';

it('should match snapshot', () => {
  const component = {
    div: {
      className: 'card',
      children: [
        { h2: { text: 'Title' } },
        { p: { text: 'Content' } }
      ]
    }
  };

  const result = renderComponent(component);
  expect(result.toSnapshot()).toMatchSnapshot();
});
```

## Best Practices

### 1. Use Test IDs

Add `data-testid` attributes for reliable querying:

```javascript
const component = {
  button: {
    'data-testid': 'submit-button',
    text: 'Submit'
  }
};
```

### 2. Clean Up After Tests

Always clean up to avoid test interference:

```javascript
afterEach(() => {
  cleanup();
});
```

### 3. Use Custom Matchers

Extend expect for better assertions:

```javascript
extendExpect(expect);
expect(element).toHaveText('Hello');
```

### 4. Test User Interactions

Use `userEvent` for realistic interactions:

```javascript
await userEvent.click(button);
await userEvent.type(input, 'text');
```

### 5. Wait for Async Updates

Use `waitFor` for async operations:

```javascript
await waitFor(() => getByText('Loaded').exists);
```

## Integration with Testing Frameworks

### Vitest

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderComponent, extendExpect, cleanup } from '@coherentjs/testing';

extendExpect(expect);

describe('MyComponent', () => {
  afterEach(cleanup);

  it('should work', () => {
    // Test code
  });
});
```

### Jest

```javascript
import { renderComponent, extendExpect, cleanup } from '@coherentjs/testing';

extendExpect(expect);

afterEach(cleanup);

test('should work', () => {
  // Test code
});
```

## License

MIT
