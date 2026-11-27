const express = require('express');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Only customers place orders; staff accounts cannot buy
router.post('/', authenticate, authorize('customer'), orderController.placeOrder);

// The order history of the logged-in user. There is no id in the URL, so nobody can ask for the orders of someone else
router.get('/mine', authenticate, orderController.myOrders);

module.exports = router;
