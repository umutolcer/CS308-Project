const mongoose = require('mongoose');

// Allowed order statuses. New orders start as "processing"; the product manager
// moves them to "in-transit" and "delivered" later.
const ORDER_STATUSES = ['processing', 'in-transit', 'delivered'];

/*
 * Each line stores a snapshot of the product name and price at purchase time,
 * so later price changes or discounts never change an existing order.
 */
const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required'],
        },

        name: {
            type: String,
            required: [true, 'Product name is required'],
        },

        unitPrice: {
            type: Number,
            required: [true, 'Unit price is required'],
            min: [0, 'Unit price cannot be negative'],
        },

        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1'],
            validate: {
                validator: Number.isInteger,
                message: 'Quantity must be an integer',
            },
        },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User is required'],
        },

        items: {
            type: [orderItemSchema],
            validate: {
                validator: (items) => items.length > 0,
                message: 'An order needs at least one item',
            },
        },

        totalPrice: {
            type: Number,
            required: [true, 'Total price is required'],
            min: [0, 'Total price cannot be negative'],
        },

        deliveryAddress: {
            type: String,
            required: [true, 'Delivery address is required'],
            trim: true,
        },

        status: {
            type: String,
            enum: {
                values: ORDER_STATUSES,
                message: 'Status must be one of: ' + ORDER_STATUSES.join(', '),
            },
            default: 'processing',
        },

        // Only the last 4 digits of the card are kept. The full card number and
        // the CVV are never stored anywhere.
        payment: {
            cardLast4: {
                type: String,
                required: [true, 'Card last 4 digits are required'],
                match: [/^\d{4}$/, 'Card last 4 digits must be 4 digits'],
            },
            transactionId: {
                type: String,
                required: [true, 'Transaction id is required'],
            },
        },
    },
    { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
