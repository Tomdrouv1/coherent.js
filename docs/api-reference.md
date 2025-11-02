# Coherent.js API Reference

This document provides a comprehensive reference for all public APIs available in Coherent.js.

> **Pure Object Philosophy**: Coherent.js emphasizes **factory functions** over class instantiation. Throughout this API reference, we recommend using factory functions for a pure JavaScript object approach.

## Core Rendering

### `render(component, context?)`

Renders a Coherent.js component to an HTML string.

**Parameters:**
- `component` (CoherentNode): The component to render
- `context` (Object, optional): Context data to pass to the component

**Returns:** String - The rendered HTML

**Example:**
```javascript
import { render } from '@coherentjs/core';

const component = {
  div: {
    className: 'greeting',
    children: [
      { h1: { text: 'Hello, World!' } }
    ]
  }
};

const html = render(component);
// Output: <div class="greeting"><h1>Hello, World!</h1></div>
```

### `render(component, options?)`

Renders a Coherent.js component to a complete HTML document with DOCTYPE and CSS support.

**Parameters:**
- `component` (CoherentNode): The component to render
- `options` (Object, optional): Rendering options including CSS configuration

**Options:**
- `cssFiles` (Array<string>): CSS files to load and inject
- `cssLinks` (Array<string>): External CSS URLs to link
- `cssInline` (string): Inline CSS to inject
- `cssMinify` (boolean): Whether to minify CSS
- `minify` (boolean): Whether to minify HTML
- `enableCache` (boolean): Whether to enable caching

**Returns:** Promise<string> - The complete HTML document with DOCTYPE

**Example:**
```javascript
import { render } from 'coherent';

const App = () => ({
  html: {
    children: [
      {
        head: {
          children: [
            { title: { text: 'My App' } },
            { meta: { charset: 'utf-8' } }
          ]
        }
      },
      {
        body: {
          className: 'app',
          children: [
            { h1: { text: 'Welcome!' } }
          ]
        }
      }
    ]
  }
});

const html = await render(App(), {
  cssFiles: ['./styles/main.css', './styles/components.css'],
  cssLinks: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap'],
  cssInline: '.custom { color: red; }',
  minify: true
});
```

### `renderSync(component, options?)`

Synchronous version of `render` for cases without CSS files.

**Parameters:**
- `component` (CoherentNode): The component to render
- `options` (Object, optional): Rendering options (CSS files will trigger warning)

**Returns:** string | Promise<string> - HTML document (promise if CSS files detected)

**Example:**
```javascript
import { renderSync } from 'coherent';

const html = renderSync(App(), {
  cssInline: '.app { margin: 0; padding: 20px; }'
});
```

### `render(component, options?)`

Alias for `render()` - provides semantic naming for complete HTML rendering.

**Example:**
```javascript
import { render } from 'coherent';

const html = await render(App(), {
  cssFiles: ['./styles/main.css']
});
```

### `renderToStream(component, context?)`

Renders a Coherent.js component to a Node.js Readable stream.

**Parameters:**
- `component` (CoherentNode): The component to render
- `context` (Object, optional): Context data to pass to the component

**Returns:** ReadableStream - A stream that emits HTML chunks

**Example:**
```javascript
import { renderToStream } from '@coherentjs/core';

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
import { createComponent } from '@coherentjs/core';

const Greeting = createComponent(({ name }) => ({
  div: {
    children: [
      { h1: { text: `Hello, ${name}!` } }
    ]
  }
}));
```

### `withState(initialState, options?)`

Adds reactive state management to a component with automatic re-rendering on state changes.

**Parameters:**
- `initialState` (Object): The initial state object
- `options` (Object, optional): State management options
  - `debug` (Boolean): Enable debug logging for state changes
  - `middleware` (Array): Array of middleware functions to apply to state changes
  - `validator` (Function): Function to validate state changes

**Returns:** Function - A higher-order component function that wraps the component with state

