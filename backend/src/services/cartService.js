const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Throw ordinary errors with a status understood by the existing error handler.
function cartError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeItems(items) {
  if (!Array.isArray(items)) throw cartError('Items must be an array');
  const quantities = new Map();

  for (const item of items) {
    if (!item || typeof item.productId !== 'string' ||
        !mongoose.isObjectIdOrHexString(item.productId)) {
      throw cartError('Every item needs a valid product id');
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw cartError('Quantity must be a positive safe integer');
    }
    // Canonical IDs also combine uppercase/lowercase versions of the same ID.
    const id = item.productId.toLowerCase();
    const total = (quantities.get(id) || 0) + item.quantity;
    if (!Number.isSafeInteger(total)) throw cartError('Quantity is too large');
    quantities.set(id, total);
  }
  return quantities;
}

// Build a safe response using current DB values. Browser prices/stock are ignored.
// Stock is checked here, but reserving/decreasing stock belongs to checkout.
async function buildCart(quantities) {
  if (!quantities.size) return { items: [], itemCount: 0, total: 0 };
  const products = await Product.find({ _id: { $in: [...quantities.keys()] } })
    .select('_id name price imageUrl quantityInStock');
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const items = [];

  for (const [id, requested] of quantities) {
    const product = byId.get(id);
    // Stale guest carts can reference deleted products or products now sold out.
    if (!product || product.quantityInStock <= 0) continue;
    const quantity = Math.min(requested, product.quantityInStock);
    items.push({
      productId: id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantityInStock: product.quantityInStock,
      quantity,
    });
  }

  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100,
  };
}

function savedQuantities(cart) {
  return new Map((cart?.items || []).map((item) => [String(item.productId), item.quantity]));
}

async function getCart(user) {
  const cart = await Cart.findOne({ user });
  // Reading a cart does not create a document or change its stored contents.
  return buildCart(savedQuantities(cart));
}

async function writeCart(user, items, merge) {
  const incoming = normalizeItems(items);

  // Compare the version when saving: two simultaneous merges must not silently
  // overwrite one another. Retry from the latest cart after a version conflict.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await Cart.findOne({ user });
    const quantities = merge ? savedQuantities(current) : new Map();
    for (const [id, quantity] of incoming) {
      const combined = (quantities.get(id) || 0) + quantity;
      if (!Number.isSafeInteger(combined)) throw cartError('Quantity is too large');
      quantities.set(id, combined);
    }

    const result = await buildCart(quantities);
    const storedItems = result.items.map(({ productId, quantity }) => ({ productId, quantity }));
    if (!current) {
      try {
        await Cart.create({ user, items: storedItems });
        return result;
      } catch (err) {
        // The unique user index prevents two first writes creating two carts.
        if (err.code === 11000) continue;
        throw err;
      }
    }

    const updated = await Cart.findOneAndUpdate(
      { user, __v: current.__v },
      { $set: { items: storedItems }, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    );
    if (updated) return result;
  }
  throw cartError('Cart changed during this request. Please try again', 409);
}

module.exports = { getCart, writeCart };
