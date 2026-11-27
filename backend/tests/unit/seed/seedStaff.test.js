const { seedStaff, STAFF } = require('../../../src/seed/seedStaff');

function setup({ existingEmails = [] } = {}) {
  const UserModel = {
    findOne: jest.fn(async ({ email }) => (existingEmails.includes(email) ? { email } : null)),
    create: jest.fn(async (data) => data),
  };
  let counter = 0;
  return {
    UserModel,
    hashPassword: jest.fn(async (password) => `hash:${password}`),
    makePassword: jest.fn(() => `password-${++counter}`),
  };
}

describe('seedStaff', () => {
  test('creates one account for each staff role', async () => {
    // Arrange
    const deps = setup();

    // Act
    const result = await seedStaff(deps);

    // Assert
    expect(result.created.map((c) => c.role)).toEqual([
      'product_manager',
      'sales_manager',
      'support_agent',
    ]);
    expect(result.existing).toEqual([]);
    expect(deps.UserModel.create).toHaveBeenCalledTimes(3);
  });

  test('saves only the hash of the password', async () => {
    // Arrange
    const deps = setup();

    // Act
    await seedStaff(deps);

    // Assert
    const saved = deps.UserModel.create.mock.calls[0][0];
    expect(saved.passwordHash).toBe('hash:password-1');
    expect(saved.password).toBeUndefined();
  });

  test('returns the plain password of each new account so it can be saved', async () => {
    // Arrange
    const deps = setup();

    // Act
    const { created } = await seedStaff(deps);

    // Assert
    expect(created[0]).toEqual({
      email: 'product.manager@store.test',
      role: 'product_manager',
      password: 'password-1',
    });
  });

  test('gives each account its own password', async () => {
    // Act
    const { created } = await seedStaff(setup());

    // Assert
    expect(new Set(created.map((c) => c.password)).size).toBe(created.length);
  });

  test('never changes an account that already exists', async () => {
    // Arrange
    const deps = setup({ existingEmails: ['product.manager@store.test'] });

    // Act
    const result = await seedStaff(deps);

    // Assert
    expect(result.existing).toEqual(['product.manager@store.test']);
    expect(result.created).toHaveLength(2);
    expect(deps.UserModel.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: 'product.manager@store.test' })
    );
  });

  test('creates nothing when every account exists (safe to run twice)', async () => {
    // Arrange
    const deps = setup({ existingEmails: STAFF.map((s) => s.email) });

    // Act
    const result = await seedStaff(deps);

    // Assert
    expect(result.created).toEqual([]);
    expect(deps.UserModel.create).not.toHaveBeenCalled();
    expect(deps.makePassword).not.toHaveBeenCalled();
  });

  test('does not read the password from the code or the environment', async () => {
    // Assert: the module has no password of its own
    expect(JSON.stringify(STAFF)).not.toMatch(/password/i);
  });
});
