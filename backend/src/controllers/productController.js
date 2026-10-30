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

// GET /api/products/:id
async function getProductById(req, res) {
  const { id } = req.params;

  // Mongoose would throw a CastError (500) for a malformed id
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  const product = await Product.findById(id)
    .select('-cost')
    .populate('category', 'name');

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
}

module.exports = { getProducts, getProductById };
