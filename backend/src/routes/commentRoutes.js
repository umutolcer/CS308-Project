const express = require('express');
const {
  createComment,
  getApprovedComments,
  getPendingComments,
  reviewComment,
} = require('../controllers/commentController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Mounted at /api/products/:id/comments. mergeParams makes :id available here.
const productCommentRouter = express.Router({ mergeParams: true });

productCommentRouter.get('/', getApprovedComments);
productCommentRouter.post('/', authenticate, authorize('customer'), createComment);

// Mounted at /api/comments. Moderation is for product managers only.
const commentRouter = express.Router();

commentRouter.get('/pending', authenticate, authorize('product_manager'), getPendingComments);
commentRouter.patch('/:id', authenticate, authorize('product_manager'), reviewComment);

module.exports = { productCommentRouter, commentRouter };
