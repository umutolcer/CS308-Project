const Product = require('../../../src/models/Product');
const { getProducts } = require('../../../src/controllers/productController');

jest.mock('../../../src/models/Product', () => ({ find: jest.fn() }));

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Mimics the Product.find(...).select(...).populate(...) query chain
function mockFindResult(result) {
  const query = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue(result),
  };
  Product.find.mockReturnValue(query);
  return query;
}

const CATEGORY_ID = '671a00000000000000000001';

describe('getProducts', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns all products when no category is given', async () => {
    // Arrange
    const products = [{ name: 'MacBook Air' }, { name: 'iPhone 16' }];
    mockFindResult(products);
    const res = mockResponse();

    // Act
    await getProducts({ query: {} }, res);

    // Assert
    expect(Product.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith(products);
  });

  test('filters products by category id', async () => {
    // Arrange
    const products = [{ name: 'MacBook Air', category: CATEGORY_ID }];
    mockFindResult(products);
    const res = mockResponse();

    // Act
    await getProducts({ query: { category: CATEGORY_ID } }, res);

    // Assert
    expect(Product.find).toHaveBeenCalledWith({ category: CATEGORY_ID });
    expect(res.json).toHaveBeenCalledWith(products);
  });

  test('returns empty list when category has no products', async () => {
    // Arrange
    mockFindResult([]);
    const res = mockResponse();

    // Act
    await getProducts({ query: { category: CATEGORY_ID } }, res);

    // Assert
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('excludes cost from returned products', async () => {
    // Arrange
    const query = mockFindResult([]);

    // Act
    await getProducts({ query: {} }, mockResponse());

    // Assert
    expect(query.select).toHaveBeenCalledWith('-cost');
  });

  test('includes category name in returned products', async () => {
    // Arrange
    const query = mockFindResult([]);

    // Act
    await getProducts({ query: {} }, mockResponse());

    // Assert
    expect(query.populate).toHaveBeenCalledWith('category', 'name');
  });

  test.each(['abc', '', '123'])(
    'rejects malformed category id %p with 400',
    async (category) => {
      // Arrange
      const res = mockResponse();

      // Act
      await getProducts({ query: { category } }, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid category id' });
      expect(Product.find).not.toHaveBeenCalled();
    }
  );

  test('propagates database errors', async () => {
    // Arrange
    Product.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    // Act + Assert
    await expect(getProducts({ query: {} }, mockResponse())).rejects.toThrow(
      'connection lost'
    );
  });
});
