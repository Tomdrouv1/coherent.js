# Coherent.js Full-Stack Guide

**Coherent.js is a full-stack JavaScript framework** that combines server-side rendering (SSR) with progressive client-side enhancement.

## 🌊 The Full-Stack Flow

### 1️⃣ **Server Renders** (SSR)
The server generates HTML using `@coherent.js/core`:

```javascript
// server.js
import express from 'express';
import { render } from '@coherent.js/core';
import { provideContext } from '@coherent.js/state';

const app = express();

app.get('/users/:id', async (req, res) => {
  // Fetch data on server
  const user = await db.users.findById(req.params.id);

  // Provide context for SSR
  provideContext('user', user);

  // Render to HTML
  const html = render(UserProfilePage());

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>User Profile</title>
        <script src="/bundle.js" defer></script>
      </head>
      <body>
        <div id="app">${html}</div>
      </body>
    </html>
  `);
});
```

**Result**: Fast initial page load with SEO-friendly HTML

### 2️⃣ **Client Hydrates** (Progressive Enhancement)
The browser makes the server HTML interactive:

```javascript
// client.js
import { hydrate } from '@coherent.js/client';

import { UserProfilePage } from './components/UserProfilePage.js';

// Attach event listeners to server-rendered HTML
hydrate(UserProfilePage, document.getElementById('app'));
```

**Result**: Server HTML becomes fully interactive

### 3️⃣ **Client Enhances** (SPA Features)
After hydration, add reactive features:

```javascript
// client.js
import { hydrate } from '@coherent.js/client';
import { createRouter } from '@coherent.js/client/router';
import { createReactiveState } from '@coherent.js/state';

// Hydrate first
hydrate(UserProfilePage, document.getElementById('app'));

// Enable client-side routing (SPA-like navigation)
const router = createRouter({
  mode: 'history',
  routes: {
    '/': HomePage,
    '/users/:id': UserProfilePage,
    '/products': ProductsPage
  }
});

// Add reactive state for interactions
const appState = createReactiveState({
  cart: [],
  notifications: []
});

appState.watch('cart', (newCart) => {
  console.log('Cart updated:', newCart);
  // Update UI reactively
});

router.start('#app');
```

**Result**: SPA-like experience with instant navigation

## 🎯 Complete Example: Full-Stack App

### **Server (SSR)**

```javascript
// server/index.js
import express from 'express';
import { render } from '@coherent.js/core';
import { provideContext } from '@coherent.js/state';
import { createFormBuilder, validators } from '@coherent.js/forms';

const app = express();

// SSR route with form
app.get('/signup', (req, res) => {
  // Build form on server with validation metadata
  const signupForm = createFormBuilder({ name: 'signup' })
    .field('email', {
      type: 'email',
      label: 'Email',
      required: true,
      validators: ['email'] // Embedded in HTML as data-validators="email"
    })
    .field('password', {
      type: 'password',
      label: 'Password',
      required: true,
      validators: ['minLength:8'] // Embedded as data-validators="minLength:8"
    });

  // Render form to HTML (includes validation metadata)
  const html = render({
    div: {
      children: [
        { h1: { text: 'Sign Up' } },
        signupForm.buildForm()
      ]
    }
  });

  res.send(wrapHTML(html, '/bundle.js'));
});

// Handle form submission (server-side validation)
app.post('/signup', express.json(), async (req, res) => {
  // Validate with SAME rules as client
  const { valid, errors } = validators.validate(req.body, {
    email: ['required', 'email'],
    password: ['required', 'minLength:8']
  });

  if (!valid) {
    return res.status(400).json({ errors });
  }

  const user = await db.users.create(req.body);
  res.json({ user });
});

app.listen(3000);
```

### **Client (Hydration + Enhancement)**

```javascript
// client/index.js
import { hydrate } from '@coherent.js/client';
import { createRouter } from '@coherent.js/client/router';
import { createReactiveState, withLocalStorage } from '@coherent.js/state';
import { hydrateForm } from '@coherent.js/forms';

// 1. Hydrate server HTML
hydrate(App, document.getElementById('app'));

// 2. Set up client-side routing
const router = createRouter({
  mode: 'history',
  routes: {
    '/': HomePage,
    '/products': ProductsPage,
    '/cart': CartPage
  },
  prefetch: {
    enabled: true,
    strategy: 'hover' // Prefetch on hover
  }
});

