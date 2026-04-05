const ProductCard = (product) => ({
  div: {
    className: 'product-card',
    children: [
      { img: { src: product.image, alt: product.name } },
      {
        div: {
          className: 'product-card-body',
          children: [
            { h3: { children: [{ a: { href: `/product/${product.id}`, text: product.name } }] } },
            { p: { className: 'price', text: `$${product.price.toFixed(2)}` } },
            !product.inStock
              ? { span: { className: 'badge-out', text: 'Out of stock' } }
              : null,
          ].filter(Boolean),
        },
      },
    ],
  },
});

export const ProductList = ({ products = [] }) => ({
  div: {
    children: [
      { h1: { text: 'All Products' } },
      {
        div: {
          className: 'product-grid',
          children: products.map((p) => ProductCard(p)),
        },
      },
    ],
  },
});
