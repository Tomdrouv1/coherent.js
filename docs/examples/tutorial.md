# 🚀 Complete Full-Stack Tutorial - Coherent.js

**Build a server-rendered, interactive app with Coherent.js in about 10 minutes.**

This tutorial builds a small counter app: the server renders the HTML with `@coherent.js/core`, and the browser makes it interactive with `hydrate()` from `@coherent.js/client`.

---

## 🎯 What You'll Build

A counter app that demonstrates:
- ✅ Server-Side Rendering (SSR)
- ✅ Client-Side Hydration
- ✅ Event Handling
- ✅ Client State

**Time to complete:** 10 minutes
**Difficulty:** Beginner
**Prerequisites:** Node.js 22.12+

---

## 📁 Step 1: Project Setup

```bash
mkdir my-coherent-app
cd my-coherent-app
npm init -y
npm pkg set type=module
npm install @coherent.js/core @coherent.js/client
npm install -D esbuild
```

Create these files:

```
my-coherent-app/
├── components/
│   └── Counter.js
├── client.js
├── public/
│   └── hydration.js   (generated)
├── server.js
└── package.json
```

---

## 🎨 Step 2: Create the Counter Component

Create `components/Counter.js`. The same component runs on the server (to produce HTML) and in the browser (to attach the handlers):

```javascript
export function Counter({ count = 0 }) {
  return {
    div: {
      className: 'counter',
      children: [
        { h2: { text: 'Interactive Counter' } },
        { p: { className: 'count-display', text: `Count: ${count}` } },
        {
          div: {
            className: 'button-group',
            children: [
              { button: { className: 'btn', text: '−', onClick: (event) => event.setState({ count: event.state.count - 1 }) } },
              { button: { className: 'btn', text: 'Reset', onClick: (event) => event.setState({ count: 0 }) } },
              { button: { className: 'btn', text: '+', onClick: (event) => event.setState({ count: event.state.count + 1 }) } }
            ]
          }
        }
      ]
    }
  };
}
```

### Key Points:

1. **Props in, object out** - `Counter({ count })` returns a plain object describing the HTML.
2. **Event handlers are functions** - on the server they render nothing; in the browser `hydrate()` attaches them.
3. **One event argument** - a handler receives a wrapped event with `event.state`, `event.setState()`, `event.props`, `event.target` and `event.preventDefault()`.
4. **`event.setState({ count })`** - updates the hydrated component's state and patches the DOM.

---

## 🖥️ Step 3: Create the Client and the Server

Create `client.js`:

```javascript
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

// Hydrate the element the component's root renders
const counterEl = document.querySelector('.counter');
if (counterEl) hydrate(Counter, counterEl, { initialState: { count: 0 } });
```

Bundle it for the browser:

```bash
npx esbuild client.js --bundle --format=esm --outfile=public/hydration.js
```

Create `server.js`:

