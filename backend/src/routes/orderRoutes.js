const express = require('express');
const orderController = require('../controllers/orderController');
const deliveryController = require('../controllers/deliveryController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Only customers place orders; staff accounts cannot buy
router.post('/', authenticate, authorize('customer'), orderController.placeOrder);

// Only product managers move an order along: processing -> in-transit -> delivered
router.patch('/:id/status', authenticate, authorize('product_manager'), deliveryController.changeOrderStatus);

module.exports = router;