// 3. Set up reactive state
const cartState = withLocalStorage(
  createReactiveState({ items: [], total: 0 }),
  'cart'
);

cartState.watch('items', async (items) => {
  // Sync with server
  await fetch('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
});

// 4. Hydrate server-rendered forms (progressive enhancement)
const signupForm = hydrateForm('form[name="signup"]', {
  validateOnBlur: true,
  validateOnChange: false,
  debounce: 300,
  onSubmit: async (data, event) => {
    // Client-side submission with fetch
    const response = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const { errors } = await response.json();
      console.error('Validation errors:', errors);
      return false; // Don't submit form
    }

    const { user } = await response.json();
    console.log('User created:', user);
    router.push('/dashboard');
  },
  onError: (errors) => {
    console.error('Form errors:', errors);
  }
});
// ^^^ Reads data-validators from HTML
//     Attaches event listeners
//     No duplication - enhances server HTML!

// Start the router
router.start('#app');
```

### **Components (Universal - Works on Both Server and Client)**

```javascript
// components/ProductsPage.js
import { useContext } from '@coherent.js/state';

export function ProductsPage() {
  // On server: reads from context provided during SSR
  // On client: reads from reactive state
  const products = useContext('products') || [];

  return {
    div: {
      className: 'products-page',
      children: [
        { h1: { text: 'Products' } },
        {
          div: {
            className: 'product-grid',
            children: products.map(product => ({
              div: {
                className: 'product-card',
                children: [
                  { h3: { text: product.name } },
                  { p: { text: `$${product.price}` } },
                  {
                    button: {
                      text: 'Add to Cart',
                      onclick: `addToCart(${product.id})`
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
│  - Full reload  │ ← Every navigation is slow
└─────────────────┘
```
✅ Fast initial load
✅ Good SEO
❌ Slow subsequent navigation

### **Coherent.js Full-Stack**
```
┌─────────────────┐     ┌─────────────────┐
│   Server (SSR)  │  →  │  Client (SPA)   │
│  - Renders HTML │     │  - Hydrates     │
│  - Fast initial │     │  - Routes       │
│  - SEO ready    │     │  - Reactive     │
└─────────────────┘     └─────────────────┘
```
✅ Fast initial load (SSR)
✅ Good SEO (SSR)
✅ Fast subsequent navigation (Client routing)
✅ Progressive enhancement (Reactive state)

## 🎯 Best Practices

### **1. Render Critical Content on Server**
```javascript
// ✅ Good: Render above-the-fold content on server
app.get('/products', async (req, res) => {
  const products = await db.products.limit(20).findAll();
  provideContext('products', products);
  res.send(render(ProductsPage()));
});

// ❌ Bad: Empty server response, client-only rendering
app.get('/products', (req, res) => {
  res.send('<div id="app"></div>'); // Client will fetch data
});
```

### **2. Hydrate Before Adding Interactivity**
```javascript
// ✅ Good: Hydrate first, then enhance
hydrate(App, document.getElementById('app'));
const router = createRouter({ /* ... */ });

// ❌ Bad: Router before hydration
const router = createRouter({ /* ... */ });
hydrate(App, document.getElementById('app')); // Conflicts!
```

### **3. Use Reactive State for Client-Only Features**
```javascript
// ✅ Good: Reactive state for UI interactions
import { observable } from '@coherent.js/state';

const sidebarOpen = observable(false); // Client-only UI state

// ✅ Good: SSR state for data
import { withState } from '@coherent.js/core';

const Page = withState({ products: [] })(({ state }) => {
  // Rendered on server
});
```

### **4. Forms: SSR + Hydration (No Duplication!)**
```javascript
// ✅ Good: Build form once on server, hydrate on client
// SERVER
import { createFormBuilder } from '@coherent.js/forms';

const form = createFormBuilder()
  .field('email', { validators: ['email', 'required'] });
const html = render(form.buildForm());
// Renders: <input data-validators="email,required" required />

// CLIENT
import { hydrateForm } from '@coherent.js/forms';

hydrateForm('form'); // Reads data-validators, attaches behavior

// ❌ Bad: Defining form twice (duplication!)
// SERVER: createFormBuilder().field('email', ...)
// CLIENT: createFormBuilder({ fields: { email: ... } }) // Why repeat this?
```

### **5. Validate on Both Server and Client (Same Rules)**
```javascript
// Shared validators
import { validators } from '@coherent.js/forms';

// Server (REQUIRED for security)
app.post('/api/form', (req, res) => {
  const { valid, errors } = validators.validate(req.body, {
    email: ['required', 'email']
  });
});

// Client (OPTIONAL for UX) - same validators automatically applied via hydration
hydrateForm('form'); // Uses validators from HTML metadata
```

## 📝 Forms: Complete SSR + Hydration Example

### The Right Way (No Duplication)

```javascript
// ============================================
// SERVER: Build form with validation metadata
// ============================================
import { createFormBuilder, validators } from '@coherent.js/forms';

app.get('/contact', (req, res) => {
  const contactForm = createFormBuilder({ name: 'contact' })
    .field('name', {
      label: 'Full Name',
      required: true,
      validators: ['required', 'minLength:3']
    })
    .field('email', {
      label: 'Email',
      type: 'email',
      required: true,
      validators: ['required', 'email']
    })
    .field('message', {
      label: 'Message',
      type: 'textarea',
      required: true,
      validators: ['required', 'minLength:10']
    });

  // Renders HTML with validation metadata embedded:
  // <input name="name"
  //        data-validators="required,minLength:3"
  //        required
  //        data-required="true" />
  const html = render({
    div: { children: [contactForm.buildForm()] }
  });

  res.send(wrapHTML(html, '/bundle.js'));
});

// Server-side validation (REQUIRED - never trust client)
app.post('/contact', express.json(), async (req, res) => {
  const { valid, errors } = validators.validate(req.body, {
    name: ['required', 'minLength:3'],
    email: ['required', 'email'],
    message: ['required', 'minLength:10']
  });

  if (!valid) {
    return res.status(400).json({ errors });
  }

  await sendContactEmail(req.body);
  res.json({ success: true });
});

// ============================================
// CLIENT: Hydrate server-rendered form
// ============================================
import { hydrateForm } from '@coherent.js/forms';

// Reads validation metadata from HTML and attaches behavior
const contactForm = hydrateForm('form[name="contact"]', {
  validateOnBlur: true,
  debounce: 300,
  async onSubmit(data) {
    const response = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const { errors } = await response.json();
      // Errors automatically displayed by hydration
      return false;
    }

    alert('Message sent!');
    contactForm.reset();
  }
});
```

**Key Benefits:**
- ✅ **No duplication** - Form defined once on server
- ✅ **Progressive enhancement** - Works without JS
- ✅ **Shared validation** - Same rules on server and client
- ✅ **SEO-friendly** - Form HTML in initial response
- ✅ **Better UX** - Client-side validation without full page reload

## 📦 Package Usage Guide

| Package | Server (SSR) | Client (Hydration) | Client (Enhancement) |
|---------|--------------|-------------------|---------------------|
| **@coherent.js/core** | ✅ Rendering | ❌ | ❌ |
| **@coherent.js/client** | ❌ | ✅ Hydration | ✅ Router, HMR |
| **@coherent.js/state** | ✅ Context API | ❌ | ✅ Reactive state |
| **@coherent.js/forms** | ✅ Form builder | ✅ Form hydration | ✅ Client validation |
| **@coherent.js/integrations/express** | ✅ Integration | ❌ | ❌ |

## 🚀 Deployment

### **Production Build**
```bash
# Build server bundle
npm run build:server

# Build client bundle
npm run build:client

# Deploy to production
npm run deploy
```

### **Environment Variables**
```bash
# Server
NODE_ENV=production
PORT=3000

# Client bundle path
CLIENT_BUNDLE_URL=/static/bundle.js
```

## 🎓 Learning Path

1. **Start with SSR** - Learn `@coherent.js/core` rendering
2. **Add Hydration** - Make it interactive with `@coherent.js/client`
3. **Enable Routing** - Add SPA navigation with client router
4. **Add Reactivity** - Enhance UX with `@coherent.js/state`
5. **Optimize** - Prefetch routes, cache data, monitor performance

## 📚 Next Steps

- [Server-Side Rendering Guide](../server/ssr.md)
- [Client-Side Hydration](../client/hydration.md)
- [Client Router](../client/router.md)
- [Reactive State Management](../components/state.md)
- [Full-Stack Forms](../packages/forms.md)

---

**Coherent.js gives you the best of both worlds**: Fast initial loads with SEO (SSR) + Instant navigation and reactivity (SPA). Build modern full-stack applications with a single framework! 🚀
