jest.mock('../../../src/models/User', () => ({ exists: jest.fn() }));
jest.mock('../../../src/services/cartService', () => ({ getCart: jest.fn(), writeCart: jest.fn() }));

const User = require('../../../src/models/User');
const service = require('../../../src/services/cartService');
const { getCart, updateCart, mergeCart } = require('../../../src/controllers/cartController');

const USER = '671a00000000000000000001';
const OTHER = '671a00000000000000000002';
const ITEMS = [{ productId: '672b00000000000000000001', quantity: 1 }];
const CART = { items: [], itemCount: 0, total: 0 };
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });

beforeEach(() => {
  jest.resetAllMocks();
  User.exists.mockResolvedValue({ _id: USER });
  service.getCart.mockResolvedValue(CART);
  service.writeCart.mockResolvedValue(CART);
});

describe('cart controllers', () => {
  test('GET uses the verified user instead of a query-supplied owner', async () => {
    const res = response();
    await getCart({ user: { id: USER }, query: { user: OTHER } }, res);
    expect(User.exists).toHaveBeenCalledWith({ _id: USER });
    expect(service.getCart).toHaveBeenCalledWith(USER);
    expect(res.json).toHaveBeenCalledWith(CART);
  });

  test.each([[updateCart, false], [mergeCart, true]])(
    'a write ignores a body-supplied owner and forwards the intended mode', async (handler, merge) => {
      const res = response();
      await handler({ user: { id: USER }, body: { user: OTHER, items: ITEMS } }, res);
      expect(service.writeCart).toHaveBeenCalledWith(USER, ITEMS, merge);
      expect(res.json).toHaveBeenCalledWith(CART);
    }
  );

  test.each([getCart, updateCart, mergeCart])('rejects a deleted account', async (handler) => {
    User.exists.mockResolvedValue(null);
    const res = response();
    await handler({ user: { id: USER }, body: { items: ITEMS } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.getCart).not.toHaveBeenCalled();
    expect(service.writeCart).not.toHaveBeenCalled();
  });

  test.each([undefined, '', 'invalid'])('rejects an invalid token subject %p', async (id) => {
    const res = response();
    await getCart({ user: { id } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.exists).not.toHaveBeenCalled();
    expect(service.getCart).not.toHaveBeenCalled();
  });

  test('passes missing items to service validation instead of silently clearing the cart', async () => {
    service.writeCart.mockRejectedValue(Object.assign(new Error('Items must be an array'), { status: 400 }));
    await expect(updateCart({ user: { id: USER }, body: {} }, response()))
      .rejects.toMatchObject({ status: 400 });
    expect(service.writeCart).toHaveBeenCalledWith(USER, undefined, false);
  });

  test('propagates unexpected DB errors for the central handler', async () => {
    User.exists.mockRejectedValue(new Error('DB unavailable'));
    await expect(getCart({ user: { id: USER } }, response())).rejects.toThrow('DB unavailable');
  });
});
