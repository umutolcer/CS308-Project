const express = require('express');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Only customers place orders; staff accounts cannot buy
router.post('/', authenticate, authorize('customer'), orderController.placeOrder);

module.exports = router;
