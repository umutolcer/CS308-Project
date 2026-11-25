const express = require('express');
const deliveryController = require('../controllers/deliveryController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// The delivery list is for product managers, who also act as the delivery department
router.get('/', authenticate, authorize('product_manager'), deliveryController.getDeliveries);

module.exports = router;
