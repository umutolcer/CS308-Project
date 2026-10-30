const User = require('../../../src/models/User');

// These tests use Mongoose validation only and never connect to MongoDB.
const validData = () => ({
    name: 'Umut Olcer',
    email: 'umut@example.com',
    homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
});

describe('User model validation', () => {
    test('accepts a user with all required fields', async () => {
        const user = new User(validData());

        await expect(user.validate()).resolves.toBeUndefined();
    });

    test('defaults the role to customer', () => {
        const user = new User(validData());

        expect(user.role).toBe('customer');
    });

    test.each(['customer', 'sales_manager', 'product_manager', 'support_agent'])(
        'accepts the %s role',
        async (role) => {
            const user = new User({ ...validData(), role });

            await expect(user.validate()).resolves.toBeUndefined();
        }
    );

    test('rejects an unknown role', async () => {
        const user = new User({ ...validData(), role: 'admin' });

        await expect(user.validate()).rejects.toThrow('Role must be one of');
    });

    test.each([
        ['name', 'Name is required'],
        ['email', 'Email is required'],
        ['homeAddress', 'Home address is required'],
        ['passwordHash', 'Password hash is required'],
    ])('rejects a user without %s', async (field, message) => {
        const data = validData();
        delete data[field];

        await expect(new User(data).validate()).rejects.toThrow(message);
    });

    test.each(['not-an-email', 'missing@tld', '@example.com', 'a b@example.com'])(
        'rejects the invalid email "%s"',
        async (email) => {
            const user = new User({ ...validData(), email });

            await expect(user.validate()).rejects.toThrow('Email is not valid');
        }
    );

    test('lowercases and trims the email', async () => {
        const user = new User({ ...validData(), email: '  Umut@Example.COM ' });

        await user.validate();

        expect(user.email).toBe('umut@example.com');
    });

    test('toJSON does not expose the password hash', () => {
        const user = new User(validData());

        const json = user.toJSON();

        expect(json.passwordHash).toBeUndefined();
        expect(json.email).toBe('umut@example.com');
    });
});
