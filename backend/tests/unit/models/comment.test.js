const mongoose = require('mongoose');
const Comment = require('../../../src/models/Comment');

// These tests use Mongoose validation only and never connect to MongoDB.
const validData = () => ({
    product: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(),
    text: 'Great laptop, battery lasts all day.',
});

describe('Comment model validation', () => {
    test('accepts a complete comment', async () => {
        const comment = new Comment(validData());

        await expect(comment.validate()).resolves.toBeUndefined();
    });

    test('defaults the status to pending', () => {
        const comment = new Comment(validData());

        expect(comment.status).toBe('pending');
    });

    test.each(['pending', 'approved', 'rejected'])('accepts the %s status', async (status) => {
        const comment = new Comment({ ...validData(), status });

        await expect(comment.validate()).resolves.toBeUndefined();
    });

    test('rejects an unknown status', async () => {
        const comment = new Comment({ ...validData(), status: 'hidden' });

        await expect(comment.validate()).rejects.toThrow('Status must be one of');
    });

    test('trims the text', () => {
        const comment = new Comment({ ...validData(), text: '  Nice phone  ' });

        expect(comment.text).toBe('Nice phone');
    });

    test('rejects text that is only whitespace', async () => {
        const comment = new Comment({ ...validData(), text: '   ' });

        await expect(comment.validate()).rejects.toThrow('Comment text is required');
    });

    test('accepts text of exactly 500 characters', async () => {
        const comment = new Comment({ ...validData(), text: 'a'.repeat(500) });

        await expect(comment.validate()).resolves.toBeUndefined();
    });

    test('rejects text longer than 500 characters', async () => {
        const comment = new Comment({ ...validData(), text: 'a'.repeat(501) });

        await expect(comment.validate()).rejects.toThrow('Comment must be at most 500 characters');
    });

    test.each(['product', 'user', 'text'])('requires %s', async (field) => {
        const data = validData();
        delete data[field];

        await expect(new Comment(data).validate()).rejects.toThrow(/is required/);
    });
});