**Example:**
```javascript
import { withState } from '@coherentjs/core';

// Basic state management
const Counter = withState({ count: 0 })((props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;
  
  return {
    div: {
      'data-coherent-component': 'counter',
      children: [
        { p: { text: `Count: ${state.count}` } },
        { 
          button: { 
            text: 'Increment', 
            onclick: () => setState({ count: state.count + 1 })
          }
        },
        { 
          button: { 
            text: 'Reset', 
            onclick: () => setState({ count: 0 })
          }
        }
      ]
    }
  };
});

// With options and debugging
const TodoApp = withState({
  todos: [],
  filter: 'all',
  newTodo: ''
}, {
  debug: true, // Logs all state changes
  validator: (newState) => {
    if (newState.todos && !Array.isArray(newState.todos)) {
      throw new Error('todos must be an array');
    }
    return true;
  }
})((props) => {
  const { state, stateUtils } = props;
  const { setState } = stateUtils;
  
  const addTodo = () => {
    if (state.newTodo.trim()) {
      setState({
        todos: [...state.todos, {
          id: Date.now(),
          text: state.newTodo.trim(),
          completed: false
        }],
        newTodo: ''
      });
    }
  };
  
  return {
    div: {
      'data-coherent-component': 'todo-app',
      children: [
        {
          input: {
            type: 'text',
            value: state.newTodo,
            placeholder: 'Add new todo...',
            oninput: (e) => setState({ newTodo: e.target.value })
          }
        },
        {
          button: {
            text: 'Add Todo',
            onclick: addTodo
          }
        },
        {
          ul: {
            children: state.todos.map(todo => ({
              li: { 
                text: todo.text,
                className: todo.completed ? 'completed' : ''
              }
            }))
          }
        }
      ]
    }
  };
});
```

**State Management API:**

The component receives the following props:
- `state` (Object): Current state object
- `stateUtils` (Object): State management utilities
  - `setState(newState)`: Update state (triggers re-render)
  - `getState()`: Get current state
  - `resetState()`: Reset to initial state
  - `subscribe(callback)`: Subscribe to state changes

### `memo(component, keyFunction?)`

Memoizes a component to prevent unnecessary re-renders.

**Parameters:**
- `component` (Function): The component to memoize
- `keyFunction` (Function, optional): A function that returns a cache key based on props

**Returns:** Function - A memoized component function

**Example:**
```javascript
import { memo } from '@coherentjs/core';

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
import { compose } from '@coherentjs/core';

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
import { when } from '@coherentjs/core';

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
import { forEach } from '@coherentjs/core';

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

## CSS Management

### `createCSSManager(options?)`

Creates a CSS manager instance for loading and processing CSS files.

**Parameters:**
- `options` (Object, optional): CSS manager configuration
  - `baseDir` (string): Base directory for resolving relative CSS paths
  - `enableCache` (boolean): Whether to cache loaded CSS files
  - `minify` (boolean): Whether to minify CSS by default

**Returns:** CSSManager instance

**Example:**
```javascript
import { createCSSManager } from 'coherent';

const cssManager = createCSSManager({
  baseDir: './src/styles',
  enableCache: true,
  minify: process.env.NODE_ENV === 'production'
});

const css = await cssManager.loadCSSFile('components/button.css');
```

### `defaultCSSManager`

The default CSS manager instance used by render functions.

**Example:**
```javascript
import { defaultCSSManager } from 'coherent';

// Load CSS file using default manager
const css = await defaultCSSManager.loadCSSFile('./styles/main.css');

// Generate CSS links
const links = defaultCSSManager.generateCSSLinks([
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css'
]);
```

### `cssUtils`

Utilities for processing CSS options and generating CSS HTML.

**Methods:**
- `processCSSOptions(options)`: Process render options to extract CSS configuration
- `generateCSSHtml(cssOptions, cssManager)`: Generate HTML for CSS injection

**Example:**
```javascript
import { cssUtils, defaultCSSManager } from 'coherent';

const options = {
  cssFiles: ['./main.css'],
  cssInline: '.custom { color: red; }'
};

const cssOptions = cssUtils.processCSSOptions(options);
const cssHtml = await cssUtils.generateCSSHtml(cssOptions, defaultCSSManager);
```

### CSS Manager Methods

#### `loadCSSFile(filePath)`

Load and return CSS content from a file.

**Parameters:**
- `filePath` (string): Path to the CSS file

**Returns:** Promise<string> - The CSS content

#### `generateCSSLinks(filePaths, baseUrl?)`

Generate HTML link tags for CSS files.

**Parameters:**
- `filePaths` (Array<string>): CSS file paths or URLs
- `baseUrl` (string, optional): Base URL for relative paths

**Returns:** string - HTML link tags

#### `generateInlineStyles(css)`

Generate HTML style tag for inline CSS.

**Parameters:**
- `css` (string): CSS content to inline

**Returns:** string - HTML style tag

#### `minifyCSS(css)`

Minify CSS content by removing whitespace and comments.

**Parameters:**
- `css` (string): CSS content to minify

**Returns:** string - Minified CSS

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
import { createDatabaseManager } from '@coherentjs/core';

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
import { createQuery } from '@coherentjs/core';

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
import { createQuery, executeQuery, createDatabaseManager } from '@coherentjs/core';

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

### `hydrate(element, component, props?, options?)`

Hydrates a DOM element with a Coherent component to enable client-side interactivity.

**Parameters:**
- `element` (HTMLElement): The DOM element to hydrate
- `component` (Function): The Coherent component function
- `props` (Object, optional): Component props
- `options` (Object, optional): Hydration options
  - `initialState` (Object): Initial state for stateful components
  - `enableCache` (Boolean): Enable component caching (default: true)
  - `validateInput` (Boolean): Enable input validation (default: false)

**Returns:** HydratedComponentInstance - Hydrated component instance with methods

**Example:**
```javascript
import { hydrate } from '@coherentjs/client';
import { Counter } from './components/Counter.js';

