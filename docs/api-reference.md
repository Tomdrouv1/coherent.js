# Coherent.js API Reference

This document provides a comprehensive reference for all public APIs available in Coherent.js.

> **Pure Object Philosophy**: Coherent.js emphasizes **factory functions** over class instantiation. Throughout this API reference, we recommend using factory functions for a pure JavaScript object approach.

## Core Rendering

### `renderToString(component, context?)`

Renders a Coherent.js component to an HTML string.

**Parameters:**
- `component` (CoherentNode): The component to render
- `context` (Object, optional): Context data to pass to the component

**Returns:** String - The rendered HTML

**Example:**
```javascript
import { renderToString } from 'coherent-js';

const component = {
  div: {
    className: 'greeting',
    children: [
      { h1: { text: 'Hello, World!' } }
    ]
  }
};

const html = renderToString(component);
// Output: <div class="greeting"><h1>Hello, World!</h1></div>
```

### `renderToStream(component, context?)`

Renders a Coherent.js component to a Node.js Readable stream.

**Parameters:**
- `component` (CoherentNode): The component to render
- `context` (Object, optional): Context data to pass to the component

**Returns:** ReadableStream - A stream that emits HTML chunks

**Example:**
```javascript
import { renderToStream } from 'coherent-js';

const stream = renderToStream(largeComponent, context);

stream.on('data', (chunk) => {
  response.write(chunk);
});

stream.on('end', () => {
  response.end();
});
```

## Component Utilities

### `createComponent(renderFunction)`

Creates a component from a render function.

**Parameters:**
- `renderFunction` (Function): A function that returns a CoherentNode

**Returns:** Function - A component function

**Example:**
```javascript
import { createComponent } from 'coherent-js';

const Greeting = createComponent(({ name }) => ({
  div: {
    children: [
      { h1: { text: `Hello, ${name}!` } }
    ]
  }
}));
```

### `withState(initialState)`

Adds state management to a component.

**Parameters:**
- `initialState` (Object): The initial state object

**Returns:** Function - A higher-order component function

**Example:**
```javascript
import { withState } from 'coherent-js';

const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    children: [
      { p: { text: `Count: ${state.count}` } },
      { 
        button: { 
          text: 'Increment', 
          onclick: () => setState({ count: state.count + 1 })
        }
      }
    ]
  }
}));
```

### `memo(component, keyFunction?)`

Memoizes a component to prevent unnecessary re-renders.

**Parameters:**
- `component` (Function): The component to memoize
- `keyFunction` (Function, optional): A function that returns a cache key based on props

**Returns:** Function - A memoized component function

**Example:**
```javascript
import { memo } from 'coherent-js';

const ExpensiveComponent = memo(
  (context) => {
    // Expensive computation here
    return { div: { text: computeResult(context.data) } };
  },
  (context) => context.data.id // Custom key function
);
```

### `compose(...components)`

Composes multiple components into a single component.

**Parameters:**
- `...components` (Function[]): Components to compose

**Returns:** Function - A composed component function

**Example:**
```javascript
import { compose } from 'coherent-js';

const Header = () => ({ header: { /* ... */ } });
const Main = () => ({ main: { /* ... */ } });
const Footer = () => ({ footer: { /* ... */ } });

const Layout = compose(Header, Main, Footer);
```

## Conditional Rendering

### `when(condition, trueComponent, falseComponent?)`

Renders one of two components based on a condition.

**Parameters:**
- `condition` (any): The condition to evaluate
- `trueComponent` (CoherentNode): Component to render if condition is truthy
- `falseComponent` (CoherentNode, optional): Component to render if condition is falsy

**Returns:** CoherentNode - The appropriate component

**Example:**
```javascript
import { when } from 'coherent-js';

const UserProfile = (context) => ({
  div: {
    children: [
      when(context.user,
        { p: { text: `Welcome, ${context.user.name}!` } },
        { p: { text: 'Please log in' } }
      )
    ]
  }
});
```

### `forEach(array, renderFunction)`

Renders an array of items using a render function.

**Parameters:**
- `array` (Array): The array of items to render
- `renderFunction` (Function): A function that returns a CoherentNode for each item

**Returns:** Array - An array of rendered components

**Example:**
```javascript
import { forEach } from 'coherent-js';

const TodoList = (context) => ({
  ul: {
    children: forEach(context.todos, (todo) => ({
      li: { 
        text: todo.text,
        className: todo.completed ? 'completed' : 'pending'
      }
    }))
  }
});
```

## Performance Monitoring

### `performanceMonitor.start()`

Starts performance monitoring.

**Returns:** String - A unique render ID

### `performanceMonitor.end(renderId)`

Ends performance monitoring for a specific render.

**Parameters:**
- `renderId` (String): The render ID returned by `start()`

### `performanceMonitor.getStats()`

Gets current performance statistics.

**Returns:** Object - Performance metrics

### `performanceMonitor.reset()`

Resets performance statistics.

### `performanceMonitor.getRecommendations()`

Gets performance optimization recommendations.

**Returns:** Array - Array of recommendation objects

## Database Layer

### Factory Functions (Recommended)

#### `createDatabaseManager(config)`

**✅ Recommended**: Creates a database manager instance using factory function.

**Parameters:**
- `config` (Object): Database configuration

**Returns:** DatabaseManager - A database manager instance

**Example:**
```javascript
import { createDatabaseManager } from 'coherent-js';

// Recommended approach
const db = createDatabaseManager({
  type: 'sqlite',
  database: ':memory:'
});
```

#### `createQuery(config)`

