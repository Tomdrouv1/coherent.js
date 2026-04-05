# Coherent.js Ecommerce Starter

A minimal server-side-rendered ecommerce example built with Coherent.js and Express.

## Features

- Product listing grid with responsive layout
- Product detail pages with Schema.org structured data (via `@coherent.js/seo`)
- Shopping cart with add-to-cart flow
- Shared layout component (header, nav, footer)
- Pure object-based Coherent.js components throughout

## Quick start

```bash
# From the repository root
pnpm install

# Run the example
pnpm --filter coherent-ecommerce-starter start
```

Then open http://localhost:3000.

## Project structure

```
src/
  server.js              Express server with SSR routes
  components/
    Layout.js            Shared page shell (head, header, footer)
    ProductList.js       Product grid component
    ProductDetail.js     Single product page with structured data
    Cart.js              Shopping cart component
  data/
    products.js          Sample product catalogue
```

## How it works

Every route renders a Coherent.js object tree through `render()` from `@coherent.js/core`, producing a full HTML string that Express sends to the browser. No client-side JavaScript is required -- the cart uses a plain HTML form POST.
