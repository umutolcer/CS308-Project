const Product = require('../models/Product');

// Decreases the stock of every ordered item ({ productId, quantity }).
// The stock check and the decrease are one atomic update, so two customers
// ordering the last item at the same time cannot both succeed.
// If a product is short, the ones already decreased are put back.
async function decreaseStockForOrder(items, { ProductModel = Product } = {}) {
  const decreased = [];

  for (const { productId, quantity } of items) {
    const result = await ProductModel.updateOne(
      { _id: productId, quantityInStock: { $gte: quantity } },
      { $inc: { quantityInStock: -quantity } }
    );

    if (result.modifiedCount !== 1) {
      await restoreStock(decreased, ProductModel);
      return { success: false, productId };
    }
    decreased.push({ productId, quantity });
  }

  return { success: true };
}

async function restoreStock(items, ProductModel) {
  for (const { productId, quantity } of items) {
    await ProductModel.updateOne({ _id: productId }, { $inc: { quantityInStock: quantity } });
  }
}

module.exports = { decreaseStockForOrder };
