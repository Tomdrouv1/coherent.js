# 🚀 Complete Full-Stack Tutorial - Coherent.js

**The definitive guide to building full-stack applications with Coherent.js**

This tutorial shows you how to build a complete, working full-stack application with server-side rendering and client-side hydration.

---

## 🎯 What You'll Build

A simple counter app that demonstrates:
- ✅ Server-Side Rendering (SSR)
- ✅ Client-Side Hydration  
- ✅ Interactive Components
- ✅ State Management

**Time to complete:** 10 minutes  
**Difficulty:** Beginner  
**Prerequisites:** Node.js 18+

---

## 📁 Step 1: Project Setup

Create your project structure:

```bash
mkdir my-coherent-app
cd my-coherent-app
npm init -y
npm install @coherent.js/core
```

Create these files:

```
my-coherent-app/
├── components/
│   └── Counter.js
├── server.js
└── package.json
```

---

## 🎨 Step 2: Create the Counter Component

Create `components/Counter.js`:

```javascript
import { withState } from '@coherent.js/core';

export const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    'data-coherent-component': 'counter',  // ← Required for hydration
    className: 'counter',
    children: [
      { h2: { text: 'Interactive Counter' } },
      { 
        p: { 
          text: `Count: ${state.count}`,
          className: 'count-display'
        } 
      },
      {
        div: {
          className: 'button-group',
          children: [
            {
              button: {
                text: '−',
                className: 'btn',
                // Event handler signature: (event, state, setState)
                onclick: (event, state, setState) => {
                  setState({ count: state.count - 1 });
                }
              }
            },
            {
              button: {
                text: 'Reset',
                className: 'btn',
                onclick: (event, state, setState) => {
                  setState({ count: 0 });
                }
              }
            },
            {
              button: {
                text: '+',
                className: 'btn',
                onclick: (event, state, setState) => {
                  setState({ count: state.count + 1 });
                }
              }
            }
          ]
        }
      }
    ]
  }
}));
```

### Key Points:

1. **`withState({ count: 0 })`** - Adds state management
2. **`data-coherent-component`** - Required for hydration to find the component
3. **Event handler signature** - `(event, state, setState) => {}`
4. **`setState({ count: ... })`** - Updates state and re-renders

---

## 🖥️ Step 3: Create the Server

Create `server.js`:

