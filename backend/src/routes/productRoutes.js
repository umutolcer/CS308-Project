const express = require('express');
const {
  getProducts,
  getProductById,
} = require('../controllers/productController');
const { rateProduct } = require('../controllers/ratingController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);

// Only customers rate products; the delivered-order check is in the controller
router.post('/:id/ratings', authenticate, authorize('customer'), rateProduct);

module.exports = router;
