jest.mock('../../../src/models/Cart', () => ({
  findOne: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn(),
}));
jest.mock('../../../src/models/Product', () => ({ find: jest.fn() }));

const Cart = require('../../../src/models/Cart');
const Product = require('../../../src/models/Product');
const { getCart, writeCart } = require('../../../src/services/cartService');

const USER = '671a00000000000000000001';
const A = '672b00000000000000000001';
const B = '672b00000000000000000002';
const product = (id = A, overrides = {}) => ({
  _id: id, name: 'Headphones', price: 10.25, imageUrl: 'https://example.com/image.png',
  quantityInStock: 4, cost: 7, ...overrides,
});
const line = (quantity = 1, productId = A) => ({ productId, quantity });

let select;
beforeEach(() => {
  jest.resetAllMocks();
  Cart.findOne.mockResolvedValue(null);
  Cart.create.mockResolvedValue({});
  Cart.findOneAndUpdate.mockResolvedValue({});
  select = jest.fn().mockResolvedValue([product(), product(B)]);
  Product.find.mockReturnValue({ select });
});

describe('getCart', () => {
  test('returns an empty cart without creating a DB record', async () => {
    await expect(getCart(USER)).resolves.toEqual({ items: [], itemCount: 0, total: 0 });
    expect(Cart.findOne).toHaveBeenCalledWith({ user: USER });
    expect(Cart.create).not.toHaveBeenCalled();
    expect(Product.find).not.toHaveBeenCalled();
  });

  test('reads saved quantities and current product details without exposing cost', async () => {
    Cart.findOne.mockResolvedValue({ items: [line(2)] });
    const result = await getCart(USER);
    expect(result.itemCount).toBe(2);
    expect(result.total).toBe(20.5);
    expect(result.items[0]).toMatchObject({ productId: A, price: 10.25, quantity: 2 });
    expect(result.items[0]).not.toHaveProperty('cost');
    expect(select).toHaveBeenCalledWith('_id name price imageUrl quantityInStock');
  });

  test('caps the displayed quantity when stock decreased, without writing on GET', async () => {
    Cart.findOne.mockResolvedValue({ items: [line(10)] });
    const result = await getCart(USER);
    expect(result.items[0].quantity).toBe(4);
    expect(Cart.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('omits deleted and out-of-stock products', async () => {
    Cart.findOne.mockResolvedValue({ items: [line(1), line(1, B)] });
    select.mockResolvedValue([product(A, { quantityInStock: 0 })]);
    expect((await getCart(USER)).items).toEqual([]);
  });

  test('propagates database errors', async () => {
    Cart.findOne.mockRejectedValue(new Error('DB unavailable'));
    await expect(getCart(USER)).rejects.toThrow('DB unavailable');
  });
});

describe('writeCart', () => {
  test('creates a cart storing only ids and quantities', async () => {
    const result = await writeCart(USER, [{ ...line(2), price: 0, quantityInStock: 100 }], false);
    expect(Cart.create).toHaveBeenCalledWith({ user: USER, items: [line(2)] });
    expect(result.items[0].price).toBe(10.25);
    expect(result.items[0].quantityInStock).toBe(4);
  });

  test('PUT replaces rather than adds to the saved cart', async () => {
    Cart.findOne.mockResolvedValue({ __v: 3, items: [line(3, B)] });
    const result = await writeCart(USER, [line(2)], false);
    expect(result.items.map((item) => item.productId)).toEqual([A]);
    expect(Cart.findOneAndUpdate).toHaveBeenCalledWith(
      { user: USER, __v: 3 },
      { $set: { items: [line(2)] }, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    );
  });

  test('an empty PUT clears the cart', async () => {
    Cart.findOne.mockResolvedValue({ __v: 0, items: [line(2)] });
    expect((await writeCart(USER, [], false)).items).toEqual([]);
    expect(Product.find).not.toHaveBeenCalled();
  });

  test('merge adds matching quantities, caps stock and preserves other saved lines', async () => {
    Cart.findOne.mockResolvedValue({ __v: 0, items: [line(2), line(1, B)] });
    const result = await writeCart(USER, [line(3)], true);
    expect(result.items.map(({ productId, quantity }) => ({ productId, quantity })))
      .toEqual([line(4), line(1, B)]);
    expect(result.itemCount).toBe(5);
    expect(result.total).toBe(51.25);
  });

  test('an empty guest cart keeps existing saved items', async () => {
    Cart.findOne.mockResolvedValue({ __v: 0, items: [line(2)] });
    expect((await writeCart(USER, [], true)).items[0].quantity).toBe(2);
  });

  test('merge adds a new guest product and preserves the saved product', async () => {
    Cart.findOne.mockResolvedValue({ __v: 0, items: [line(1)] });
    const result = await writeCart(USER, [line(2, B)], true);
    expect(result.items.map(({ productId, quantity }) => ({ productId, quantity })))
      .toEqual([line(1), line(2, B)]);
  });

  test('a later read returns the items stored by a write', async () => {
    // A stateful mock checks the handoff between writing and reading; it is not
    // a replacement for a live database persistence check.
    Cart.create.mockImplementation(async (data) => {
      Cart.findOne.mockResolvedValue({ ...data, __v: 0 });
      return data;
    });
    await writeCart(USER, [line(2)], false);
    expect((await getCart(USER)).items[0]).toMatchObject(line(2));
  });

  test('does not write when the product lookup fails', async () => {
    select.mockRejectedValue(new Error('product lookup failed'));
    await expect(writeCart(USER, [line(1)], false)).rejects.toThrow('product lookup failed');
    expect(Cart.create).not.toHaveBeenCalled();
    expect(Cart.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('combines duplicate lines and canonicalizes ids before applying stock limits', async () => {
    await writeCart(USER, [line(2, A.toUpperCase()), line(3)], true);
    expect(Cart.create).toHaveBeenCalledWith({ user: USER, items: [line(4)] });
  });

  test('does not save deleted or out-of-stock products', async () => {
    select.mockResolvedValue([product(A, { quantityInStock: 0 })]);
    await writeCart(USER, [line(), line(1, B)], false);
    expect(Cart.create).toHaveBeenCalledWith({ user: USER, items: [] });
  });

  test.each([undefined, null, {}, 'items'])('rejects a non-array body %p', async (items) => {
    await expect(writeCart(USER, items, false)).rejects.toMatchObject({ status: 400 });
    expect(Cart.findOne).not.toHaveBeenCalled();
  });

  test.each([null, {}, { productId: { $ne: null }, quantity: 1 },
    line(1, 'invalid'), line(1, 123), line(0), line(-1), line(1.5),
    line('2'), line(Number.MAX_SAFE_INTEGER + 1)])(
    'rejects malformed item %p before querying the DB', async (item) => {
      await expect(writeCart(USER, [item], false)).rejects.toMatchObject({ status: 400 });
      expect(Cart.findOne).not.toHaveBeenCalled();
    }
  );

  test('rejects an overflowing duplicate quantity sum', async () => {
    await expect(writeCart(USER, [line(Number.MAX_SAFE_INTEGER), line()], true))
      .rejects.toMatchObject({ status: 400 });
    expect(Cart.create).not.toHaveBeenCalled();
  });

  test('re-reads after a version conflict so a concurrent merge is preserved', async () => {
    Cart.findOne.mockResolvedValueOnce({ __v: 0, items: [line(1)] })
      .mockResolvedValueOnce({ __v: 1, items: [line(2)] });
    Cart.findOneAndUpdate.mockResolvedValueOnce(null).mockResolvedValueOnce({});
    const result = await writeCart(USER, [line(1)], true);
    expect(result.items[0].quantity).toBe(3);
    expect(Cart.findOneAndUpdate.mock.calls[1][0]).toEqual({ user: USER, __v: 1 });
  });

  test('retries when another request creates the first cart', async () => {
    Cart.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ __v: 0, items: [line(1)] });
    Cart.create.mockRejectedValueOnce(Object.assign(new Error('duplicate owner'), { code: 11000 }));
    expect((await writeCart(USER, [line(1)], true)).items[0].quantity).toBe(2);
  });

  test('reports persistent write conflicts as 409', async () => {
    Cart.findOne.mockResolvedValue({ __v: 0, items: [] });
    Cart.findOneAndUpdate.mockResolvedValue(null);
    await expect(writeCart(USER, [line(1)], true)).rejects.toMatchObject({ status: 409 });
    expect(Cart.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  test('propagates unexpected write errors', async () => {
    Cart.create.mockRejectedValue(new Error('write failed'));
    await expect(writeCart(USER, [line(1)], false)).rejects.toThrow('write failed');
  });
});