**✅ Recommended**: Creates a query builder instance using factory function.

**Parameters:**
- `config` (Object): Query configuration

**Returns:** QueryBuilder - A query builder instance

**Example:**
```javascript
import { createQuery } from 'coherent-js';

// Pure object approach
const query = createQuery({
  table: 'users',
  select: ['id', 'name'],
  where: { active: true }
});
```

#### `executeQuery(query, database?)`

**✅ Recommended**: Executes a query created with factory functions.

**Parameters:**
- `query` (Object): Query object from createQuery
- `database` (DatabaseManager, optional): Database instance

**Returns:** Promise - Query results

**Example:**
```javascript
import { createQuery, executeQuery, createDatabaseManager } from 'coherent-js';

const db = createDatabaseManager({ type: 'sqlite', database: ':memory:' });
const query = createQuery({ table: 'users', select: ['*'] });
const results = await executeQuery(query, db);
```

### Direct Class Access (Advanced Usage)

> **Note**: While direct class access is available for advanced use cases, we recommend using factory functions for consistency with the pure object philosophy.

#### `new DatabaseManager(config)`

**Alternative**: Direct class instantiation for advanced usage.

#### `new QueryBuilder(options)`

**Alternative**: Direct class instantiation for advanced usage.

## Client-side Hydration

### `client.hydrate(element, component, props?, options?)`

Hydrates a DOM element with a Coherent component.

**Parameters:**
- `element` (HTMLElement): The DOM element to hydrate
- `component` (Function): The Coherent component function
- `props` (Object, optional): Component props
- `options` (Object, optional): Hydration options

**Returns:** Object - Hydrated component instance

### `client.hydrateAll(elements, components, propsArray?)`

Hydrates multiple elements with their corresponding components.

**Parameters:**
- `elements` (Array): Array of DOM elements to hydrate
- `components` (Array): Array of Coherent component functions
- `propsArray` (Array, optional): Array of component props

**Returns:** Array - Array of hydrated component instances

### `client.hydrateBySelector(selector, component, props?)`

Finds and hydrates elements by CSS selector.

**Parameters:**
- `selector` (String): CSS selector to find elements
- `component` (Function): The Coherent component function
- `props` (Object, optional): Component props

**Returns:** Array - Array of hydrated component instances

### `client.enableClientEvents(rootElement?)`

Enables client-side interactivity for event handlers.

**Parameters:**
- `rootElement` (HTMLElement, optional): Root element to enable events on

### `client.makeHydratable(component)`

Creates a hydratable component.

**Parameters:**
- `component` (Function): The component function to make hydratable

**Returns:** Function - A hydratable component function

## Framework Integrations

### Express.js Integration

#### `express.coherentMiddleware(options?)`

Express middleware for Coherent.js.

**Parameters:**
- `options` (Object, optional): Configuration options

#### `express.createCoherentHandler(componentFactory, options?)`

Creates an Express route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `express.setupCoherentExpress(app, options?)`

Sets up Coherent.js with Express app.

**Parameters:**
- `app` (Express.Application): Express application instance
- `options` (Object, optional): Configuration options

### Fastify Integration

#### `fastify.coherentFastify(fastify, options, done)`

Fastify plugin for Coherent.js.

**Parameters:**
- `fastify` (FastifyInstance): Fastify instance
- `options` (Object): Plugin options
- `done` (Function): Callback to signal plugin registration completion

#### `fastify.createCoherentFastifyHandler(componentFactory, options?)`

Creates a Fastify route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `fastify.setupCoherentFastify(fastify, options?)`

Sets up Coherent.js with Fastify instance.

**Parameters:**
- `fastify` (FastifyInstance): Fastify instance
- `options` (Object, optional): Configuration options

### Next.js Integration

#### `nextjs.createCoherentNextHandler(componentFactory, options?)`

Creates a Next.js API route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `nextjs.createCoherentAppRouterHandler(componentFactory, options?)`

Creates a Next.js App Router route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `nextjs.createCoherentServerComponent(componentFactory, options?)`

Creates a Next.js Server Component for Coherent.js.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Component options

#### `nextjs.createCoherentClientComponent(componentFactory, options?)`

Creates a Next.js Client Component for Coherent.js with hydration support.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Component options

## Utilities

### `escapeHtml(text)`

Escapes HTML entities in a string.

**Parameters:**
- `text` (String): The text to escape

**Returns:** String - The escaped text

### `validateComponent(component)`

Validates a Coherent.js component.

**Parameters:**
- `component` (any): The component to validate

**Returns:** Boolean - Whether the component is valid

### `extractProps(element)`

Extracts props from a Coherent.js element.

**Parameters:**
- `element` (Object): The element to extract props from

**Returns:** Object - The extracted props

## Types

### `CoherentNode`

Represents a Coherent.js node, which can be:
- A CoherentElement object
- A string
- A number
- A boolean
- null
- undefined

### `CoherentElement`

Represents a Coherent.js element with the structure:
```typescript
{
  [tagName: string]: {
    text?: string;
    html?: string;
    children?: CoherentNode[];
    className?: string | (() => string);
    [key: string]: any;
  }
}
```

### `ComponentFunction`

Represents a Coherent.js component function:
```typescript
(props?: Record<string, any>) => CoherentNode;
```

### `HydratedComponentInstance`

Represents a hydrated component instance:
```typescript
{
  element: HTMLElement;
  component: ComponentFunction;
  props: Record<string, any>;
  isHydrated: boolean;
  update(newProps: Record<string, any>): void;
  destroy(): void;
}
```
