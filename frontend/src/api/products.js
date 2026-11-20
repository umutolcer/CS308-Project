import { apiGet } from './client';

// GET /api/products/:id answers with the product object directly
export function getProductById(id) {
  return apiGet(`/products/${encodeURIComponent(id)}`);
}