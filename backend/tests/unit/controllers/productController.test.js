const Product = require('../../../src/models/Product');
const {
  getProducts,
  getProductById,
} = require('../../../src/controllers/productController');

jest.mock('../../../src/models/Product', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

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

// Mimics the Product.findById(...).select(...).populate(...) query chain
function mockFindByIdResult(result) {
  const query = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue(result),
  };
  Product.findById.mockReturnValue(query);
  return query;
}

const CATEGORY_ID = '671a00000000000000000001';
const PRODUCT_ID = '672b00000000000000000001';

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

describe('getProductById', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns the product for a known id', async () => {
    // Arrange
    const product = { _id: PRODUCT_ID, name: 'MacBook Air', quantityInStock: 10 };
    mockFindByIdResult(product);
    const res = mockResponse();

    // Act
    await getProductById({ params: { id: PRODUCT_ID } }, res);

    // Assert
    expect(Product.findById).toHaveBeenCalledWith(PRODUCT_ID);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(product);
  });

  test('returns an out-of-stock product with quantity 0', async () => {
    // Arrange
    const product = { _id: PRODUCT_ID, name: 'iPhone 16', quantityInStock: 0 };
    mockFindByIdResult(product);
    const res = mockResponse();

    // Act
    await getProductById({ params: { id: PRODUCT_ID } }, res);

    // Assert
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(product);
  });

  test('returns 404 for an unknown id', async () => {
    // Arrange
    mockFindByIdResult(null);
    const res = mockResponse();

    // Act
    await getProductById({ params: { id: PRODUCT_ID } }, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });

  test.each(['abc', '123', 'not-an-object-id'])(
    'rejects malformed product id %p with 400',
    async (id) => {
      // Arrange
      const res = mockResponse();

      // Act
      await getProductById({ params: { id } }, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid product id' });
      expect(Product.findById).not.toHaveBeenCalled();
    }
  );

  test('excludes cost from the returned product', async () => {
    // Arrange
    const query = mockFindByIdResult({ _id: PRODUCT_ID });

    // Act
    await getProductById({ params: { id: PRODUCT_ID } }, mockResponse());

    // Assert
    expect(query.select).toHaveBeenCalledWith('-cost');
  });

  test('includes category name in the returned product', async () => {
    // Arrange
    const query = mockFindByIdResult({ _id: PRODUCT_ID });

    // Act
    await getProductById({ params: { id: PRODUCT_ID } }, mockResponse());

    // Assert
    expect(query.populate).toHaveBeenCalledWith('category', 'name');
  });

  test('propagates database errors', async () => {
    // Arrange
    Product.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    // Act + Assert
    await expect(
      getProductById({ params: { id: PRODUCT_ID } }, mockResponse())
    ).rejects.toThrow('connection lost');
  });
});
