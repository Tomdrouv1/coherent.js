# Coherent.js Full-Stack Guide

**Coherent.js combines server-side rendering (SSR) with progressive client-side enhancement.** The server renders complete HTML; the browser hydrates the parts that need to be interactive.

## 🌊 The Full-Stack Flow

### 1️⃣ **Server Renders** (SSR)

The server loads the data, then renders HTML with `@coherent.js/core`:

```javascript
// server.js
import express from 'express';
import { setupCoherent } from '@coherent.js/integrations/express';
import { UserProfilePage } from './components/UserProfilePage.js';

const app = express();
setupCoherent(app, {
  template: '<!DOCTYPE html><html><head><title>User Profile</title>' +
    '<script type="module" src="/bundle.js"></script></head><body>{{content}}</body></html>'
});

app.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id); // load data first: render() is synchronous
  res.coherent(UserProfilePage({ user }));
});
```

**Result**: fast initial page load with SEO-friendly HTML.

### 2️⃣ **Client Hydrates** (Progressive Enhancement)

The browser runs the same component again and attaches its event handlers to the existing HTML:

```javascript
// client.js
import { hydrate } from '@coherent.js/client';
import { UserProfilePage } from './components/UserProfilePage.js';

const root = document.querySelector('.user-profile'); // the element UserProfilePage's root renders
hydrate(UserProfilePage, root, { initialState: { user: window.__USER__ } });
```

**Result**: the server HTML becomes interactive without being re-created.

### 3️⃣ **Client Enhances** (SPA Features)

After hydration, add client-side navigation and reactive state:

```javascript
// client.js
import { createRouter } from '@coherent.js/client/router';
import { createReactiveState } from '@coherent.js/state';

const router = createRouter({ mode: 'history' });
router.addRoute('/', { component: () => import('./pages/Home.js') });
router.addRoute('/users/:id', { component: () => import('./pages/UserProfile.js') });
router.addRoute('/products', { component: () => import('./pages/Products.js') });

const appState = createReactiveState({ cart: [], notifications: [] });
appState.watch('cart', (cart) => {
  document.querySelector('.cart-count').textContent = String(cart.length);
});

await router.start(); // follows the URL and intercepts clicks on links to registered routes
```

The router resolves routes and loads their modules; rendering the matched page into the document is up to your application (see [Router](../client/router.md)).

## 🎯 Complete Example: Full-Stack App

### **Server (SSR)**

```javascript
// server/index.js
import express from 'express';
import { render } from '@coherent.js/core';
import { createFormBuilder, validators } from '@coherent.js/forms';

const app = express();
app.use(express.static('public'));

// The form definition is shared by every request
const signupForm = createFormBuilder({ name: 'signup', action: '/signup', method: 'post' })
  .field('email', {
    type: 'email',
    label: 'Email',
    required: true,
    validators: [validators.email()]
  })
  .field('password', {
    type: 'password',
    label: 'Password',
    required: true,
    validators: [validators.minLength(8)]
  });

const page = (content) => `<!DOCTYPE html>
<html><head><title>Sign up</title><script type="module" src="/bundle.js"></script></head>
<body>${render(content)}</body></html>`;

app.get('/signup', (req, res) => {
  // The rules are embedded in the HTML as data-validators='[{"name":"minLength","args":[8]}]'
  res.send(page({ div: { children: [{ h1: { text: 'Sign Up' } }, signupForm.buildForm()] } }));
});

// Server-side validation with the same rules (never trust the client)
app.post('/signup', express.json(), async (req, res) => {
  const errors = signupForm.fork().setValues(req.body).validate();
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const user = await db.users.create(req.body);
  res.json({ user: { id: user.id, email: user.email } });
});

app.listen(3000);
```

### **Client (Hydration + Enhancement)**

