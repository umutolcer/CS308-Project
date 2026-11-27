const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Comment = require('../models/Comment');
const { MAX_COMMENT_LENGTH } = require('../models/Comment');

// Decisions a product manager can make on a pending comment
const REVIEW_STATUSES = ['approved', 'rejected'];

// POST /api/products/:id/comments
// Body: { text }
async function createComment(req, res) {
  const { id } = req.params;
  const { text } = req.body || {};

  // Mongoose would throw a CastError (500) for a malformed id
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }
  if (text.trim().length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({
      error: `Comment must be at most ${MAX_COMMENT_LENGTH} characters`,
    });
  }

  if (!(await Product.exists({ _id: id }))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Only customers who received the product may comment on it
  const hasDelivered = await Order.exists({
    user: req.user.id,
    status: 'delivered',
    'items.product': id,
  });
  if (!hasDelivered) {
    return res.status(403).json({
      error: 'You can only comment on products from your delivered orders',
    });
  }

  // The status is never read from the request, so every new comment waits
  // for product manager approval
  const comment = await Comment.create({ product: id, user: req.user.id, text });

  return res.status(201).json({ comment });
}

// GET /api/products/:id/comments
// Public. Only approved comments, newest first.
async function getApprovedComments(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  if (!(await Product.exists({ _id: id }))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Only the author's name is shown; email and address stay private
  const comments = await Comment.find({ product: id, status: 'approved' })
    .sort({ createdAt: -1 })
    .populate('user', 'name');

  return res.json(comments);
}

// GET /api/comments/pending
// Product managers only. Oldest first, so comments are reviewed in order.
async function getPendingComments(req, res) {
  const comments = await Comment.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .populate('user', 'name')
    .populate('product', 'name');

  return res.json(comments);
}

// PATCH /api/comments/:id
// Product managers only. Body: { status: 'approved' | 'rejected' }
async function reviewComment(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid comment id' });
  }

  if (!REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: approved, rejected' });
  }

  // Matching on status: 'pending' makes the review atomic, so two managers
  // cannot both decide on the same comment
  const comment = await Comment.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status } },
    { new: true }
  );

  if (!comment) {
    // Tell "no such comment" apart from "already reviewed"
    if (await Comment.exists({ _id: id })) {
      return res.status(409).json({ error: 'This comment has already been reviewed' });
    }
    return res.status(404).json({ error: 'Comment not found' });
  }

  return res.json({ comment });
}

module.exports = {
  createComment,
  getApprovedComments,
  getPendingComments,
  reviewComment,
};
