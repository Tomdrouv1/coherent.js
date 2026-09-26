# 🚀 Coherent.js Starter App

A **simple, working full-stack example** that demonstrates:
- ✅ Server-Side Rendering (SSR)
- ✅ Client-Side Hydration
- ✅ Interactive Components
- ✅ State Management

## 🎯 What This Is

This is a **minimal, complete example** of a Coherent.js application that works end-to-end: a counter rendered on the server and made interactive in the browser.

## 🚀 Quick Start

### Run the App

```bash
# From the repository root, after `pnpm install` and `pnpm build`
node examples/starter-app/server.js
```

Then open your browser to `http://localhost:3000` (set `PORT` to use another port; `PORT=0` picks a free one).

The server bundles the hydration script with esbuild when it starts, so there is no separate build step for the app itself.

## 📁 Project Structure

```
starter-app/
├── components/
│   └── Counter.js      # Interactive counter component
├── server.js           # HTTP server with SSR and the hydration bundle
└── README.md           # This file
```

## 🎓 How It Works

### 1. Server-Side Rendering (SSR)

When you visit `http://localhost:3000`, the server:

1. Renders the `Counter` component (with its initial state) to HTML
2. Sends complete HTML to the browser
3. The page displays **instantly** (no loading spinner!)

```javascript
// server.js
const INITIAL_STATE = { count: 0 };

const page = createPage();   // contains Counter(INITIAL_STATE)
const html = render(page);   // ← SSR happens here
res.end(html);
```

### 2. Client-Side Hydration

After the HTML loads, the browser:

1. Loads the `/hydration.js` bundle
2. Finds the counter's element
3. Calls `hydrate()`, which binds the `onClick` handlers to the server-rendered buttons

```javascript
// The hydration entry bundled by server.js
import { hydrate } from '@coherent.js/client';
import { Counter } from './components/Counter.js';

const element = document.querySelector('[data-coherent-component="counter"]');
hydrate(Counter, element, { initialState: { count: 0 } });  // ← Hydration happens here
```

`hydrate(component, container, options)` takes the component function, the element the server rendered for it, and the state to start from (it must match the state the server rendered with).

### 3. Component Definition

The counter is a plain function of its state:

```javascript
// components/Counter.js
export function Counter({ count = 0 } = {}) {
  return {
    div: {
      'data-coherent-component': 'counter',  // ← Lets the entry find the element
      className: 'counter',
      children: [
        { p: { text: `Count: ${count}` } },
        {
          button: {
            text: '+',
            onClick: (event) => {
              event.setState({ count: event.state.count + 1 });  // ← Event handler
            }
          }
        }
      ]
    }
  };
}
```

## ✨ Key Features Demonstrated

### Server-Side Rendering
- Fast initial page load
- SEO-friendly HTML
- Works without JavaScript

### Client-Side Hydration
- Makes SSR'd HTML interactive
- Preserves server-rendered content
- Attaches event handlers through document-level delegation

### State Management
- The component receives its state as props
- `event.setState()` updates it
- The component re-renders and only the changed DOM is patched

### Event Handlers
- `onClick` (or any `on*` prop) in the component
- Receive one wrapped event: `event.state`, `event.setState()`, `event.props`, `event.originalEvent`
- Run in the browser after hydration; on the server they render no attribute

## 📚 Learn More

### Understanding the Code

**server.js**
- Creates the HTTP server
- Bundles and serves `/hydration.js`
- Renders the page with `render`
- Includes the hydration script

**components/Counter.js**
- A plain function of its state (`{ count }`)
- Returns an object-based component
- Has a `data-coherent-component` attribute the hydration entry looks for
- Event handlers update state with `event.setState()`

### Key Concepts

**1. Component Structure**
```javascript
{
  div: {
    className: 'my-class',
    children: [
      { h1: { text: 'Title' } },
      { p: { text: 'Content' } }
    ]
  }
}
```

**2. State**
```javascript
// Server
render(Counter({ count: 0 }));

// Browser
const app = hydrate(Counter, element, { initialState: { count: 0 } });
app.setState({ count: 5 });  // also possible from outside the component
```

**3. Event Handlers**
```javascript
{
  button: {
    text: 'Click',
    onClick: (event) => {
      event.setState({ clicked: true });
    }
  }
}
```

## 🔧 Customization

### Add More Components

1. Create `components/MyComponent.js`
2. Export a component function
3. Render it in `server.js` and hydrate it in the hydration entry

### Add Styling

Inline styles in the `<style>` tag in `server.js`:

```javascript
{
  style: {
    text: dangerouslySetInnerContent(`
      .my-class { color: blue; }
    `)
  }
}
```

### Add More Pages

Create different page functions and route them:

```javascript
if (req.url === '/about') {
  const html = render(aboutPage());
  res.end(html);
}
```

## ⚠️ Important Notes

### Same State on Both Sides

Render on the server and hydrate in the browser with the same state. With
different values the first client re-render would replace what the server sent.

### dangerouslySetInnerContent

Use for `<script>` and `<style>` tags to prevent HTML escaping:

```javascript
{
  script: {
    text: dangerouslySetInnerContent(`console.log('Hello');`)
  }
}
```

## 🎉 Success!

If you can click the buttons and see the count change, **you've successfully run a full-stack Coherent.js app!**

## 🚀 Next Steps

1. **Modify the counter** - Change the increment value
2. **Add another component** - Create a todo list
3. **Add styling** - Make it look beautiful
4. **Add routing** - Multiple pages
5. **Deploy it** - Share with the world!

## 📖 Documentation

- [Quick Start](../../docs/getting-started/quick-start.md)
- [Client Hydration](../../docs/client/hydration.md)
- [@coherent.js/client README](../../packages/client/README.md)

## ❓ Troubleshooting

### Buttons don't work
- Check the browser console for errors
- Verify the `data-coherent-component` attribute is on the counter's root element
- Ensure `/hydration.js` loaded

### Server won't start
- Check port 3000 is available (or set `PORT`)
- Verify the Node.js version (22.12+)
- Run `pnpm install` and `pnpm build` at the repository root first

### Changes not showing
- Hard refresh browser (Cmd+Shift+R)
- Restart the server (the hydration bundle is built at startup)

---

**Made with ❤️ using Coherent.js**
