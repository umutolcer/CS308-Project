const mongoose = require('mongoose');

/*
 * Product and Category relationship
 *
 * MongoDB automatically creates the product's `_id`.
 * The `category` field stores the `_id` of a Category document.
 *
 * Example Product document:
 * {
 *   "_id": "672b...",
 *   "name": "MacBook Air",
 *   "model": "M4",
 *   "serialNumber": "MBA-M4-001",
 *   "description": "13-inch laptop",
 *   "imageUrl": "https://example.com/images/macbook-air.jpg",
 *   "quantityInStock": 10,
 *   "price": 44999,
 *   "warrantyStatus": true,
 *   "distributorInfo": "Apple Türkiye",
 *   "category": "671a...",
 *   "cost": 38000
 * }
 *
 * In this example, "671a..." is the `_id` of the "Laptops"
 * Category document. Multiple products can reference the same category.
 */

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
    },

    model: {
        type: String,
        required: [true, 'Product model is required'],
        trim: true,
    },

    serialNumber: {
        type: String,
        required: [true, 'Serial number is required'],

        // Serial numbers identify individual product records and must not repeat.
        // Duplicate enforcement happens through a MongoDB unique index.
        unique: true,
        trim: true,
    },

    description: {
        type: String,
        required: [true, 'Product description is required'],
        trim: true,
    },

    imageUrl: {
        // imageUrl is optional so the frontend can display a placeholder when absent.
        // seed data should still provide a real imageUrl for every product when possible.
        type: String,
        trim: true,
    },

    quantityInStock: {
        type: Number,
        required: [true, 'Quantity in stock is required'],

        // Stock cannot be negative because it represents available physical units.
        min: [0, 'Quantity in stock cannot be negative'],

        // A physical product count must be a whole number such as 0, 5 or 20.
        validate: {
            validator: Number.isInteger,
            message: 'Quantity in stock must be an integer',
        },
    },

    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },

    warrantyStatus: {
        // `true` means the product has warranty coverage; `false` means it does not.
        type: Boolean,
        required: [true, 'Warranty status is required'],
    },

    distributorInfo: {
        type: String,
        required: [true, 'Distributor information is required'],
        trim: true,
    },

    category: {
        // Store a Category ObjectId instead of repeating a category name.
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
    },

    cost: {
        // Cost is stored separately from the customer-facing selling price.
        // API responses must later avoid exposing this internal value to customers.
        type: Number,
        required: [true, 'Cost is required'],
        min: [0, 'Cost cannot be negative'],
    },
});

module.exports = mongoose.model('Product', productSchema);