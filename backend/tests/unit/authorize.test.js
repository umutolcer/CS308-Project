const authorize = require('../../src/middleware/authorize');

function run(middleware, user) {
  const req = { user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
}

describe('authorize middleware', () => {
  test('lets a user with an allowed role through', () => {
    // Act
    const { res, next } = run(authorize('product_manager'), { id: '1', role: 'product_manager' });

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accepts any of several allowed roles', () => {
    // Act
    const { next } = run(authorize('sales_manager', 'product_manager'), { id: '1', role: 'sales_manager' });

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 for a role that is not allowed', () => {
    // Act
    const { res, next } = run(authorize('product_manager'), { id: '1', role: 'customer' });

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'You do not have permission to do this' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when no user is attached to the request', () => {
    // Act
    const { res, next } = run(authorize('customer'), undefined);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when no roles are allowed', () => {
    // Act
    const { res } = run(authorize(), { id: '1', role: 'customer' });

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
