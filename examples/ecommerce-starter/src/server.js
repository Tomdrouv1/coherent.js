import express from 'express';
import { render } from '@coherent.js/core';
import { Layout } from './components/Layout.js';
import { ProductList } from './components/ProductList.js';
import { ProductDetail } from './components/ProductDetail.js';
import { Cart } from './components/Cart.js';
import { products, getProduct } from './data/products.js';

const app = express();
app.use(express.urlencoded({ extended: false }));

// In-memory cart (per-server session for simplicity)
let cart = [];

// Product listing
app.get('/', (_req, res) => {
  const page = Layout({
    title: 'All Products',
    children: [ProductList({ products })],
  });
  res.type('html').send(render(page));
});

// Product detail
app.get('/product/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).type('html').send(render(Layout({ title: 'Not Found', children: [{ p: { text: 'Product not found.' } }] })));
  const page = Layout({
    title: product.name,
    children: [ProductDetail({ product })],
  });
  res.type('html').send(render(page));
});

// Add to cart
app.post('/cart/add', (req, res) => {
  const { productId } = req.body;
  const existing = cart.find((i) => i.productId === productId);
  if (existing) existing.qty += 1;
  else cart.push({ productId, qty: 1 });
  res.redirect('/cart');
});

// Cart page
app.get('/cart', (_req, res) => {
  const page = Layout({
    title: 'Cart',
    children: [Cart({ items: cart, products })],
  });
  res.type('html').send(render(page));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Coherent Store running at http://localhost:${PORT}`);
});
