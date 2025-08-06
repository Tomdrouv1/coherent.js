# Function-on-Element Event Handlers in Coherent.js

Coherent.js now supports a powerful pattern for handling events directly on elements using function-valued props. This approach allows you to define event handlers inline in your component definitions, similar to how you would in traditional HTML with inline JavaScript.

## How It Works

When you define a function as a prop value for event attributes (like `onclick`, `oninput`, etc.), Coherent.js automatically:

1. **Server-side (Node.js)**: Stores the function in a global registry that will be available during hydration
2. **Client-side (Browser)**: Serializes the event handler as an inline JavaScript call to a global handler
3. **During Hydration**: The global handler looks up the original function and executes it with proper component context

## Usage Example

```javascript
const CounterComponent = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    class: 'counter-widget',
    'data-coherent-component': 'counter',
    children: [
      {
        button: {
          text: `Count: ${state.count}`,
          class: 'btn btn-primary',
          // Define event handler inline as a function
          onclick: (event, state, setState) => {
            setState({ count: state.count + 1 });
          }
        }
      },
      {
        input: {
          type: 'text',
          value: state.text || '',
          // Handle input events
          oninput: (event, state, setState) => {
            setState({ text: event.target.value });
          }
        }
      }
    ]
  }
}));
```

## Function Parameters

Event handler functions receive three parameters:

1. `event` - The DOM event object
2. `state` - The current component state
3. `setState` - Function to update the component state

## Benefits

- **Familiar Syntax**: Works like traditional inline event handlers
- **Component Context**: Handlers automatically have access to component state and setState
- **Automatic Hydration**: No manual event binding required
- **Type Safety**: Full TypeScript support

## How It Differs from data-action

While Coherent.js still supports the `data-action`/`data-target` pattern, the function-on-element approach provides:

- More direct and intuitive event handling
- Automatic context binding
- Cleaner component definitions
- No need to define separate action handlers

## Browser Support

This feature works in all modern browsers that support ES6 JavaScript. The global event handler is automatically defined when the hydration module is loaded.

## Error Handling

If an error occurs in an event handler, it will be caught and logged to the console with a warning message, preventing the entire application from crashing.

## Performance Considerations

- Functions are stored in a global registry during SSR
- Minimal overhead during hydration
- Efficient event delegation through the global handler

## Limitations

- Event handlers must be serializable functions (no closures over external variables)
- The pattern is designed for simple event handling; complex logic should still use separate functions
