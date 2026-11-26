import { apiPost } from './client';

// POST /api/orders answers { order: { ... } }; the backend charges the mock bank
export async function placeOrder({ items, deliveryAddress, card }) {
  const { order } = await apiPost('/orders', {
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    deliveryAddress,
    card,
  });
  return order;
}