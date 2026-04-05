export const products = [
  {
    id: 'wireless-headphones',
    name: 'Wireless Headphones Pro',
    price: 79.99,
    image: 'https://picsum.photos/seed/headphones/400/400',
    category: 'Electronics',
    brand: 'AudioTech',
    description: 'Premium wireless headphones with active noise cancellation and 30-hour battery life.',
    inStock: true,
  },
  {
    id: 'leather-backpack',
    name: 'Classic Leather Backpack',
    price: 129.99,
    image: 'https://picsum.photos/seed/backpack/400/400',
    category: 'Bags',
    brand: 'UrbanCarry',
    description: 'Handcrafted full-grain leather backpack with padded laptop compartment.',
    inStock: true,
  },
  {
    id: 'running-shoes',
    name: 'Trail Running Shoes',
    price: 94.50,
    image: 'https://picsum.photos/seed/shoes/400/400',
    category: 'Footwear',
    brand: 'SwiftStep',
    description: 'Lightweight trail runners with responsive cushioning and grippy outsole.',
    inStock: true,
  },
  {
    id: 'smart-watch',
    name: 'Smart Watch Series 5',
    price: 249.00,
    image: 'https://picsum.photos/seed/watch/400/400',
    category: 'Electronics',
    brand: 'TechWear',
    description: 'Fitness tracking, heart rate monitoring, and always-on display in a sleek design.',
    inStock: false,
  },
  {
    id: 'ceramic-mug',
    name: 'Handmade Ceramic Mug',
    price: 24.00,
    image: 'https://picsum.photos/seed/mug/400/400',
    category: 'Home',
    brand: 'CraftHouse',
    description: 'Artisan-crafted 12oz ceramic mug with a comfortable handle and matte glaze.',
    inStock: true,
  },
];

export function getProduct(id) {
  return products.find((p) => p.id === id) || null;
}
