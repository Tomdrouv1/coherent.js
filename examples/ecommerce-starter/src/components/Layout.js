export const Layout = ({ title = 'Shop', children = [] }) => ({
  html: {
    lang: 'en',
    children: [
      {
        head: {
          children: [
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } },
            { title: { text: `${title} | Coherent Store` } },
            {
              style: {
                text: `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; line-height: 1.6; }
  a { color: #4f46e5; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .site-header { background: #1e1b4b; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .site-header a { color: white; }
  .site-header nav a { margin-left: 20px; }
  .container { max-width: 960px; margin: 0 auto; padding: 24px; }
  .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
  .product-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; transition: box-shadow .2s; }
  .product-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
  .product-card img { width: 100%; height: 200px; object-fit: cover; }
  .product-card-body { padding: 12px; }
  .product-card-body h3 { font-size: 1rem; margin-bottom: 4px; }
  .price { font-weight: 700; color: #059669; }
  .badge-out { background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: .75rem; }
  .detail { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
  .detail img { width: 100%; border-radius: 8px; }
  .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600; }
  .btn-primary { background: #4f46e5; color: white; }
  .btn-primary:hover { background: #4338ca; }
  .btn[disabled] { opacity: .5; cursor: not-allowed; }
  .cart-items { list-style: none; }
  .cart-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
  .cart-total { font-size: 1.25rem; font-weight: 700; margin-top: 16px; text-align: right; }
  footer { margin-top: 48px; padding: 24px; text-align: center; color: #6b7280; font-size: .875rem; border-top: 1px solid #e5e7eb; }
  @media (max-width: 640px) { .detail { grid-template-columns: 1fr; } }
`
              },
            },
          ],
        },
      },
      {
        body: {
          children: [
            {
              header: {
                className: 'site-header',
                children: [
                  { a: { href: '/', children: [{ strong: { text: 'Coherent Store' } }] } },
                  {
                    nav: {
                      children: [
                        { a: { href: '/', text: 'Products' } },
                        { a: { href: '/cart', text: 'Cart' } },
                      ],
                    },
                  },
                ],
              },
            },
            { main: { className: 'container', children } },
            {
              footer: {
                children: [
                  { p: { text: 'Built with Coherent.js -- ecommerce starter example' } },
                ],
              },
            },
          ],
        },
      },
    ],
  },
});
