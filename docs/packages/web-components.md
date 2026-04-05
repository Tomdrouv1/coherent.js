# Web Components (Experimental)

> **Status: Alpha** -- This package is experimental. APIs may change between releases.

`@coherent.js/web-components` provides a thin bridge between Coherent.js components and the Web Components / Custom Elements API. It lets you register any Coherent.js component as a native custom element with optional Shadow DOM support.

## Installation

```bash
pnpm add @coherent.js/web-components
```

## Basic Usage

```javascript
import { defineComponent } from '@coherent.js/web-components';

const Greeting = {
  div: {
    className: 'greeting',
    children: [{ h1: { text: 'Hello from Coherent.js!' } }]
  }
};

// Register as <my-greeting> custom element
defineComponent('my-greeting', Greeting);

// With Shadow DOM isolation
defineComponent('my-card', CardComponent, { shadow: true });
```

After registration, use the element in HTML:

```html
<my-greeting></my-greeting>
```

## API Reference

### defineComponent(name, component, options?)

Register a Coherent.js component as a custom element.

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Custom element tag name (must contain a hyphen) |
| `component` | `object` | Coherent.js component object |
| `options.shadow` | `boolean` | Use Shadow DOM (default `false`) |

Returns the `HTMLElement` subclass on the client, or a placeholder object on the server.

### defineCoherentElement(name, component, options?)

Alias for `defineComponent`.

### integrateWithWebComponents(runtime)

Returns an object with a `defineComponent` method bound to the provided runtime.

## Known Limitations

- Server-side calls return a stub; custom elements only register in browser environments.
- Components are rendered once on `connectedCallback`; there is no reactive re-rendering.
- No support for observed attributes or property reflection.
- Requires browser support for the Custom Elements v1 API.
