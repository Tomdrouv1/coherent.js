# 🚀 Coherent.js Starter App

A **simple, working full-stack example** that demonstrates:
- ✅ Server-Side Rendering (SSR)
- ✅ Client-Side Hydration
- ✅ Interactive Components
- ✅ State Management

## 🎯 What This Is

This is a **minimal, complete example** of a Coherent.js application that actually works end-to-end. No complexity, no confusion - just a working counter app that demonstrates the full stack.

## 🚀 Quick Start

### Run the App

```bash
# From the starter-app directory
node server.js
```

Then open your browser to `http://localhost:3000`

**That's it!** The counter works, buttons click, state updates. Everything just works.

## 📁 Project Structure

```
starter-app/
├── components/
│   └── Counter.js      # Interactive counter component
├── server.js           # HTTP server with SSR
└── README.md          # This file
```

## 🎓 How It Works

### 1. Server-Side Rendering (SSR)

When you visit `http://localhost:3000`, the server:

1. Renders the `Counter` component to HTML
2. Sends complete HTML to browser
3. Page displays **instantly** (no loading spinner!)

```javascript
// server.js
const page = createPage();
const html = renderToString(page);  // ← SSR happens here
res.end(html);
```

### 2. Client-Side Hydration

After the HTML loads, the browser:

1. Loads `/hydration.js` bundle
2. Finds components with `data-coherent-component`
3. Attaches event handlers
4. Makes buttons interactive

```javascript
// In the page
autoHydrate(window.componentRegistry);  // ← Hydration happens here
```

### 3. Component Definition

The counter is a simple `withState` component:

```javascript
// components/Counter.js
export const Counter = withState({ count: 0 })(({ state, setState }) => ({
  div: {
    'data-coherent-component': 'counter',  // ← Required for hydration
    children: [
      { p: { text: `Count: ${state.count}` } },
      {
        button: {
          text: '+',
          onclick: (event, state, setState) => {
            setState({ count: state.count + 1 });  // ← Event handler
          }
        }
      }
    ]
  }
}));
```

## ✨ Key Features Demonstrated

### Server-Side Rendering
- Fast initial page load
- SEO-friendly HTML
- Works without JavaScript

### Client-Side Hydration
- Makes SSR'd HTML interactive
- Preserves server-rendered content
- Attaches event handlers

### State Management
- `withState` for reactive components
- `setState` for updates
- Automatic re-rendering

### Event Handlers
- Inline event handlers in components
- Signature: `(event, state, setState) => {}`
- Work after hydration

## 🎯 What Makes This Different

### Other Examples
- ❌ Complex setup
- ❌ Build steps required
- ❌ Doesn't actually work
- ❌ Missing pieces

### This Example
- ✅ **One command to run**
- ✅ **No build step**
- ✅ **Actually works**
- ✅ **Complete and simple**

## 📚 Learn More

### Understanding the Code

**server.js**
- Creates HTTP server
- Serves `/hydration.js` bundle
- Renders page with `renderToString`
- Includes hydration script

**components/Counter.js**
- Uses `withState` for state management
- Returns object-based component
- Has `data-coherent-component` attribute
- Event handlers use `(event, state, setState)` signature

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

**2. State Management**
```javascript
withState({ count: 0 })(({ state, setState }) => {
  // state.count is available
  // setState({ count: 1 }) to update
})
```

**3. Event Handlers**
```javascript
{
  button: {
    text: 'Click',
    onclick: (event, state, setState) => {
      setState({ clicked: true });
    }
  }
}
```

**4. Hydration Marker**
```javascript
{
  div: {
    'data-coherent-component': 'my-component',  // ← Required!
    children: [...]
  }
}
```

## 🔧 Customization

### Add More Components

1. Create `components/MyComponent.js`
2. Export a component function
3. Import and use in `server.js`

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
  const html = renderToString(aboutPage());
  res.end(html);
}
```

## ⚠️ Important Notes

### Event Handler Signature

Event handlers **must** use this signature:

```javascript
onclick: (event, state, setState) => {
  // Your code here
}
```

**Not** this:
```javascript
onclick: () => {  // ❌ Won't work with hydration
  // Your code here
}
```

### Hydration Marker

Components **must** have `data-coherent-component`:

```javascript
{
  div: {
    'data-coherent-component': 'counter',  // ✅ Required
    children: [...]
  }
}
```

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

- [Getting Started Guide](../../docs/getting-started.md)
- [Hydration Guide](../../docs/hydration-guide.md)
- [API Reference](../../docs/api-reference.md)

## 💡 Tips

- **Keep it simple** - Start with basic components
- **Test in browser** - Open DevTools console
- **Check hydration** - Look for "✅ Hydration complete!"
- **Read errors** - They're usually helpful

## ❓ Troubleshooting

### Buttons don't work
- Check browser console for errors
- Verify `data-coherent-component` attribute
- Ensure hydration script loaded

### Server won't start
- Check port 3000 is available
- Verify Node.js version (18+)
- Check file paths are correct

### Changes not showing
- Hard refresh browser (Cmd+Shift+R)
- Clear browser cache
- Restart server

## 🎯 This Is The Template

**This is how Coherent.js should be used for full-stack apps.**

Simple, clear, and it works. Use this as your starting point for real projects!

---

**Made with ❤️ using Coherent.js**
