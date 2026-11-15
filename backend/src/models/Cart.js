const mongoose = require('mongoose');

// A line refers to a product, not a client-supplied name, price or stock value.
const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isSafeInteger,
      message: 'Quantity must be a safe integer',
    },
  },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  // One saved cart per account. The owner always comes from the verified JWT.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: { type: [cartItemSchema], default: [] },
});

module.exports = mongoose.model('Cart', cartSchema);
