const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Rating = require('../models/Rating');
const { MIN_RATING, MAX_RATING } = require('../models/Rating');

// POST /api/products/:id/ratings
// Body: { value: 1-5 }
async function rateProduct(req, res) {
  const { id } = req.params;
  const userId = req.user.id;
  const { value } = req.body || {};

  // Mongoose would throw a CastError (500) for a malformed id
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  // typeof check so strings like "5" are rejected instead of being cast
  if (typeof value !== 'number' || !Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
    return res.status(400).json({
      error: `Rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}`,
    });
  }

  if (!(await Product.exists({ _id: id }))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Only customers who received the product may rate it
  const hasDelivered = await Order.exists({
    user: userId,
    status: 'delivered',
    'items.product': id,
  });
  if (!hasDelivered) {
    return res.status(403).json({
      error: 'You can only rate products from your delivered orders',
    });
  }

  let rating;
  try {
    rating = await Rating.create({ product: id, user: userId, value });
  } catch (err) {
    // Duplicate key on the { product, user } unique index
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already rated this product' });
    }
    throw err;
  }

  // One atomic update per product, so ratings sent at the same time are not
  // lost. The second stage sees the values set by the first.
  const product = await Product.findByIdAndUpdate(
    id,
    [
      {
        $set: {
          ratingSum: { $add: [{ $ifNull: ['$ratingSum', 0] }, value] },
          ratingCount: { $add: [{ $ifNull: ['$ratingCount', 0] }, 1] },
        },
      },
      {
        $set: {
          averageRating: { $round: [{ $divide: ['$ratingSum', '$ratingCount'] }, 2] },
        },
      },
    ],
    { new: true }
  ).select('averageRating ratingCount');

  // The product was deleted after the existence check above
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.status(201).json({
    rating,
    averageRating: product.averageRating,
    ratingCount: product.ratingCount,
  });
}

module.exports = { rateProduct };
