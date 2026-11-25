import { isOrderStatus } from '../utils/orderStatus';
import { apiGet, apiPatch } from './client';

/*
 * Delivery list for product managers (SCRUM-61, backend in SCRUM-60).
 *
 * GET /api/deliveries -> { deliveries: [delivery] }, one delivery per product in an order:
 *   { deliveryId, orderId, customerId, productId, productName, quantity,
 *     totalPrice, deliveryAddress, status, createdAt }
 * PATCH /api/orders/:orderId/status with { status } -> { order: { _id, status } }
 */

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

function isDelivery(delivery) {
  return Boolean(delivery) &&
    isNonEmptyString(delivery.deliveryId) &&
    isNonEmptyString(delivery.orderId) &&
    isNonEmptyString(delivery.customerId) &&
    isNonEmptyString(delivery.productId) &&
    Number.isSafeInteger(delivery.quantity) && delivery.quantity > 0 &&
    Number.isFinite(delivery.totalPrice) && delivery.totalPrice >= 0 &&
    isNonEmptyString(delivery.deliveryAddress) &&
    isOrderStatus(delivery.status);
}

// Reject a malformed response instead of showing a half-empty table
export async function getDeliveries() {
  const result = await apiGet('/deliveries');
  if (!result || !Array.isArray(result.deliveries) || !result.deliveries.every(isDelivery)) {
    throw new Error('The server returned an invalid delivery list');
  }
  return result.deliveries;
}

export async function updateOrderStatus(orderId, status) {
  if (!isNonEmptyString(orderId)) {
    throw new Error('Order id is required');
  }
  if (!isOrderStatus(status)) {
    throw new Error(`Unknown order status: ${status}`);
  }

  const result = await apiPatch(`/orders/${encodeURIComponent(orderId)}/status`, { status });
  if (!result || !result.order || result.order.status !== status) {
    throw new Error('The server did not confirm the new status');
  }
  return result.order;
}
