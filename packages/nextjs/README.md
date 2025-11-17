# @coherent.js/nextjs

Next.js integration for Coherent.js - Bring Coherent.js components to your Next.js applications.

## Installation

```bash
npm install @coherent.js/nextjs
# or
pnpm add @coherent.js/nextjs
# or
yarn add @coherent.js/nextjs
```

**Note:** You also need to have Next.js and Coherent.js core installed:

```bash
npm install next @coherent.js/core
# or
pnpm add next @coherent.js/core
```

## Overview

The `@coherent.js/nextjs` package provides seamless integration between Coherent.js and Next.js, allowing you to use Coherent.js components alongside React components in your Next.js applications. This integration enables:

- Server-side rendering with Coherent.js
- Client-side hydration
- Seamless integration with Next.js routing
- Performance benefits of both frameworks

## Quick Start

### 1. Create a Coherent.js Component

```javascript
// components/HelloWorld.js
export function HelloWorld({ name = 'World' }) {
  return {
    div: {
      className: 'hello-world',
      children: [
        { h1: { text: `Hello, ${name}!` } },
        { p: { text: 'This component is rendered with Coherent.js' } }
      ]
    }
  };
}
```

### 2. Use in a Next.js Page

```javascript
// pages/index.js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import { HelloWorld } from '../components/HelloWorld';

export default function Home() {
  // Render Coherent.js component to React element
  const coherentElement = renderCoherentComponent(HelloWorld, {
    name: 'Next.js User'
  });
  
  return (
    <div>
      <h1>Welcome to Next.js</h1>
      {coherentElement}
    </div>
  );
}
```

## Features

### Server-Side Rendering

Automatic server-side rendering of Coherent.js components:

```javascript
// pages/profile.js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import { UserProfile } from '../components/UserProfile';

export async function getServerSideProps(context) {
  // Fetch user data on server
  const user = await fetchUser(context.params.id);
  
  return {
    props: {
      user
    }
  };
}

export default function Profile({ user }) {
  const userProfile = renderCoherentComponent(UserProfile, {
    user,
    editable: false // No editing on server-rendered page
  });
  
  return (
    <div>
      <h1>User Profile</h1>
      {userProfile}
    </div>
  );
}
```

### Client-Side Hydration

Enable full interactivity with client-side hydration:

```javascript
// components/Counter.js
import { withState } from '@coherent.js/core';

export const Counter = withState({ count: 0 })(({ state, setState }) => {
  const increment = () => setState({ count: state.count + 1 });
  const decrement = () => setState({ count: state.count - 1 });
  
  return {
    div: {
      'data-coherent-component': 'counter', // Required for hydration
      children: [
        { p: { text: `Count: ${state.count}` } },
        { button: { text: '+', onclick: increment } },
        { button: { text: '-', onclick: decrement } }
      ]
    }
  };
});
```

```javascript
// pages/counter.js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import { Counter } from '../components/Counter';

export default function CounterPage() {
  const counter = renderCoherentComponent(Counter, {}, {
    hydrate: true // Enable client-side hydration
  });
  
  return (
    <div>
      <h1>Interactive Counter</h1>
      {counter}
    </div>
  );
}
```

### Integration with Next.js Data Fetching

Seamlessly integrate with Next.js data fetching methods:

```javascript
// pages/products.js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import { ProductList } from '../components/ProductList';

export async function getStaticProps() {
  // Fetch products at build time
  const products = await fetchProducts();
  
  return {
    props: {
      products
    },
    revalidate: 60 // Revalidate every 60 seconds
  };
}

export default function Products({ products }) {
  const productList = renderCoherentComponent(ProductList, {
    products
  });
  
  return (
    <div>
      <h1>Products</h1>
      {productList}
    </div>
  );
}
```

## Configuration

### Custom Hydration Setup

Configure hydration behavior:

```javascript
// pages/_app.js
import { setupHydration } from '@coherent.js/nextjs';
import { Counter } from '../components/Counter';
import { UserProfile } from '../components/UserProfile';

// Register components for hydration
setupHydration({
  counter: Counter,
  userProfile: UserProfile
});

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

### CSS Integration

Handle CSS with Coherent.js components:

```javascript
// components/StyledComponent.js
export function StyledComponent() {
  return {
    div: {
      className: 'styled-component',
      style: {
        backgroundColor: '#f0f0f0',
        padding: '20px',
        borderRadius: '8px'
      },
      children: [
        { h2: { text: 'Styled with Coherent.js' } },
        { p: { text: 'This component has inline styles' } }
      ]
    }
  };
}
```

### Template Customization

Customize the HTML template for Coherent.js components:

```javascript
// pages/custom.js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import { CustomComponent } from '../components/CustomComponent';

export default function CustomPage() {
  const component = renderCoherentComponent(CustomComponent, {
    data: 'example'
  }, {
    template: ({ html, head, body }) => `
      <div class="custom-wrapper">
        <header>Custom Header</header>
        <main>${body}</main>
        <footer>Custom Footer</footer>
      </div>
    `
  });
  
  return <div>{component}</div>;
}
```

## Performance Optimizations

### Code Splitting

Leverage Next.js code splitting with Coherent.js:

```javascript
// components/LazyComponent.js
export function LazyComponent({ message }) {
  return {
    div: {
      className: 'lazy-component',
      children: [
        { h3: { text: 'Lazy Loaded Component' } },
        { p: { text: message } }
      ]
    }
  };
}
```

```javascript
// pages/lazy.js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import dynamic from 'next/dynamic';

