const { increaseStockForOrder } = require('../../../src/services/stockService');

describe('increaseStockForOrder', () => {
  test('adds the ordered quantity back to every product', async () => {
    // Arrange
    const ProductModel = { updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    const items = [
      { productId: 'a', quantity: 2 },
      { productId: 'b', quantity: 1 },
    ];

    // Act
    await increaseStockForOrder(items, { ProductModel });

    // Assert
    expect(ProductModel.updateOne).toHaveBeenCalledTimes(2);
    expect(ProductModel.updateOne).toHaveBeenCalledWith({ _id: 'a' }, { $inc: { quantityInStock: 2 } });
    expect(ProductModel.updateOne).toHaveBeenCalledWith({ _id: 'b' }, { $inc: { quantityInStock: 1 } });
  });

  test('does nothing for an empty list', async () => {
    // Arrange
    const ProductModel = { updateOne: jest.fn() };

    // Act
    await increaseStockForOrder([], { ProductModel });

    // Assert
    expect(ProductModel.updateOne).not.toHaveBeenCalled();
  });

  test('passes on a database error', async () => {
    // Arrange
    const ProductModel = { updateOne: jest.fn().mockRejectedValue(new Error('db down')) };

    // Act + Assert
    await expect(
      increaseStockForOrder([{ productId: 'a', quantity: 1 }], { ProductModel })
    ).rejects.toThrow('db down');
  });
});