```javascript
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { render } from '@coherent.js/core';
import { Counter } from './components/Counter.js';

const hydrationBundle = readFileSync(new URL('./public/hydration.js', import.meta.url), 'utf-8');

// The whole page is a component too
const createPage = () => ({
  html: {
    lang: 'en',
    children: [
      {
        head: {
          children: [
            { meta: { charset: 'utf-8' } },
            { title: { text: 'My Coherent.js App' } },
            {
              style: {
                text: `
                  body { font-family: Arial, sans-serif; padding: 40px; }
                  .counter { background: #f0f0f0; padding: 20px; border-radius: 8px; }
                  .count-display { font-size: 2rem; font-weight: bold; margin: 20px 0; }
                  .button-group { display: flex; gap: 10px; }
                  .btn { padding: 10px 20px; border: none; border-radius: 4px;
                         cursor: pointer; background: #007bff; color: white; }
                  .btn:hover { background: #0056b3; }
                `
              }
            }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'My Coherent.js App' } },
            Counter({ count: 0 }),
            { script: { type: 'module', src: '/hydration.js' } }
          ]
        }
      }
    ]
  }
});

const server = createServer((req, res) => {
  if (req.url === '/hydration.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(hydrationBundle);
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>${render(createPage())}`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
```

### Key Points:

1. **`render()`** - Renders the page to an HTML string (synchronously); add the doctype yourself.
2. **`<style>` and `<script>` text** - is not HTML-escaped, so CSS and JavaScript work as written (a closing `</style>` / `</script>` inside is neutralised).
3. **`/hydration.js`** - Serves the client bundle.
4. **`hydrate()`** - Makes the server-rendered HTML interactive.

---

## ▶️ Step 4: Run Your App

```bash
node server.js
```

Open your browser at `http://localhost:3000` and click the buttons. 🎉

---

## 🎓 How It Works

### 1. Server-Side Rendering (SSR)

```
Browser Request → Server
                  ↓
          Counter({ count: 0 })
                  ↓
          render()
                  ↓
          <div class="counter">…<button class="btn">+</button>…</div>
                  ↓
Browser ← HTML (instant display)
```

**Benefits:**
- Fast initial load
- SEO-friendly
- Content visible without JavaScript

### 2. Client-Side Hydration

```
Browser loads /hydration.js
        ↓
hydrate(Counter, element, { initialState })
        ↓
Calls Counter(state) and pairs its output with the existing DOM
        ↓
Attaches onClick through event delegation
        ↓
event.setState() re-renders and patches the DOM ✨
```

**Benefits:**
- The server-rendered HTML is kept, not re-created
- Progressive enhancement

---

## 🔧 Common Patterns

### More State

State is passed to the component as props:

```javascript
hydrate(Profile, el, { initialState: { name: '', items: [] } });

// In a handler
onClick: (event) => event.setState({ items: [...event.state.items, 'new'] })

// Or with an updater function
onClick: (event) => event.setState((state) => ({ count: state.count + 1 }))
```

### Multiple Event Handlers

Any DOM event works: `onClick`, `onInput`, `onSubmit`, `onMouseEnter`, `onDoubleClick`...

```javascript
{
  button: {
    text: 'Click',
    onClick: (event) => event.setState({ clicked: true }),
    onMouseEnter: (event) => event.setState({ hovering: true })
  }
}
```

Handlers bubble like DOM events: a click inside nested elements that both have `onClick` runs both, innermost first; call `event.stopPropagation()` to stop.

### Conditional Rendering

`false`, `null` and `undefined` children render nothing:

```javascript
{
  div: {
    children: [
      count > 10 && { p: { text: 'Count is high!' } },
      count === 0 && { p: { text: 'Count is zero' } }
    ]
  }
}
```

### Lists

```javascript
{
  ul: {
    children: items.map((item) => ({ li: { key: item.id, text: item.name } }))
  }
}
```

With a `key` on every item, re-renders keep the DOM nodes of unchanged items.

---

## ⚠️ Important Rules

### 1. Hydrate the component's root element

`hydrate(Counter, element)` pairs `Counter`'s output with `element`, so `element` must be the element the component's root renders (here `.counter`), not a wrapper around it.

### 2. Render the same thing on both sides

The server and the browser must call the component with the same props/state. Keep values that differ between the two (the current time, random ids, `window` reads) out of the first render. In development (`NODE_ENV=development`), or with `hydrate(..., { detectMismatch: true })`, differences are reported in the console.

### 3. Raw HTML is explicit

`text` is always escaped. Only use `html:` or `dangerouslySetInnerContent()` for markup you control or have sanitized.

---

## 🚀 Next Steps

### Add a Todo List

```javascript
export function TodoList({ todos = [], input = '' }) {
  return {
    div: {
      className: 'todo-list',
      children: [
        {
          input: {
            value: input,
            onInput: (event) => event.setState({ input: event.originalEvent.target.value })
          }
        },
        {
          button: {
            text: 'Add',
            onClick: (event) => event.setState({
              todos: [...event.state.todos, event.state.input],
              input: ''
            })
          }
        },
        {
          ul: {
            children: todos.map((todo, i) => ({ li: { key: i, text: todo } }))
          }
        }
      ]
    }
  };
}

// client.js
hydrate(TodoList, document.querySelector('.todo-list'), { initialState: { todos: [], input: '' } });
```

### Add Routing

```javascript
const server = createServer((req, res) => {
  if (req.url === '/') {
    res.end(`<!DOCTYPE html>${render(homePage())}`);
  } else if (req.url === '/about') {
    res.end(`<!DOCTYPE html>${render(aboutPage())}`);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
```

For Express, Fastify or Koa, `@coherent.js/integrations` adds `res.coherent()` / `reply.coherent()` / `ctx.coherent()` (see [Framework Integrations](../deployment/integrations.md)); in the browser, `@coherent.js/client/router` handles client-side navigation (see [Router](../client/router.md)).

### Add API Endpoints

```javascript
if (req.url === '/api/data') {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ data: 'Hello' }));
}
```

For more than a couple of endpoints, use `@coherent.js/api` (see the [API usage guide](../api/usage.md)).

---

## 📚 Reference

### Component Structure

```javascript
{
  tagName: {
    className: 'my-class',        // or ['a', cond && 'b'], or { active: cond }
    id: 'my-id',
    children: [
      { h1: { text: 'Title' } },
      { p: { text: 'Paragraph' } }
    ]
  }
}
```

### Event Handlers

```javascript
{
  button: {
    onClick: (event) => {},       // event.state, event.setState(), event.props
    onMouseEnter: (event) => {},
    onSubmit: (event) => { event.preventDefault(); }
  }
}
```

---

## ✅ Checklist

Before deploying, make sure:

- [ ] The client bundle (`/hydration.js`) is served
- [ ] `hydrate()` is called with each interactive component's root element
- [ ] Server and client render the component with the same props/state
- [ ] No hydration mismatch warnings appear in development

---

## 🎉 Success!

You've built a server-rendered, hydrated Coherent.js application.

**What you learned:**
- ✅ Server-Side Rendering
- ✅ Client-Side Hydration
- ✅ Client State
- ✅ Event Handling
- ✅ Component Structure

**Next:** Check out the [starter-app example](../../examples/starter-app) for a complete working template, and the [Hydration guide](../client/hydration.md) for the details.
