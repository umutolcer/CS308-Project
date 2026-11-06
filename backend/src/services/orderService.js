const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mockBank = require('./mockBank');
const { validateCard } = require('../utils/validateCard');

const MAX_LINES_PER_ORDER = 50;

// An error that carries the HTTP status the controller should answer with
class OrderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
  }
}

// Money is stored with 2 decimals; rounding avoids results like 0.1 + 0.2
const roundMoney = (value) => Math.round(value * 100) / 100;

// Checks the shape of the items and merges lines of the same product
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderError('Order must contain at least one item', 400);
  }
  if (items.length > MAX_LINES_PER_ORDER) {
    throw new OrderError(`Order cannot contain more than ${MAX_LINES_PER_ORDER} items`, 400);
  }

  const quantities = new Map();
  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.productId)) {
      throw new OrderError('Every item needs a valid product id', 400);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderError('Quantity must be a whole number of at least 1', 400);
    }
    const id = String(item.productId);
    quantities.set(id, (quantities.get(id) || 0) + item.quantity);
  }
  return quantities;
}

/*
 * Validates the order, charges the mock bank and saves the order as "processing".
 *
 * Order of the steps matters: everything that can be rejected (items, address,
 * card, products, stock) is checked before the bank is called, so a customer is
 * never charged for an order that cannot be saved.
 *
 * The stock is only checked here, not decreased. Decreasing it atomically is the
 * separate stock task (S10.1) and plugs in right before the bank is charged.
 *
 * Dependencies can be replaced by unit-test mocks.
 */
async function createOrder(
  { user, items, deliveryAddress, card },
  { ProductModel = Product, OrderModel = Order, bank = mockBank, now = new Date() } = {}
) {
  const quantities = normalizeItems(items);

  const address = (deliveryAddress ?? user.homeAddress ?? '').toString().trim();
  if (!address) {
    throw new OrderError('Delivery address is required', 400);
  }

  const cardError = validateCard(card, now);
  if (cardError) {
    throw new OrderError(cardError, 400);
  }

  const products = await ProductModel.find({ _id: { $in: [...quantities.keys()] } });
  const byId = new Map(products.map((product) => [String(product._id), product]));

  const lines = [];
  for (const [id, quantity] of quantities) {
    const product = byId.get(id);
    if (!product) {
      throw new OrderError('One of the products was not found', 404);
    }
    if (product.quantityInStock < quantity) {
      throw new OrderError(`Not enough stock for ${product.name}`, 409);
    }
    // Name and price are copied so later changes never alter this order
    lines.push({ product: product._id, name: product.name, unitPrice: product.price, quantity });
  }

  const totalPrice = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));

  const payment = await bank.charge({ cardNumber: card.number, amount: totalPrice });
  if (!payment.approved) {
    throw new OrderError(payment.reason || 'Payment was declined', 402);
  }

  // Only the last 4 digits and the transaction id are kept; the card number and
  // the CVV are not passed on past this point
  return OrderModel.create({
    user: user._id,
    items: lines,
    totalPrice,
    deliveryAddress: address,
    payment: { cardLast4: payment.cardLast4, transactionId: payment.transactionId },
  });
}

module.exports = { createOrder, OrderError };
