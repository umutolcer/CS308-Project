const mongoose = require('mongoose');
const Order = require('../models/Order');
const { OrderError } = require('./orderService');

/*
 * The orders of one customer, newest first, for the order history page.
 *
 * The filter always uses the id from the verified token, never an id from the
 * request, so a customer can only ever see their own orders. The transaction id
 * of the payment is left out; only the last 4 card digits are shown.
 *
 * Dependencies can be replaced by unit-test mocks.
 */
async function listMyOrders(userId, { OrderModel = Order } = {}) {
  // isValidObjectId would also accept a number, so check for an ObjectId or a 24 character hex text
  if (!mongoose.isObjectIdOrHexString(userId)) {
    throw new OrderError('Invalid or expired token', 401);
  }

  const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).lean();

  return orders.map((order) => ({
    _id: String(order._id),
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productId: String(item.product),
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    totalPrice: order.totalPrice,
    status: order.status,
    deliveryAddress: order.deliveryAddress,
    cardLast4: order.payment.cardLast4,
  }));
}

module.exports = { listMyOrders };
