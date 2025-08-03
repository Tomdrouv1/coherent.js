# Coherent.js Hydration Guide

This guide explains how to use Coherent.js's client-side hydration utilities to add interactivity to server-rendered components.

## What is Hydration?

Hydration is the process of attaching client-side interactivity to server-rendered HTML. When a component is hydrated, event listeners are attached, state is initialized, and the component becomes fully interactive.

## Hydration Utilities

Coherent.js provides several utilities for hydrating components:

### `hydrate(element, component, props, options)`

Hydrates a single DOM element with a Coherent component.

```javascript
import { hydrate } from 'coherent/client/hydration';

const element = document.getElementById('my-component');
const instance = hydrate(element, MyComponent, { initialProp: 'value' });
```

### `hydrateAll(elements, components, propsArray)`

Hydrates multiple elements with their corresponding components.

```javascript
import { hydrateAll } from 'coherent/client/hydration';

const elements = [document.getElementById('counter'), document.getElementById('todo-list')];
const components = [Counter, TodoList];
const propsArray = [{ count: 0 }, { todos: [] }];

const instances = hydrateAll(elements, components, propsArray);
```

### `hydrateBySelector(selector, component, props)`

Finds elements by CSS selector and hydrates them with a component.

```javascript
import { hydrateBySelector } from 'coherent/client/hydration';

const instances = hydrateBySelector('.counter', Counter, { count: 0 });
```

### `makeHydratable(component)`

Marks a component as hydratable and adds metadata for server-side rendering.

```javascript
import { makeHydratable } from 'coherent/client/hydration';

const HydratableCounter = makeHydratable(Counter);
```

## Creating Hydratable Components

To make a component hydratable, wrap it with the `makeHydratable` function:

```javascript
import { makeHydratable } from 'coherent/client/hydration';

function Counter(props) {
  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'Counter',
      children: [
        {
          span: {
            text: `Count: ${props.count}`
          }
        },
        {
          button: {
            'data-action': 'increment',
            text: '+'
          }
        }
      ]
    }
  };
}

const HydratableCounter = makeHydratable(Counter);
```

## Server-Side Rendering

When rendering on the server, use `renderToString` with hydratable components:

```javascript
import { renderToString } from 'coherent/rendering/html-renderer';
import { makeHydratable } from 'coherent/client/hydration';

function Counter(props) {
  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'Counter',
      children: [
        {
          span: {
            text: `Count: ${props.count}`
          }
        },
        {
          button: {
            'data-action': 'increment',
            text: '+'
          }
        }
      ]
    }
  };
}

const HydratableCounter = makeHydratable(Counter);
const html = renderToString(HydratableCounter, { count: 5 });
```

## Client-Side Hydration

On the client side, hydrate the server-rendered HTML:

```javascript
import { hydrate } from 'coherent/client/hydration';

// Find the server-rendered element
const element = document.getElementById('counter');

// Hydrate with the component
const instance = hydrate(element, HydratableCounter, { count: 5 });
```

## Event Handling

Coherent.js uses data attributes to handle events during hydration:

```javascript
function Counter(props) {
  return {
    div: {
      className: 'counter',
      children: [
        {
          button: {
            'data-action': 'increment',
            text: 'Increment'
          }
        },
        {
          button: {
            'data-action': 'decrement',
            text: 'Decrement'
          }
        }
      ]
    }
  };
}
```

During hydration, event listeners are automatically attached to elements with `data-action` attributes.

## Component Instance API

When a component is hydrated, it returns an instance object with the following methods:

### `update(newProps)`

Updates the component with new props and re-renders it.

```javascript
instance.update({ count: 10 });
```

### `setState(newState)`

Updates the component's state (for components with state management).

```javascript
instance.setState({ count: 15 });
```

### `destroy()`

Destroys the component and cleans up event listeners.

```javascript
instance.destroy();
```

## Complete Example

Here's a complete example showing server-side rendering and client-side hydration:

### Server-side (Node.js)

```javascript
import { renderToString } from 'coherent/rendering/html-renderer';
import { makeHydratable } from 'coherent/client/hydration';

function Counter(props) {
  return {
    div: {
      className: 'counter',
      'data-coherent-component': 'Counter',
      children: [
        {
          h3: {
            text: 'Counter'
          }
        },
        {
          span: {
            text: `Count: ${props.count}`
          }
        },
        {
          button: {
            'data-action': 'increment',
            text: 'Increment'
          }
        },
        {
          button: {
            'data-action': 'decrement',
            text: 'Decrement'
          }
        }
      ]
    }
  };
}

const HydratableCounter = makeHydratable(Counter);

// Render to HTML
const html = renderToString(HydratableCounter, { count: 0 });

// Send HTML to client
res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Hydration Example</title>
</head>
<body>
  <div id="counter">${html}</div>
  <script type="module">
    import { hydrate } from './coherent/client/hydration.js';
    
    const element = document.getElementById('counter');
    hydrate(element, ${HydratableCounter.name}, { count: 0 });
  </script>
</body>
</html>
`);
```

### Client-side (Browser)

```javascript
import { hydrate } from 'coherent/client/hydration';

// Find the server-rendered element
const element = document.getElementById('counter');

// Hydrate the component
const instance = hydrate(element, HydratableCounter, { count: 0 });

// The component is now interactive!
```

## Best Practices

1. **Always use `makeHydratable`** for components that will be hydrated
2. **Add `data-coherent-component`** attributes to mark components for hydration
3. **Use `data-action`** attributes for event handling
4. **Clean up** by calling `destroy()` when components are no longer needed
5. **Handle errors** gracefully in component methods

## Browser Support

Hydration requires a modern browser with support for ES modules. For older browsers, you may need to transpile the code or provide polyfills.

## Troubleshooting

### "Hydration can only be performed in a browser environment"

This error occurs when trying to hydrate components in a Node.js environment. Make sure hydration code only runs in the browser.

### Event handlers not working

Ensure elements have the correct `data-action` attributes and that the hydration process completed successfully.

### State not updating

Check that the component was properly hydrated and that `setState` is being called with the correct parameters.