```javascript
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { render, dangerouslySetInnerContent } from '@coherent.js/core';
import { Counter } from './components/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create the HTML page
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
                text: dangerouslySetInnerContent(`
                  body { font-family: Arial, sans-serif; padding: 40px; }
                  .counter { background: #f0f0f0; padding: 20px; border-radius: 8px; }
                  .count-display { font-size: 2rem; font-weight: bold; margin: 20px 0; }
                  .button-group { display: flex; gap: 10px; }
                  .btn { padding: 10px 20px; border: none; border-radius: 4px; 
                         cursor: pointer; background: #007bff; color: white; }
                  .btn:hover { background: #0056b3; }
                `)
              }
            }
          ]
        }
      },
      {
        body: {
          children: [
            { h1: { text: 'My Coherent.js App' } },
            Counter(),  // ← Render the counter
            
            // Hydration script
            {
              script: {
                type: 'module',
                text: dangerouslySetInnerContent(`
                  import { autoHydrate } from '/hydration.js';
                  
                  document.addEventListener('DOMContentLoaded', () => {
                    window.componentRegistry = {};
                    autoHydrate(window.componentRegistry);
                    console.log('✅ Hydration complete!');
                  });
                `)
              }
            }
          ]
        }
      }
    ]
  }
});

// HTTP Server
const server = createServer((req, res) => {
  // Serve hydration bundle
  if (req.url === '/hydration.js') {
    const hydrationPath = join(__dirname, 'node_modules/@coherent.js/core/client/hydration.js');
    const hydrationCode = readFileSync(hydrationPath, 'utf-8');
    res.setHeader('Content-Type', 'application/javascript');
    res.end(hydrationCode);
    return;
  }
  
  // Serve main page
  res.setHeader('Content-Type', 'text/html');
  const html = render(createPage());
  res.end(html);
});

server.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
```

### Key Points:

1. **`render()`** - Renders components to HTML (SSR)
2. **`dangerouslySetInnerContent()`** - Prevents HTML escaping for scripts/styles
3. **`/hydration.js`** - Serves the client-side hydration bundle
4. **`autoHydrate()`** - Makes server-rendered HTML interactive

---

## ▶️ Step 4: Run Your App

```bash
node server.js
```

Open your browser to `http://localhost:3000`

**Click the buttons - they work!** 🎉

---

## 🎓 How It Works

### 1. Server-Side Rendering (SSR)

When you visit the page:

```
Browser Request → Server
                  ↓
          Counter Component
                  ↓
          render()
                  ↓
          Complete HTML
                  ↓
Browser ← HTML (instant display!)
```

**Benefits:**
- Fast initial load
- SEO-friendly
- Works without JavaScript

### 2. Client-Side Hydration

After HTML loads:

```
Browser loads /hydration.js
        ↓
autoHydrate() runs
        ↓
Finds data-coherent-component="counter"
        ↓
Attaches event handlers
        ↓
Buttons become interactive! ✨
```

**Benefits:**
- Preserves server-rendered HTML
- No flash of unstyled content
- Progressive enhancement

---

## 🔧 Common Patterns

### Adding More State

```javascript
withState({ 
  count: 0,
  name: '',
  items: []
})(({ state, setState }) => {
  // Access: state.count, state.name, state.items
  // Update: setState({ count: 5 })
})
```

### Multiple Event Handlers

```javascript
{
  button: {
    text: 'Click',
    onclick: (event, state, setState) => {
      console.log('Clicked!');
      setState({ clicked: true });
    },
    onmouseenter: (event, state, setState) => {
      setState({ hovering: true });
    }
  }
}
```

### Conditional Rendering

```javascript
{
  div: {
    children: [
      state.count > 10 && { p: { text: 'Count is high!' } },
      state.count === 0 && { p: { text: 'Count is zero' } }
    ].filter(Boolean)
  }
}
```

### Lists

```javascript
{
  ul: {
    children: state.items.map(item => ({
      li: { text: item.name, key: item.id }
    }))
  }
}
```

---

## ⚠️ Important Rules

### 1. Event Handler Signature

**Always use this signature:**

```javascript
onclick: (event, state, setState) => {
  // Your code
}
```

**Not this:**
```javascript
onclick: () => {  // ❌ Won't work with hydration!
  // Your code
}
```

### 2. Hydration Marker

**Always add `data-coherent-component`:**

```javascript
{
  div: {
    'data-coherent-component': 'my-component',  // ✅ Required
    children: [...]
  }
}
```

### 3. dangerouslySetInnerContent

**Use for scripts and styles:**

```javascript
{
  script: {
    text: dangerouslySetInnerContent(`console.log('Hello');`)
  }
}
```

**Why?** Without it, apostrophes become `&#x27;` and break JavaScript.

---

## 🚀 Next Steps

### Add a Todo List

```javascript
export const TodoList = withState({ 
  todos: [],
  input: ''
})(({ state, setState }) => ({
  div: {
    'data-coherent-component': 'todo-list',
    children: [
      {
        input: {
          value: state.input,
          oninput: (e, state, setState) => {
            setState({ input: e.target.value });
          }
        }
      },
      {
        button: {
          text: 'Add',
          onclick: (e, state, setState) => {
            setState({
              todos: [...state.todos, state.input],
              input: ''
            });
          }
        }
      },
      {
        ul: {
          children: state.todos.map((todo, i) => ({
            li: { text: todo, key: i }
          }))
        }
      }
    ]
  }
}));
```

### Add Routing

```javascript
const server = createServer((req, res) => {
  if (req.url === '/') {
    res.end(render(homePage()));
  } else if (req.url === '/about') {
    res.end(render(aboutPage()));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
```

### Add API Endpoints

```javascript
if (req.url === '/api/data') {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ data: 'Hello' }));
}
```

---

## 📚 Reference

### Component Structure

```javascript
{
  tagName: {
    className: 'my-class',
    id: 'my-id',
    children: [
      { h1: { text: 'Title' } },
      { p: { text: 'Paragraph' } }
    ]
  }
}
```

### State Management

```javascript
withState(initialState)(({ state, setState, stateUtils }) => {
  // state - current state
  // setState - update state
  // stateUtils - advanced utilities
})
```

### Event Handlers

```javascript
{
  button: {
    onclick: (event, state, setState) => {},
    onmouseenter: (event, state, setState) => {},
    onsubmit: (event, state, setState) => {}
  }
}
```

---

## ✅ Checklist

Before deploying, make sure:

- [ ] All components have `data-coherent-component`
- [ ] Event handlers use `(event, state, setState)` signature
- [ ] Scripts/styles use `dangerouslySetInnerContent()`
- [ ] `/hydration.js` is served correctly
- [ ] `autoHydrate()` is called on client
- [ ] Browser console shows "✅ Hydration complete!"

---

## 🎉 Success!

You've built a complete full-stack Coherent.js application!

**What you learned:**
- ✅ Server-Side Rendering
- ✅ Client-Side Hydration
- ✅ State Management
- ✅ Event Handling
- ✅ Component Structure

**Next:** Check out the [starter-app example](../examples/starter-app/) for a complete working template!

---

**Questions?** Check the [documentation](./README.md) or [examples](../examples/)
