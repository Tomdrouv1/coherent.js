# Installation & Quick Start

Get up and running with Coherent.js in under 5 minutes.

## 📦 Installation

Coherent.js packages are ESM-only and require Node.js 22.12 or later.

### Using pnpm (recommended)
```bash
pnpm add @coherent.js/core
```

### Using npm
```bash
npm install @coherent.js/core
```

### Using yarn
```bash
yarn add @coherent.js/core
```

Your `package.json` needs `"type": "module"` (or use `.mjs` files).

## ⚡ Quick Start

### 1. Your First Component

Create a file called `hello.js`:

```javascript
import { render } from '@coherent.js/core';

// Define a simple component
const HelloWorld = {
  div: {
    className: 'greeting',
    children: [
      { h1: { text: 'Hello, Coherent.js!' } },
      { p: { text: 'Your first pure object component.' } }
    ]
  }
};

// Render to HTML
const html = render(HelloWorld);
console.log(html);
```

Run it:
```bash
node hello.js
```

**Output:**
```html
<div class="greeting"><h1>Hello, Coherent.js!</h1><p>Your first pure object component.</p></div>
```

### 2. Dynamic Components

Create `dynamic.js`:

```javascript
import { render, createComponent } from '@coherent.js/core';

// Component with parameters
const UserCard = createComponent(({ name, role, avatar }) => ({
  div: {
    className: 'user-card',
    children: [
      { img: { src: avatar, alt: `${name}'s avatar`, className: 'avatar' } },
      { h3: { text: name } },
      { p: { className: 'role', text: role } },
      { button: { 
        onclick: `showProfile('${name}')`, 
        text: 'View Profile' 
      } }
    ]
  }
}));

// Use the component
const userHtml = render(
  UserCard({ 
    name: 'Jane Doe', 
    role: 'Senior Developer',
    avatar: '/images/jane.jpg'
  })
);

console.log(userHtml);
```

### 3. Server Integration

Create `server.js` with Express:

```javascript
import express from 'express';
import { render } from '@coherent.js/core';

const app = express();

// Define a page component
const HomePage = {
  html: {
    children: [
      { head: {
        children: [
          { title: { text: 'My Coherent.js App' } },
          { meta: { charset: 'utf-8' } },
          { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1' } }
        ]
      }},
      { body: {
        children: [
          { header: {
            children: [
              { h1: { text: 'Welcome to Coherent.js' } },
              { nav: {
                children: [
                  { a: { href: '/', text: 'Home' } },
                  { a: { href: '/about', text: 'About' } }
                ]
              }}
            ]
          }},
          { main: {
            children: [
              { p: { text: 'This page was rendered with pure JavaScript objects!' } },
              { button: { 
                onclick: 'alert("Hello from Coherent.js!")', 
                text: 'Click me!' 
              } }
            ]
          }}
        ]
      }}
    ]
  }
};

app.get('/', (req, res) => {
  const html = render(HomePage);
  res.send(`<!DOCTYPE html>${html}`); // render() does not add the doctype
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

For Express, Fastify and Koa, `@coherent.js/integrations` adds `res.coherent()` / `reply.coherent()` / `ctx.coherent()` with a document template; see [Framework Integrations](../deployment/integrations.md).

## 🏗️ Project Structure

Here's a recommended project structure:

```
my-coherent-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Header.js
│   │   ├── Footer.js
│   │   └── UserCard.js
│   ├── pages/              # Page components
│   │   ├── Home.js
│   │   ├── About.js
│   │   └── Contact.js
│   ├── layouts/            # Layout components
│   │   └── MainLayout.js
│   └── server.js           # Server setup
├── public/                 # Static assets
│   ├── css/
│   ├── js/
│   └── images/
└── package.json
```

## 🎯 Next Steps

Now that you have Coherent.js installed and running:

1. **[Learn Component Basics →](../components/basics.md)** - Master the object syntax
2. **[Explore Examples →](/examples)** - See real-world patterns
3. **[Server Integration →](../deployment/integrations.md)** - Connect with your favorite framework
4. **[Performance Tips →](../deployment/performance.md)** - Optimize for production

## 🔧 Development Tools

### TypeScript Support

Coherent.js includes full TypeScript definitions:

```typescript
import { render } from '@coherent.js/core';
import type { CoherentNode } from '@coherent.js/core';

interface UserProps {
  name: string;
  email: string;
}

const UserComponent = (props: UserProps): CoherentNode => ({
  div: {
    className: 'user',
    children: [
      { h2: { text: props.name } },
      { p: { text: props.email } }
    ]
  }
});
```

### CLI and Development Server

`@coherent.js/cli` scaffolds projects and runs a development server:

```bash
pnpm add -g @coherent.js/cli

coherent create my-app   # interactive scaffold
cd my-app
coherent dev             # development server
```

## 🐛 Troubleshooting

### Common Issues

**Q: Getting "Module not found" error?**
```bash
# Make sure you're using ES modules
# Add to package.json:
"type": "module"
```

**Q: Components not rendering?**
```javascript
// Check object structure - each component needs a tag name
const Valid = { div: { text: 'Hello' } };
const Invalid = { text: 'Hello' }; // Missing tag wrapper
```

**Q: My click handler does nothing?**
```javascript
// Function: rendered as nothing on the server, attached in the browser by hydrate()
const SaveButton = { button: { className: ['btn', isActive && 'btn--active'], onClick: () => save(), text: 'Save' } };

// String: rendered as an onclick attribute
const BackButton = { button: { onclick: 'history.back()', text: 'Back' } };
```

Function handlers need client-side hydration (`hydrate()` from `@coherent.js/client`); see [Hydration](../client/hydration.md).

**Q: `render()` throws "Cannot render a Promise"?**

`render()` is synchronous. Await your data (and any `async` component) before rendering.

## 📚 Resources

- **[API Reference](../api/reference.md)** - Complete function documentation
- **[Examples](/examples)** - Practical code samples
- **[GitHub Repository](https://github.com/Tomdrouv1/coherent.js)** - Source code and issues

Ready to dive deeper? **[Continue to Component Basics →](../components/basics.md)**
