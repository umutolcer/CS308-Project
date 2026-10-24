const mongoose = require('mongoose');

/*
 * Category and Product relationship
 *
 * Categories are stored as separate MongoDB documents:
 *
 * Category document:
 * {
 *   "_id": "671a...",
 *   "name": "Laptops"
 * }
 *
 * Products store the Category document's _id instead of repeating
 * the category name:
 *
 * Product document:
 * {
 *   "name": "MacBook Air",
 *   "category": "671a..."
 * }
 *
 * This keeps category data consistent and allows multiple products
 * to reference the same category document.
 */

// Categories are stored as separate documents so every product can reference
// the same category instead of repeating category information.
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],

        // `unique` creates a MongoDB unique index. It is not a normal Mongoose
        // validator, so duplicate-name behavior requires a database-level test.
        unique: true,

        // Remove accidental whitespace such as "  Laptops  " before saving.
        trim: true,
    },
});

// Exporting the model allows product schemas, seed scripts and API routes
// to create and query category documents.
module.exports = mongoose.model('Category', categorySchema);