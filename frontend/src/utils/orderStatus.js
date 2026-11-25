// Order statuses in the order they happen. Must match ORDER_STATUSES in
// backend/src/models/Order.js. Shared by the order history and delivery pages.
export const ORDER_STATUSES = ['processing', 'in-transit', 'delivered'];

const STATUS_LABELS = {
  processing: 'Processing',
  'in-transit': 'In transit',
  delivered: 'Delivered',
};

export function isOrderStatus(value) {
  return ORDER_STATUSES.includes(value);
}

// "in-transit" -> "In transit"; an unknown value is shown as it is
export function orderStatusLabel(status) {
  return STATUS_LABELS[status] ?? String(status);
}

// A delivery is completed once the order has been delivered
export function isDeliveryCompleted(status) {
  return status === 'delivered';
}

// The status an order moves to next, or null when it is already delivered
export function nextOrderStatus(status) {
  const index = ORDER_STATUSES.indexOf(status);
  if (index === -1 || index === ORDER_STATUSES.length - 1) return null;
  return ORDER_STATUSES[index + 1];
}
