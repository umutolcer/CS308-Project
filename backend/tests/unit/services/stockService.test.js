const { decreaseStockForOrder } = require('../../../src/services/stockService');

const ID_A = '672b00000000000000000001';
const ID_B = '672b00000000000000000002';

// In-memory Product model; each update is atomic like in MongoDB, and it
// yields first so concurrent calls interleave.
function fakeProductModel(initialStock) {
  const stock = new Map(Object.entries(initialStock));

  const updateOne = jest.fn(async (filter, update) => {
    await new Promise((resolve) => setImmediate(resolve));

    const current = stock.get(filter._id);
    const minimum = filter.quantityInStock?.$gte ?? -Infinity;
    if (current === undefined || current < minimum) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    stock.set(filter._id, current + update.$inc.quantityInStock);
    return { matchedCount: 1, modifiedCount: 1 };
  });

  return { updateOne, stockOf: (id) => stock.get(id) };
}

const order = (entries) => entries.map(([productId, quantity]) => ({ productId, quantity }));

describe('decreaseStockForOrder', () => {
  test('decreases the stock of each product by the ordered quantity', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 5, [ID_B]: 2 });

    // Act
    const result = await decreaseStockForOrder(order([[ID_A, 3], [ID_B, 1]]), { ProductModel });

    // Assert
    expect(result).toEqual({ success: true });
    expect(ProductModel.stockOf(ID_A)).toBe(2);
    expect(ProductModel.stockOf(ID_B)).toBe(1);
  });

  test('allows ordering exactly the quantity in stock', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 2 });

    // Act
    const result = await decreaseStockForOrder(order([[ID_A, 2]]), { ProductModel });

    // Assert
    expect(result.success).toBe(true);
    expect(ProductModel.stockOf(ID_A)).toBe(0);
  });

  test('rejects an order larger than the stock and changes nothing', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 2 });

    // Act
    const result = await decreaseStockForOrder(order([[ID_A, 3]]), { ProductModel });

    // Assert
    expect(result).toEqual({ success: false, productId: ID_A });
    expect(ProductModel.stockOf(ID_A)).toBe(2);
  });

  test('rejects an out-of-stock product', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 0 });

    // Act
    const result = await decreaseStockForOrder(order([[ID_A, 1]]), { ProductModel });

    // Assert
    expect(result.success).toBe(false);
    expect(ProductModel.stockOf(ID_A)).toBe(0);
  });

  test('puts back products already decreased when a later product is short', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 5, [ID_B]: 1 });

    // Act
    const result = await decreaseStockForOrder(order([[ID_A, 2], [ID_B, 3]]), { ProductModel });

    // Assert
    expect(result).toEqual({ success: false, productId: ID_B });
    expect(ProductModel.stockOf(ID_A)).toBe(5);
    expect(ProductModel.stockOf(ID_B)).toBe(1);
  });

  test('lets only one of two customers ordering the last item at the same time succeed', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 1 });

    // Act
    const results = await Promise.all([
      decreaseStockForOrder(order([[ID_A, 1]]), { ProductModel }),
      decreaseStockForOrder(order([[ID_A, 1]]), { ProductModel }),
    ]);

    // Assert
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(ProductModel.stockOf(ID_A)).toBe(0);
  });

  test('never oversells when many orders for a product arrive at the same time', async () => {
    // Arrange
    const ProductModel = fakeProductModel({ [ID_A]: 3, [ID_B]: 10 });
    const orders = Array.from({ length: 10 }, () => order([[ID_B, 1], [ID_A, 1]]));

    // Act
    const results = await Promise.all(orders.map((o) => decreaseStockForOrder(o, { ProductModel })));

    // Assert
    expect(results.filter((r) => r.success)).toHaveLength(3);
    expect(ProductModel.stockOf(ID_A)).toBe(0);
    expect(ProductModel.stockOf(ID_B)).toBe(7);
  });
});
