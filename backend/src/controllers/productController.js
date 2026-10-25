const mongoose = require('mongoose');
const Product = require('../models/Product');

// GET /api/products?category=<id>
async function getProducts(req, res) {
  const { category } = req.query;
  const filter = {};

  if (category !== undefined) {
    // Mongoose would throw a CastError (500) for a malformed id
    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ error: 'Invalid category id' });
    }
    filter.category = category;
  }

  // Cost is internal and must not reach customers
  const products = await Product.find(filter)
    .select('-cost')
    .populate('category', 'name');

  res.json(products);
}

module.exports = { getProducts };
