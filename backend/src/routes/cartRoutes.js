const express = require('express');
const authenticate = require('../middleware/auth');
const { getCart, updateCart, mergeCart } = require('../controllers/cartController');

const router = express.Router();

// Protect every cart endpoint with the existing HS256 JWT middleware.
router.use(authenticate);
router.get('/', getCart);
router.put('/', updateCart);
router.post('/merge', mergeCart);

module.exports = router;
