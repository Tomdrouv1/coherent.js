# @coherent.js/web-components

Web Components integration for Coherent.js, enabling custom elements and Shadow DOM support.

## Installation

```bash
npm install @coherent.js/web-components
```

## Usage

### Define Custom Elements

```js
import { defineComponent } from '@coherent.js/web-components';

const ButtonComponent = {
  button: {
    className: 'custom-button',
    text: 'Click me',
    onclick: 'console.log("Clicked!")'
  }
};

defineComponent('coherent-button', ButtonComponent);
```

### Shadow DOM Components

```js
import { defineComponent } from '@coherent.js/web-components';

defineComponent('coherent-card', {
  div: {
    className: 'card',
    children: [
      { h2: { text: 'Card Title' } },
      { p: { text: 'Card content goes here' } }
    ]
  }
}, { 
  shadowDOM: true,
  styles: '.card { padding: 1rem; border: 1px solid #ddd; }'
});
```

## Features

- Custom element registration
- Shadow DOM encapsulation
- Style isolation
- Coherent.js component integration