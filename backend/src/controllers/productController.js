const mongoose = require('mongoose');
const Product = require('../models/Product');
const escapeRegex = require('../utils/escapeRegex');

const MAX_SEARCH_LENGTH = 100;

// Allowed values of ?sort=. _id breaks ties so equal prices or view counts
// always come back in the same order.
const SORT_OPTIONS = {
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  popularity: { viewCount: -1, _id: 1 },
};

// GET /api/products?category=<id>&search=<text>&sort=<price_asc|price_desc|popularity>
async function getProducts(req, res) {
  const { category, search, sort } = req.query;
  const filter = {};

  // Object.hasOwn so values like "constructor" are not treated as sort options
  if (sort !== undefined && !(typeof sort === 'string' && Object.hasOwn(SORT_OPTIONS, sort))) {
    return res.status(400).json({
      error: 'Sort must be one of: price_asc, price_desc, popularity',
    });
  }

  if (category !== undefined) {
    // Mongoose would throw a CastError (500) for a malformed id
    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ error: 'Invalid category id' });
    }
    filter.category = category;
  }

  if (search !== undefined) {
    // "?search=a&search=b" arrives as an array, which is not a valid search
    if (typeof search !== 'string') {
      return res.status(400).json({ error: 'Invalid search text' });
    }

    const text = search.trim();
    if (text.length > MAX_SEARCH_LENGTH) {
      return res.status(400).json({
        error: `Search text must be at most ${MAX_SEARCH_LENGTH} characters`,
      });
    }

    // An empty search returns every product, like no search at all
    if (text) {
      // Case-insensitive partial match on name or description.
      // Out-of-stock products are not filtered out (requirement 7).
      const pattern = { $regex: escapeRegex(text), $options: 'i' };
      filter.$or = [{ name: pattern }, { description: pattern }];
    }
  }

  // Cost is internal and must not reach customers
  let query = Product.find(filter).select('-cost');
  if (sort !== undefined) {
    query = query.sort(SORT_OPTIONS[sort]);
  }
  const products = await query.populate('category', 'name');

  res.json(products);
}

// GET /api/products/:id
async function getProductById(req, res) {
  const { id } = req.params;

  // Mongoose would throw a CastError (500) for a malformed id
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  // Opening the product detail counts as one view (popularity).
  // $inc is atomic, so views from users at the same time are not lost.
  const product = await Product.findByIdAndUpdate(
    id,
    { $inc: { viewCount: 1 } },
    { new: true }
  )
    .select('-cost')
    .populate('category', 'name');

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
}

module.exports = { getProducts, getProductById };
