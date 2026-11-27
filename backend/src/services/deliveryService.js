const mongoose = require('mongoose');
const Order = require('../models/Order');
const { ORDER_STATUSES } = require('../models/Order');
const { OrderError } = require('./orderService');

// An order moves forward one step at a time and never goes back
const NEXT_STATUS = { processing: 'in-transit', 'in-transit': 'delivered' };

const roundMoney = (value) => Math.round(value * 100) / 100;

/*
 * The delivery list of the product manager: one row per product in an order.
 *
 * A row has the delivery id, the customer id, the product id, the quantity, the
 * total price of that line, the delivery address and the status of the order
 * ("delivered" means the delivery is completed). The newest orders come first.
 * An optional status filters the list.
 *
 * Dependencies can be replaced by unit-test mocks.
 */
async function listDeliveries({ status } = {}, { OrderModel = Order } = {}) {
  if (status !== undefined && !ORDER_STATUSES.includes(status)) {
    throw new OrderError(`Status must be one of: ${ORDER_STATUSES.join(', ')}`, 400);
  }

  const orders = await OrderModel.find(status ? { status } : {})
    .sort({ createdAt: -1 })
    .lean();

  return orders.flatMap((order) =>
    order.items.map((item) => ({
      // An order never has the same product twice, so this is unique
      deliveryId: `${order._id}-${item.product}`,
      orderId: String(order._id),
      customerId: String(order.user),
      productId: String(item.product),
      productName: item.name,
      quantity: item.quantity,
      totalPrice: roundMoney(item.unitPrice * item.quantity),
      deliveryAddress: order.deliveryAddress,
      status: order.status,
      createdAt: order.createdAt,
    }))
  );
}

/*
 * Moves an order to its next status. Only the next step is allowed
 * (processing -> in-transit -> delivered), so a double click or two product
 * managers acting at the same time cannot skip or repeat a step: the update only
 * happens if the order still has the status that was checked.
 */
async function updateOrderStatus(orderId, status, { OrderModel = Order } = {}) {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new OrderError('Invalid order id', 400);
  }
  if (!ORDER_STATUSES.includes(status)) {
    throw new OrderError(`Status must be one of: ${ORDER_STATUSES.join(', ')}`, 400);
  }

  const order = await OrderModel.findById(orderId).select('status').lean();
  if (!order) {
    throw new OrderError('Order not found', 404);
  }

  if (NEXT_STATUS[order.status] !== status) {
    throw new OrderError(`Cannot change an order from ${order.status} to ${status}`, 409);
  }

  const updated = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: order.status },
    { $set: { status } },
    { new: true }
  ).select('status');

  if (!updated) {
    throw new OrderError('The order status changed in the meantime, please try again', 409);
  }

  return { _id: String(updated._id), status: updated.status };
}

module.exports = { listDeliveries, updateOrderStatus, NEXT_STATUS };
