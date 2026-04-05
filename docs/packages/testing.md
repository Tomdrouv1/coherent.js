# Testing

`@coherent.js/testing` provides utilities for rendering and testing Coherent.js components in a test environment. It works with Vitest, Jest, or any compatible test runner.

## Installation

```bash
pnpm add -D @coherent.js/testing
```

## Basic Usage

### Rendering Components

```javascript
import { renderComponent } from '@coherent.js/testing';

const result = renderComponent({
  div: {
    'data-testid': 'greeting',
    className: 'card',
    text: 'Hello World'
  }
});

expect(result.getByTestId('greeting').text).toBe('Hello World');
expect(result.getByClassName('card').exists).toBe(true);
```

### Async Rendering

```javascript
import { renderComponentAsync } from '@coherent.js/testing';

const MyComponent = async (props) => ({
  h1: { text: `Hello, ${props.name}!` }
});

const result = await renderComponentAsync(MyComponent, { name: 'Alice' });
expect(result.getByText('Hello, Alice!')).toBeTruthy();
```

### Custom Matchers

```javascript
import { expect } from 'vitest';
import { extendExpect, renderComponent } from '@coherent.js/testing';

extendExpect(expect);

const result = renderComponent({ p: { text: 'Content' } });
expect(result.getByText('Content')).toBeInTheDocument();
expect(result).toRenderSuccessfully();
expect(result).toBeValidHTML();
```

## API Reference

### Rendering

| Function | Description |
|---|---|
| `renderComponent(component, options?)` | Render a component and return a `TestRendererResult` |
| `renderComponentAsync(component, props?, options?)` | Render an async component or factory function |
| `shallowRender(component)` | Shallow render (children replaced with `{ _shallow: true }`) |
| `createTestRenderer(component, options?)` | Create a `TestRenderer` for testing updates |

### TestRendererResult

Query methods on the rendered output.

| Method | Description |
|---|---|
| `getByTestId(id)` | Find element by `data-testid` (throws if not found) |
| `queryByTestId(id)` | Find element by `data-testid` (returns null) |
| `getByText(text)` | Find element by text content |
| `queryByText(text)` | Find element by text content (returns null) |
| `getByClassName(name)` | Find element by class name |
| `getAllByTagName(tag)` | Find all elements with a tag name |
| `exists(selector, type)` | Check existence by testId, text, or className |
| `getHTML()` | Get the full rendered HTML string |
| `toSnapshot()` | Get formatted HTML for snapshot testing |
| `debug()` | Print rendered HTML and component to console |

### TestRenderer

Stateful renderer for testing component updates.

```javascript
const renderer = createTestRenderer(MyComponent);
renderer.render();
renderer.update(UpdatedComponent);
expect(renderer.getRenderCount()).toBe(2);
```

### Event Simulation

```javascript
import { fireEvent, userEvent } from '@coherent.js/testing';

fireEvent(element, 'click', { clientX: 100 });
await userEvent.type(inputElement, 'hello', { delay: 50 });
await userEvent.click(buttonElement);
await userEvent.clear(inputElement);
```

### Async Utilities

| Function | Description |
|---|---|
| `waitFor(condition, { timeout, interval })` | Poll until condition returns truthy |
| `waitForElement(queryFn, options)` | Wait for an element to appear |
| `waitForElementToBeRemoved(queryFn, options)` | Wait for an element to disappear |
| `act(callback)` | Batch state updates and flush pending microtasks |

### Mocking

```javascript
import { createMock, createSpy } from '@coherent.js/testing';

const mock = createMock((x) => x * 2);
mock(5);
expect(mock.mock.calls).toEqual([[5]]);

const spy = createSpy(myObject, 'myMethod');
myObject.myMethod('arg');
spy.mockRestore();
```

### Custom Matchers

After calling `extendExpect(expect)`, the following matchers are available:

`toHaveText`, `toContainText`, `toHaveClass`, `toBeInTheDocument`, `toBeVisible`, `toBeEmpty`, `toContainHTML`, `toHaveAttribute`, `toHaveTagName`, `toContainElement`, `toRenderSuccessfully`, `toBeValidHTML`, `toHaveBeenCalled`, `toHaveBeenCalledWith`, `toHaveBeenCalledTimes`.

### Other Utilities

- `screen` -- global query object; call `screen.setResult(result)` after rendering.
- `within(container)` -- scope queries to a specific container result.
- `cleanup()` -- reset global state between tests.

## Known Limitations

- Queries operate on rendered HTML strings via regex, not a DOM tree. Complex nested queries may not match as expected.
- `userEvent.tab()` requires a global `document.activeElement`.
- Snapshot matcher (`toMatchSnapshot`) is a placeholder and does not integrate with framework snapshot files.
