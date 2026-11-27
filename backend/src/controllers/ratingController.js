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

  // Rating again replaces the old rating. The upsert is atomic, and with
  // new: false it returns the previous rating (null if this is the first one),
  // which is needed to correct the product's rating sum.
  const filter = { product: id, user: userId };
  const update = { $set: { value } };
  const options = { upsert: true, new: false, runValidators: true };
  let previous;
  try {
    previous = await Rating.findOneAndUpdate(filter, update, options);
  } catch (err) {
    // Two first ratings from the same customer at the same moment can both try
    // to insert; the loser hits the unique index. Retrying updates the winner.
    if (err.code !== 11000) throw err;
    previous = await Rating.findOneAndUpdate(filter, update, options);
  }

  const isNew = !previous;
  const sumChange = value - (isNew ? 0 : previous.value);
  const countChange = isNew ? 1 : 0;

  // One atomic update per product, so ratings sent at the same time are not
  // lost. The second stage sees the values set by the first.
  const product = await Product.findByIdAndUpdate(
    id,
    [
      {
        $set: {
          ratingSum: { $add: [{ $ifNull: ['$ratingSum', 0] }, sumChange] },
          ratingCount: { $add: [{ $ifNull: ['$ratingCount', 0] }, countChange] },
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

  // 201 for a first rating, 200 when an existing rating was replaced
  return res.status(isNew ? 201 : 200).json({
    rating: { product: id, user: userId, value },
    averageRating: product.averageRating,
    ratingCount: product.ratingCount,
  });
}

module.exports = { rateProduct };