```javascript
// client/index.js
import { createRouter } from '@coherent.js/client/router';
import { withLocalStorage } from '@coherent.js/state';
import { hydrateForm } from '@coherent.js/forms/hydration';

// 1. Client-side routing
const router = createRouter({ mode: 'history', prefetch: { enabled: true, strategy: 'hover' } });
router.addRoute('/', { component: () => import('./pages/Home.js') });
router.addRoute('/products', { component: () => import('./pages/Products.js') });
router.addRoute('/cart', { component: () => import('./pages/Cart.js') });

// 2. Persistent client state
const cart = withLocalStorage({ items: [] }, 'cart');
await cart.ready; // stored state is restored asynchronously
cart.subscribe((state) => {
  fetch('/api/cart', { method: 'POST', body: JSON.stringify({ items: state.items }) });
});

// 3. Enhance the server-rendered form: reads data-validators, validates on blur and submit
const signup = hydrateForm('form[name="signup"]', {
  validateOnBlur: true,
  onSubmit: async (values) => {
    const response = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    if (response.ok) router.push('/dashboard');
  }
});

await router.start();
```

### **Components (Universal - Work on Both Server and Client)**

```javascript
// components/ProductsPage.js
export function ProductsPage({ products = [] }) {
  return {
    div: {
      className: 'products-page',
      children: [
        { h1: { text: 'Products' } },
        {
          div: {
            className: 'product-grid',
            children: products.map((product) => ({
              div: {
                className: 'product-card',
                key: product.id,
                children: [
                  { h3: { text: product.name } },
                  { p: { text: `$${product.price}` } },
                  {
                    button: {
                      text: 'Add to Cart',
                      // Rendered as nothing on the server, attached by hydrate() in the browser
                      onClick: (event) => event.setState({ cart: [...(event.state.cart ?? []), product.id] })
                    }
                  }
                ]
              }
            }))
          }
        }
      ]
    }
  };
}
```

