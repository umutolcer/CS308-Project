const { categories, products } = require('../../../src/seed/catalog');
const seedDatabase = require('../../../src/seed/seedDatabase');

function createMockModels() {
    const idsByCategory = new Map(
        categories.map((name, index) => [name, `category-id-${index + 1}`])
    );

    const Category = {
        findOneAndUpdate: jest.fn(async ({ name }) => ({
            _id: idsByCategory.get(name),
            name,
        })),
    };
    const Product = {
        findOneAndUpdate: jest.fn(async (filter, update) => ({
            _id: `product-${filter.serialNumber}`,
            ...update.$set,
        })),
    };

    return { Category, Product, idsByCategory };
}

describe('seedDatabase', () => {
    test('upserts all categories and products from the catalog', async () => {
        const { Category, Product } = createMockModels();

        const result = await seedDatabase({ Category, Product });

        expect(Category.findOneAndUpdate).toHaveBeenCalledTimes(5);
        expect(Product.findOneAndUpdate).toHaveBeenCalledTimes(20);
        expect(result).toEqual({
            categoriesUpserted: 5,
            productsUpserted: 20,
        });
    });

    test('stores the matching category id instead of categoryName', async () => {
        const { Category, Product, idsByCategory } = createMockModels();

        await seedDatabase({ Category, Product });

        const firstCatalogProduct = products[0];
        const firstProductCall = Product.findOneAndUpdate.mock.calls[0];
        const [filter, update, options] = firstProductCall;

        expect(filter).toEqual({
            serialNumber: firstCatalogProduct.serialNumber,
        });
        expect(update.$set.category).toBe(
            idsByCategory.get(firstCatalogProduct.categoryName)
        );
        expect(update.$set).not.toHaveProperty('categoryName');
        expect(options).toEqual({
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        });
    });

    test('uses stable unique filters when the seed runs again', async () => {
        const { Category, Product } = createMockModels();

        await seedDatabase({ Category, Product });
        await seedDatabase({ Category, Product });

        expect(Category.findOneAndUpdate).toHaveBeenNthCalledWith(
            1,
            { name: categories[0] },
            { $set: { name: categories[0] } },
            expect.objectContaining({ upsert: true })
        );
        expect(Category.findOneAndUpdate).toHaveBeenNthCalledWith(
            6,
            { name: categories[0] },
            { $set: { name: categories[0] } },
            expect.objectContaining({ upsert: true })
        );

        expect(Product.findOneAndUpdate.mock.calls[0][0]).toEqual(
            Product.findOneAndUpdate.mock.calls[20][0]
        );
    });

    test('rejects a product that references an unknown category', async () => {
        const { Category, Product } = createMockModels();
        const invalidProducts = [
            {
                ...products[0],
                categoryName: 'Unknown category',
            },
        ];

        await expect(
            seedDatabase({
                Category,
                Product,
                categories: ['Laptops'],
                products: invalidProducts,
            })
        ).rejects.toThrow('references unknown category Unknown category');
        expect(Category.findOneAndUpdate).not.toHaveBeenCalled();
        expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('rejects duplicate serial numbers before writing', async () => {
        const { Category, Product } = createMockModels();
        const duplicateProducts = [products[0], { ...products[0] }];

        await expect(
            seedDatabase({
                Category,
                Product,
                categories: ['Laptops'],
                products: duplicateProducts,
            })
        ).rejects.toThrow(
            `duplicate serial number ${products[0].serialNumber}`
        );
        expect(Category.findOneAndUpdate).not.toHaveBeenCalled();
        expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('rejects a category result without an id', async () => {
        const Category = {
            findOneAndUpdate: jest.fn().mockResolvedValue({ name: 'Laptops' }),
        };
        const Product = { findOneAndUpdate: jest.fn() };

        await expect(
            seedDatabase({
                Category,
                Product,
                categories: ['Laptops'],
                products: [],
            })
        ).rejects.toThrow('did not return an _id for Laptops');
    });
});
