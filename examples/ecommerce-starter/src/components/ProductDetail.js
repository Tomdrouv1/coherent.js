import { generateStructuredData } from '@coherent.js/seo';

export const ProductDetail = ({ product }) => {
  const structuredData = generateStructuredData('product', {
    name: product.name,
    description: product.description,
    image: product.image,
    brand: product.brand,
    offers: { price: product.price, priceCurrency: 'USD', availability: product.inStock ? 'InStock' : 'OutOfStock' },
  });

  return {
    div: {
      children: [
        { p: { children: [{ a: { href: '/', text: 'Back to products' } }] } },
        {
          div: {
            className: 'detail',
            children: [
              { img: { src: product.image, alt: product.name } },
              {
                div: {
                  children: [
                    { h1: { text: product.name } },
                    { p: { text: product.description } },
                    { p: { className: 'price', text: `$${product.price.toFixed(2)}` } },
                    { p: { text: `Brand: ${product.brand}` } },
                    product.inStock
                      ? {
                          form: {
                            method: 'POST',
                            action: '/cart/add',
                            children: [
                              { input: { type: 'hidden', name: 'productId', value: product.id } },
                              { button: { className: 'btn btn-primary', type: 'submit', text: 'Add to Cart' } },
                            ],
                          },
                        }
                      : { span: { className: 'badge-out', text: 'Out of stock' } },
                  ],
                },
              },
            ],
          },
        },
        structuredData,
      ].filter(Boolean),
    },
  };
};
