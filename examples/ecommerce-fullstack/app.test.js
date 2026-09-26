/**
 * Boots the demo the way `node app.js` does and sends real requests.
 * app.js used to import `createAPI` from @coherent.js/api (it exports
 * `createRouter`) and `createCoherent` from @coherent.js/core (never
 * existed), so it crashed on load and never served anything.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { once } from 'node:events';
import { startServer } from './app.js';

let server;
let baseUrl;

beforeAll(async () => {
  server = startServer(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const postJson = (path, body) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

describe('e-commerce demo server', () => {
  it('renders the storefront page', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/html/);
    const html = await res.text();
    expect(html).toMatch(/^<!DOCTYPE html><html lang="en">/);
    expect(html).toContain('Product Catalog');
    expect(html).toContain('Coherent.js T-Shirt');
  });

  it('serves the products API and validates new products', async () => {
    const list = await fetch(`${baseUrl}/api/products`);
    expect(list.status).toBe(200);
    expect(list.headers.get('content-type')).toMatch(/^application\/json/);
    expect((await list.json()).map((product) => product.id)).toEqual([1, 2, 3, 4, 5]);

    const created = await postJson('/api/products', { name: 'Coherent Cap', price: 19 });
    expect(created.status).toBe(201);
    expect((await created.json()).product).toMatchObject({ name: 'Coherent Cap', price: 19, inStock: true });

    const invalid = await postJson('/api/products', { price: -1 });
    expect(invalid.status).toBe(400);
  });

  it('adds catalog products to the cart by id', async () => {
    const added = await postJson('/api/cart/add', { id: 2 });
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ total: 14.99, items: [{ id: 2, quantity: 1 }] });

    expect((await postJson('/api/cart/add', { id: 3 })).status).toBe(409); // out of stock
    expect((await postJson('/api/cart/add', { id: 999 })).status).toBe(404);

    const cart = await (await fetch(`${baseUrl}/api/cart`)).json();
    expect(cart.items).toHaveLength(1);

    // The server-rendered page shows the cart
    expect(await (await fetch(`${baseUrl}/`)).text()).toContain('Total: $14.99');
  });

  it('answers unknown pages with 404', async () => {
    expect((await fetch(`${baseUrl}/nope`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/nope`)).status).toBe(404);
  });
});
