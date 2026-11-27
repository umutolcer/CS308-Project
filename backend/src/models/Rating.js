const mongoose = require('mongoose');

const MIN_RATING = 1;
const MAX_RATING = 5;

/*
 * A customer's star rating for a product. Ratings are published immediately
 * (unlike comments, they need no product manager approval).
 */
const ratingSchema = new mongoose.Schema(
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

        value: {
            type: Number,
            required: [true, 'Rating value is required'],
            min: [MIN_RATING, `Rating must be between ${MIN_RATING} and ${MAX_RATING}`],
            max: [MAX_RATING, `Rating must be between ${MIN_RATING} and ${MAX_RATING}`],
            validate: {
                validator: Number.isInteger,
                message: 'Rating must be a whole number',
            },
        },
    },
    { timestamps: true }
);

// One rating per customer per product. The unique index also stops two
// requests sent at the same time from both being saved.
ratingSchema.index({ product: 1, user: 1 }, { unique: true });

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
module.exports.MIN_RATING = MIN_RATING;
module.exports.MAX_RATING = MAX_RATING;
