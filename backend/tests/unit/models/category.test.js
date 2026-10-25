const Category = require('../../../src/models/Category');

describe('Category model validation', () => {
    test('accepts a category with a valid name', async () => {
        // This test uses Mongoose validation only and does not connect to MongoDB.
        const category = new Category({
            name: 'Laptops',
        });

        await expect(category.validate()).resolves.toBeUndefined();
    });

    test('removes whitespace around the category name', async () => {
        const category = new Category({
            name: '  Laptops  ',
        });

        await category.validate();

        // The schema should normalize the value before it is stored.
        expect(category.name).toBe('Laptops');
    });

    test('rejects a category without a name', async () => {
        const category = new Category({});

        await expect(category.validate()).rejects.toThrow(
            'Category name is required'
        );
    });

    test('rejects a category containing only whitespace', async () => {
        const category = new Category({
            name: '   ',
        });

        // `trim` converts the value to an empty string, then `required` rejects it.
        await expect(category.validate()).rejects.toThrow(
            'Category name is required'
        );
    });
});