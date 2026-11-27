const mongoose = require('mongoose');
const Rating = require('../../../src/models/Rating');

// These tests use Mongoose validation only and never connect to MongoDB.
const validData = () => ({
    product: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    value: 4,
});

describe('Rating model validation', () => {
    test.each([1, 2, 3, 4, 5])('accepts a rating of %i', async (value) => {
        const rating = new Rating({ ...validData(), value });

        await expect(rating.validate()).resolves.toBeUndefined();
    });

    test.each([0, 6, -1])('rejects a rating of %i', async (value) => {
        const rating = new Rating({ ...validData(), value });

        await expect(rating.validate()).rejects.toThrow('Rating must be between 1 and 5');
    });

    test('rejects a fractional rating', async () => {
        const rating = new Rating({ ...validData(), value: 3.5 });

        await expect(rating.validate()).rejects.toThrow('Rating must be a whole number');
    });

    test.each(['product', 'user', 'value'])('requires %s', async (field) => {
        const data = validData();
        delete data[field];

        await expect(new Rating(data).validate()).rejects.toThrow(/is required/);
    });

    test('has a unique index on product and user', () => {
        const indexes = Rating.schema.indexes();

        expect(indexes).toContainEqual([{ product: 1, user: 1 }, expect.objectContaining({ unique: true })]);
    });
});
