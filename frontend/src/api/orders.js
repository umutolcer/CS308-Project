import { apiGet } from './client';

// GET /api/orders/mine answers with { orders: [...] }, newest first, for the logged-in user
export async function getMyOrders() {
  const data = await apiGet('/orders/mine');
  if (!data || !Array.isArray(data.orders)) {
    throw new Error('The server returned an invalid order list');
  }
  return data.orders;
}