Data reaches components as props. On the server, the SSR context API of `@coherent.js/state` (`runWithContext`, `provideContext`, `useContext`) can share request-scoped values without threading them through every component; see [State Management](../components/state.md#context-api).

## 📊 Architecture Comparison

### **Traditional SPA (React, Vue)**
```
┌─────────────────┐
│   Browser       │
│  - Blank HTML   │ ← Initial load is slow
│  - JS loads     │ ← Downloads framework
│  - App renders  │ ← Client-side only
└─────────────────┘
```
❌ Slow initial load
❌ Poor SEO
✅ Fast subsequent navigation

### **Traditional SSR (PHP, Rails)**
```
┌─────────────────┐
│   Server        │
│  - Renders HTML │ ← Fast initial load
│  - Full reload  │ ← Every navigation reloads
└─────────────────┘
```
✅ Fast initial load
✅ Good SEO
❌ Full page loads on navigation

### **Coherent.js Full-Stack**
```
┌─────────────────┐     ┌─────────────────┐
│   Server (SSR)  │  →  │  Client         │
│  - Renders HTML │     │  - Hydrates     │
│  - Fast initial │     │  - Routes       │
│  - SEO ready    │     │  - Reactive     │
└─────────────────┘     └─────────────────┘
```
✅ Fast initial load (SSR)
✅ Good SEO (SSR)
✅ Client-side navigation where you want it
✅ Progressive enhancement

## 🎯 Best Practices

### **1. Render Critical Content on Server**
```javascript
// ✅ Good: Render above-the-fold content on server
app.get('/products', async (req, res) => {
  const products = await db.products.limit(20).findAll();
  res.coherent(ProductsPage({ products }));
});

// ❌ Bad: Empty server response, client-only rendering
app.get('/products', (req, res) => {
  res.send('<div id="app"></div>'); // Client will fetch data
});
```

### **2. Hydrate the Element the Component Renders**
```javascript
// ✅ Good: the component's root element
hydrate(ProductsPage, document.querySelector('.products-page'), { initialState: { products } });

// ❌ Bad: a wrapper around it; hydrate() pairs the component's root with the container itself
hydrate(ProductsPage, document.getElementById('app'));
```

### **3. Use Reactive State for Client-Only Features**
```javascript
import { observable } from '@coherent.js/state';

const sidebarOpen = observable(false); // client-only UI state
sidebarOpen.watch((open) => document.body.classList.toggle('sidebar-open', open));
```

Keep request data on the server in props (or the request-scoped context), never in module-level state shared by all requests.

### **4. Forms: SSR + Hydration (No Duplication!)**
```javascript
// SERVER
import { createFormBuilder, validators } from '@coherent.js/forms';

const form = createFormBuilder({ name: 'newsletter' })
  .field('email', { type: 'email', required: true, validators: [validators.email()] });
const html = render(form.buildForm());
// <input ... required data-required="true" data-validators="[{&quot;name&quot;:&quot;email&quot;,...}]">

// CLIENT
import { hydrateForm } from '@coherent.js/forms/hydration';

hydrateForm('form[name="newsletter"]'); // rebuilds the same rules from data-validators
```

### **5. Validate on Both Server and Client (Same Rules)**
```javascript
import { validators, validateForm } from '@coherent.js/forms';

const rules = { email: [validators.required(), validators.email()] };

// Server (REQUIRED for security)
app.post('/api/form', express.json(), (req, res) => {
  const errors = validateForm(req.body, rules); // { email: 'Invalid email address' } or {}
  if (Object.keys(errors).length > 0) return res.status(400).json({ errors });
  res.json({ ok: true });
});

// Client (for UX): hydrateForm() applies the rules the server rendered
```

## 📝 Forms: Complete SSR + Hydration Example

```javascript
// ============================================
// SERVER: Build form with validation metadata
// ============================================
import { render } from '@coherent.js/core';
import { createFormBuilder, validators } from '@coherent.js/forms';

const contactForm = createFormBuilder({ name: 'contact', action: '/contact', method: 'post' })
  .field('name', { label: 'Full Name', required: true, validators: [validators.minLength(3)] })
  .field('email', { label: 'Email', type: 'email', required: true, validators: [validators.email()] })
  .field('message', { label: 'Message', type: 'textarea', required: true, validators: [validators.minLength(10)] });

app.get('/contact', (req, res) => {
  res.send(page({ div: { children: [contactForm.buildForm()] } }));
});

// Server-side validation (REQUIRED - never trust the client)
app.post('/contact', express.json(), async (req, res) => {
  const errors = contactForm.fork().setValues(req.body).validate();
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  await sendContactEmail(req.body);
  res.json({ success: true });
});

// ============================================
// CLIENT: Hydrate server-rendered form
// ============================================
import { hydrateForm } from '@coherent.js/forms/hydration';

const contact = hydrateForm('form[name="contact"]', {
  validateOnBlur: true,
  async onSubmit(values) {
    const response = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    if (response.ok) {
      alert('Message sent!');
      contact.reset();
    }
  }
});
```

**Key Benefits:**
- ✅ **No duplication** - Form defined once on the server
- ✅ **Progressive enhancement** - Works without JS
- ✅ **Shared validation** - Same rules on server and client
- ✅ **SEO-friendly** - Form HTML in initial response

## 📦 Package Usage Guide

| Package | Server (SSR) | Client (Hydration) | Client (Enhancement) |
|---------|--------------|-------------------|---------------------|
| **@coherent.js/core** | ✅ Rendering | ❌ | ❌ |
| **@coherent.js/client** | ❌ | ✅ Hydration | ✅ Router, HMR |
| **@coherent.js/state** | ✅ Context API | ❌ | ✅ Reactive state, persistence |
| **@coherent.js/forms** | ✅ Form builder, CSRF | ✅ Form hydration | ✅ Client validation |
| **@coherent.js/integrations/express** | ✅ Integration | ❌ | ❌ |

## 🚀 Deployment

Bundle the client entry for the browser (esbuild, Vite, Rollup...) and serve it as a static file; run the server with Node.js 22.12+ and `NODE_ENV=production`. See the [Deployment Guide](../deployment/index.md).

## 🎓 Learning Path

1. **Start with SSR** - Learn `@coherent.js/core` rendering
2. **Add Hydration** - Make it interactive with `@coherent.js/client`
3. **Enable Routing** - Add client navigation with `@coherent.js/client/router`
4. **Add Reactivity** - Enhance UX with `@coherent.js/state`
5. **Optimize** - Prefetch routes, cache deliberately, monitor performance

## 📚 Next Steps

- [Server-Side Rendering Guide](../server/ssr.md)
- [Client-Side Hydration](../client/hydration.md)
- [Client Router](../client/router.md)
- [Reactive State Management](../components/state.md)
- [Full-Stack Forms](../packages/forms.md)
