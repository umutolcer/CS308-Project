const mongoose = require('mongoose');
const Order = require('../../../src/models/Order');

// These tests use Mongoose validation only and never connect to MongoDB.
const validData = () => ({
    user: new mongoose.Types.ObjectId(),
    items: [
        {
            product: new mongoose.Types.ObjectId(),
            name: 'MacBook Air',
            unitPrice: 44999,
            quantity: 1,
        },
    ],
    totalPrice: 44999,
    deliveryAddress: 'Tuzla, Istanbul',
    payment: { cardLast4: '4242', transactionId: 'txn_123' },
});

describe('Order model validation', () => {
    test('accepts a complete order', async () => {
        const order = new Order(validData());

        await expect(order.validate()).resolves.toBeUndefined();
    });

    test('defaults the status to processing', () => {
        const order = new Order(validData());

        expect(order.status).toBe('processing');
    });

    test.each(['processing', 'in-transit', 'delivered'])('accepts the %s status', async (status) => {
        const order = new Order({ ...validData(), status });

        await expect(order.validate()).resolves.toBeUndefined();
    });

    test('rejects an unknown status', async () => {
        const order = new Order({ ...validData(), status: 'cancelled-by-alien' });

        await expect(order.validate()).rejects.toThrow('Status must be one of');
    });

    test('rejects an order without items', async () => {
        const order = new Order({ ...validData(), items: [] });

        await expect(order.validate()).rejects.toThrow('An order needs at least one item');
    });

    test.each([0, -1, 1.5])('rejects the item quantity %p', async (quantity) => {
        const data = validData();
        data.items[0].quantity = quantity;

        await expect(new Order(data).validate()).rejects.toThrow();
    });

    test('rejects a negative total price', async () => {
        const order = new Order({ ...validData(), totalPrice: -1 });

        await expect(order.validate()).rejects.toThrow('Total price cannot be negative');
    });

    test('rejects an order without a delivery address', async () => {
        const data = validData();
        delete data.deliveryAddress;

        await expect(new Order(data).validate()).rejects.toThrow('Delivery address is required');
    });

    test.each(['424', '42424', 'abcd', '4242 4242 4242 4242'])(
        'rejects the card last 4 value %p',
        async (cardLast4) => {
            const data = validData();
            data.payment.cardLast4 = cardLast4;

            await expect(new Order(data).validate()).rejects.toThrow(
                'Card last 4 digits must be 4 digits'
            );
        }
    );

    test('has no field for the full card number or the CVV', () => {
        const paths = Object.keys(Order.schema.paths);

        expect(paths.some((p) => /cvv|cardNumber|pan/i.test(p))).toBe(false);
    });
});