// Basic hydration
const element = document.getElementById('counter');
const instance = hydrate(element, Counter, { initialCount: 5 });

// With state initialization
const instance = hydrate(element, Counter, {}, {
  initialState: { count: 10, step: 2 }
});
```

### `hydrateAll(elements, components, propsArray?)`

Hydrates multiple elements with their corresponding components.

**Parameters:**
- `elements` (Array): Array of DOM elements to hydrate
- `components` (Array): Array of Coherent component functions
- `propsArray` (Array, optional): Array of component props

**Returns:** Array - Array of hydrated component instances

**Example:**
```javascript
import { hydrateAll } from '@coherentjs/client';
import { Header, Footer } from './components/Layout.js';

const elements = [
  document.getElementById('header'),
  document.getElementById('footer')
];
const components = [Header, Footer];
const instances = hydrateAll(elements, components);
```

### `hydrateBySelector(selector, component, props?)`

Finds and hydrates all elements matching a CSS selector.

**Parameters:**
- `selector` (String): CSS selector to find elements
- `component` (Function): The Coherent component function
- `props` (Object, optional): Component props

**Returns:** Array - Array of hydrated component instances

**Example:**
```javascript
import { hydrateBySelector } from '@coherentjs/client';
import { TodoItem } from './components/TodoItem.js';

// Hydrate all todo items
const instances = hydrateBySelector('[data-coherent-component="todoitem"]', TodoItem);
```

### `makeHydratable(component, options?)`

Creates a hydratable version of a component with metadata for auto-hydration.

**Parameters:**
- `component` (Function): The component function to make hydratable
- `options` (Object, optional): Hydration metadata
  - `componentName` (String): Name for component registry
  - `initialState` (Object): Default initial state

**Returns:** Function - A hydratable component function with additional metadata

**Example:**
```javascript
import { makeHydratable } from '@coherentjs/client';
import { Counter } from './components/Counter.js';

const HydratableCounter = makeHydratable(Counter, {
  componentName: 'counter',
  initialState: { count: 0 }
});

// Can be used in auto-hydration
export { HydratableCounter };
```

### `autoHydrate(componentRegistry)`

Automatically hydrates all components on a page based on data-coherent-component attributes.

**Parameters:**
- `componentRegistry` (Object): Registry mapping component names to hydratable components

**Example:**
```javascript
import { autoHydrate, makeHydratable } from '@coherentjs/client';
import { Counter } from './components/Counter.js';
import { TodoList } from './components/TodoList.js';

const componentRegistry = {
  counter: makeHydratable(Counter),
  todolist: makeHydratable(TodoList)
};

// Auto-hydrate when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  autoHydrate(componentRegistry);
});
```

### `enableClientEvents(rootElement?)`

Enables client-side interactivity for elements with data-action attributes.

**Parameters:**
- `rootElement` (HTMLElement, optional): Root element to enable events on (default: document)

**Example:**
```javascript
import { enableClientEvents } from '@coherentjs/client';

// Enable events for entire document
enableClientEvents();

// Enable events for specific container
const container = document.getElementById('interactive-section');
enableClientEvents(container);
```

### `extractInitialState(element, options?)`

Extracts initial state from DOM element data attributes.

**Parameters:**
- `element` (HTMLElement): The DOM element
- `options` (Object, optional): Extraction options

**Returns:** Object|null - The extracted state or null

**Example:**
```javascript
import { extractInitialState } from '@coherentjs/client';

const element = document.getElementById('counter');
// <div id="counter" data-coherent-state='{"count": 5}'>
const state = extractInitialState(element);
// Returns: { count: 5 }
```

### `registerEventHandler(id, handler)`

Registers a global event handler for use with data-action attributes.

**Parameters:**
- `id` (String): Unique identifier for the event handler
- `handler` (Function): The event handler function

**Example:**
```javascript
import { registerEventHandler } from '@coherentjs/client';

registerEventHandler('my-click-handler', (event, state, setState) => {
  console.log('Button clicked!', { event, state });
});
```

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

#### `express.setupCoherent(app, options?)`

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

#### `fastify.createHandler(componentFactory, options?)`

Creates a Fastify route handler for Coherent.js components.

**Parameters:**
- `componentFactory` (Function): Function that returns a Coherent component
- `options` (Object, optional): Handler options

#### `fastify.setupCoherent(fastify, options?)`

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
