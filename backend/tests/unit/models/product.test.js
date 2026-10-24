const mongoose = require('mongoose');
const Product = require('../../../src/models/Product');

// Creates a valid product that each test can modify for one specific scenario.
// This keeps tests focused and avoids repeating every required field.
function buildValidProduct(overrides = {}) {
    return new Product({
        name: 'MacBook Air',
        model: 'M4',
        serialNumber: 'MBA-M4-001',
        description: '13-inch laptop',
        quantityInStock: 10,
        price: 44999,
        warrantyStatus: true,
        distributorInfo: 'Apple Türkiye',
        category: new mongoose.Types.ObjectId(),
        cost: 38000,
        ...overrides,
    });
}

describe('Product model validation', () => {
    test('accepts a product with valid fields', async () => {
        const product = buildValidProduct();

        // Schema validation runs in memory without connecting to MongoDB.
        await expect(product.validate()).resolves.toBeUndefined();
    });

    test('removes whitespace around text fields', async () => {
        const product = buildValidProduct({
            name: '  MacBook Air  ',
            model: '  M4  ',
            serialNumber: '  MBA-M4-001  ',
            description: '  13-inch laptop  ',
            distributorInfo: '  Apple Türkiye  ',
        });

        await product.validate();

        expect(product.name).toBe('MacBook Air');
        expect(product.model).toBe('M4');
        expect(product.serialNumber).toBe('MBA-M4-001');
        expect(product.description).toBe('13-inch laptop');
        expect(product.distributorInfo).toBe('Apple Türkiye');
    });

    test('accepts zero price zero cost and zero stock', async () => {
        const product = buildValidProduct({
            quantityInStock: 0,
            price: 0,
            cost: 0,
            warrantyStatus: false,
        });

        // Zero is a valid boundary value and false is a valid warranty value.
        await expect(product.validate()).resolves.toBeUndefined();
    });

    test('rejects a negative price', async () => {
        const product = buildValidProduct({
            price: -1,
        });

        await expect(product.validate()).rejects.toThrow(
            'Price cannot be negative'
        );
    });

    test('rejects a negative quantity in stock', async () => {
        const product = buildValidProduct({
            quantityInStock: -1,
        });

        await expect(product.validate()).rejects.toThrow(
            'Quantity in stock cannot be negative'
        );
    });

    test('rejects a fractional quantity in stock', async () => {
        const product = buildValidProduct({
            quantityInStock: 2.5,
        });

        await expect(product.validate()).rejects.toThrow(
            'Quantity in stock must be an integer'
        );
    });

    test('rejects a negative cost', async () => {
        const product = buildValidProduct({
            cost: -1,
        });

        await expect(product.validate()).rejects.toThrow(
            'Cost cannot be negative'
        );
    });

    test.each([
        ['name', 'Product name is required'],
        ['model', 'Product model is required'],
        ['serialNumber', 'Serial number is required'],
        ['description', 'Product description is required'],
        ['quantityInStock', 'Quantity in stock is required'],
        ['price', 'Price is required'],
        ['warrantyStatus', 'Warranty status is required'],
        ['distributorInfo', 'Distributor information is required'],
        ['category', 'Category is required'],
        ['cost', 'Cost is required'],
    ])('rejects a product without %s', async (field, expectedMessage) => {
        // Computed property syntax lets one test verify every required field.
        const product = buildValidProduct({
            [field]: undefined,
        });

        await expect(product.validate()).rejects.toThrow(expectedMessage);
    });
});
