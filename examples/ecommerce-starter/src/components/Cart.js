export const Cart = ({ items = [], products = [] }) => {
  const resolved = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...product, qty: item.qty } : null;
    })
    .filter(Boolean);

  const total = resolved.reduce((sum, i) => sum + i.price * i.qty, 0);

  return {
    div: {
      children: [
        { h1: { text: 'Shopping Cart' } },
        resolved.length === 0
          ? { p: { text: 'Your cart is empty.' } }
          : {
              div: {
                children: [
                  {
                    ul: {
                      className: 'cart-items',
                      children: resolved.map((item) => ({
                        li: {
                          className: 'cart-item',
                          children: [
                            { span: { text: `${item.name} x${item.qty}` } },
                            { span: { className: 'price', text: `$${(item.price * item.qty).toFixed(2)}` } },
                          ],
                        },
                      })),
                    },
                  },
                  { p: { className: 'cart-total', text: `Total: $${total.toFixed(2)}` } },
                ],
              },
            },
        { p: { children: [{ a: { href: '/', text: 'Continue shopping' } }] } },
      ],
    },
  };
};