// Dynamically import Coherent.js component
const LazyComponent = dynamic(() => 
  import('../components/LazyComponent').then(mod => mod.LazyComponent)
);

export default function LazyPage() {
  return (
    <div>
      <h1>Lazy Loading Example</h1>
      <LazyComponent message="This component was loaded dynamically" />
    </div>
  );
}
```

### Caching Strategies

Implement caching for better performance:

```javascript
// pages/cached.js
import { renderCoherentComponent } from '@coherent.js/nextjs';

export async function getStaticProps() {
  // Cache expensive operations
  const data = await fetchWithCache('expensive-api-call');
  
  return {
    props: { data },
    revalidate: 3600 // Cache for 1 hour
  };
}

export default function CachedPage({ data }) {
  const component = renderCoherentComponent(DataDisplay, { data });
  return <div>{component}</div>;
}
```

## Advanced Usage

### State Management Integration

Integrate with global state management:

```javascript
// components/ShoppingCart.js
import { withState } from '@coherent.js/core';

export const ShoppingCart = withState({
  items: [],
  total: 0
})(({ state, setState }) => {
  const addItem = (item) => {
    const newItems = [...state.items, item];
    const newTotal = newItems.reduce((sum, item) => sum + item.price, 0);
    setState({ items: newItems, total: newTotal });
  };
  
  return {
    div: {
      'data-coherent-component': 'shopping-cart',
      children: [
        { h3: { text: 'Shopping Cart' } },
        { p: { text: `Items: ${state.items.length}` } },
        { p: { text: `Total: $${state.total.toFixed(2)}` } },
        { button: { 
          text: 'Add Item', 
          onclick: () => addItem({ id: Date.now(), name: 'Product', price: 29.99 })
        }}
      ]
    }
  };
});
```

### API Route Integration

Use Coherent.js with Next.js API routes:

```javascript
// pages/api/render-component.js
import { renderToString } from '@coherent.js/core';

export default async function handler(req, res) {
  const { componentName, props } = req.body;
  
  // Dynamically render component
  let html;
  switch (componentName) {
    case 'HelloWorld':
      const { HelloWorld } = await import('../../components/HelloWorld');
      html = await renderToString(HelloWorld, props);
      break;
    default:
      return res.status(400).json({ error: 'Unknown component' });
  }
  
  res.status(200).json({ html });
}
```

## API Reference

### renderCoherentComponent(component, props, options)

Render a Coherent.js component as a React element.

**Parameters:**
- `component` - Coherent.js component function
- `props` - Component props object
- `options.hydrate` - Enable client-side hydration (default: false)
- `options.template` - Custom HTML template function
- `options.context` - Additional context data

**Returns:** React element

### setupHydration(componentMap)

Configure client-side hydration for components.

**Parameters:**
- `componentMap` - Object mapping component names to component functions

### Options

- `hydrate` - Boolean to enable hydration
- `template` - Function to customize HTML template
- `context` - Additional context data for rendering

## Examples

### E-commerce Product Page

```javascript
// components/ProductPage.js
import { withState } from '@coherent.js/core';

export const ProductPage = withState({
  quantity: 1,
  selectedVariant: null
})(({ state, setState, product }) => {
  const updateQuantity = (qty) => setState({ quantity: Math.max(1, qty) });
  const selectVariant = (variant) => setState({ selectedVariant: variant });
  
  const selectedVariant = state.selectedVariant || product.variants[0];
  const totalPrice = selectedVariant.price * state.quantity;
  
  return {
    div: {
      'data-coherent-component': 'product-page',
      className: 'product-page',
      children: [
        { h1: { text: product.name } },
        { img: { src: selectedVariant.image, alt: product.name } },
        { 
          div: { 
            children: product.variants.map(variant => ({
              button: {
                text: variant.name,
                className: variant.id === state.selectedVariant?.id ? 'selected' : '',
                onclick: () => selectVariant(variant)
              }
            }))
          } 
        },
        { 
          div: { 
            children: [
              { label: { text: 'Quantity:' } },
              { input: { 
                type: 'number', 
                value: state.quantity,
                oninput: (e) => updateQuantity(parseInt(e.target.value))
              }},
              { p: { text: `Total: $${totalPrice.toFixed(2)}` } },
              { button: { 
                text: 'Add to Cart',
                onclick: () => addToCart({
                  productId: product.id,
                  variantId: selectedVariant.id,
                  quantity: state.quantity
                })
              }}
            ]
          } 
        }
      ]
    }
  };
});
```

```javascript
// pages/products/[id].js
import { renderCoherentComponent } from '@coherent.js/nextjs';
import { ProductPage } from '../../components/ProductPage';

export async function getServerSideProps({ params }) {
  const product = await fetchProduct(params.id);
  
  return {
    props: {
      product
    }
  };
}

export default function Product({ product }) {
  const productPage = renderCoherentComponent(ProductPage, {
    product
  }, {
    hydrate: true
  });
  
  return (
    <div className="container">
      {productPage}
    </div>
  );
}
```

## Related Packages

- [@coherent.js/core](../core/README.md) - Core framework
- [@coherent.js/client](../client/README.md) - Client-side utilities
- [@coherent.js/express](../express/README.md) - Express.js adapter
- [@coherent.js/fastify](../fastify/README.md) - Fastify adapter
- [@coherent.js/koa](../koa/README.md) - Koa adapter

## License

MIT
