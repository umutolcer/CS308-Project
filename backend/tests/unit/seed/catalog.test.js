const mongoose = require('mongoose');
const Category = require('../../../src/models/Category');
const Product = require('../../../src/models/Product');
const { categories, products } = require('../../../src/seed/catalog');

describe('seed catalog', () => {
    test('contains five unique categories', () => {
        expect(categories).toHaveLength(5);
        expect(new Set(categories).size).toBe(categories.length);
    });

    test('contains twenty products', () => {
        expect(products).toHaveLength(20);
    });

    test('uses every category and contains no unknown category', () => {
        const usedCategories = new Set(
            products.map((product) => product.categoryName)
        );

        expect(usedCategories).toEqual(new Set(categories));
    });

    test('contains unique product serial numbers', () => {
        const serialNumbers = products.map(
            (product) => product.serialNumber
        );

        expect(new Set(serialNumbers).size).toBe(serialNumbers.length);
    });

    test('contains at least one out-of-stock product', () => {
        expect(
            products.some((product) => product.quantityInStock === 0)
        ).toBe(true);
    });

    test('provides an HTTPS image URL for every product', () => {
        for (const product of products) {
            expect(product.imageUrl).toMatch(/^https:\/\//);
        }
    });

    test('keeps every product cost at or below its selling price', () => {
        for (const product of products) {
            expect(product.cost).toBeLessThanOrEqual(product.price);
        }
    });

    test('matches the existing Category and Product schemas', () => {
        for (const name of categories) {
            const category = new Category({ name });
            expect(category.validateSync()).toBeUndefined();
        }

        for (const catalogProduct of products) {
            const { categoryName, ...productData } = catalogProduct;
            const product = new Product({
                ...productData,
                category: new mongoose.Types.ObjectId(),
            });

            expect(categoryName).toBeTruthy();
            expect(product.validateSync()).toBeUndefined();
        }
    });
});
