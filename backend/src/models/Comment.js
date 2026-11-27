const mongoose = require('mongoose');

// New comments start as "pending" and are only shown on the product page
// after a product manager approves them.
const COMMENT_STATUSES = ['pending', 'approved', 'rejected'];
const MAX_COMMENT_LENGTH = 500;

const commentSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required'],
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },

        // Stored as plain text. The frontend must render it as text, never as HTML.
        text: {
            type: String,
            required: [true, 'Comment text is required'],
            trim: true,
            maxlength: [MAX_COMMENT_LENGTH, `Comment must be at most ${MAX_COMMENT_LENGTH} characters`],
        },

        status: {
            type: String,
            enum: {
                values: COMMENT_STATUSES,
                message: 'Status must be one of: ' + COMMENT_STATUSES.join(', '),
            },
            default: 'pending',
        },
    },
    { timestamps: true }
);

// Speeds up "approved comments of a product" and "all pending comments"
commentSchema.index({ product: 1, status: 1, createdAt: -1 });
commentSchema.index({ status: 1, createdAt: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
module.exports.COMMENT_STATUSES = COMMENT_STATUSES;
module.exports.MAX_COMMENT_LENGTH = MAX_COMMENT_LENGTH;
