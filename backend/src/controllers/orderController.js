const User = require('../models/User');
const { createOrder, OrderError } = require('../services/orderService');
const { listMyOrders } = require('../services/myOrdersService');

// POST /api/orders
// Body: { items: [{ productId, quantity }], deliveryAddress?, card: { number, name, expiry, cvv } }
async function placeOrder(req, res) {
  // The token only holds the user id and role; the home address (the default
  // delivery address) comes from the database
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { items, deliveryAddress, card } = req.body || {};

  try {
    const order = await createOrder({ user, items, deliveryAddress, card });
    return res.status(201).json({ order });
  } catch (err) {
    // Expected problems (bad input, missing stock, declined payment) are answered
    // directly; anything else goes to the central error handler as a 500
    if (err instanceof OrderError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

// GET /api/orders/mine
// The orders of the logged-in user, newest first. The owner comes from the token only.
async function myOrders(req, res) {
  try {
    const orders = await listMyOrders(req.user.id);
    return res.json({ orders });
  } catch (err) {
    if (err instanceof OrderError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }
}

module.exports = { placeOrder, myOrders };
