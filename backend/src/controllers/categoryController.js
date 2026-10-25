const Category = require('../models/Category');

// GET /api/categories
async function getCategories(req, res) {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
}

module.exports = { getCategories };
