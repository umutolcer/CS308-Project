const defaultCatalog = require('./catalog');

// Returning a new options object for every query prevents one database call
// from accidentally mutating options used by a later call.
function upsertOptions() {
    return {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
    };
}

// Validate cross-record rules before the first database write. This avoids a
// partially seeded database when catalog metadata contains a typo or duplicate.
function validateCatalog(categories, products) {
    const knownCategories = new Set(categories);
    if (knownCategories.size !== categories.length) {
        throw new Error('Seed catalog contains duplicate category names');
    }

    const serialNumbers = new Set();
    for (const product of products) {
        if (!knownCategories.has(product.categoryName)) {
            throw new Error(
                `Product ${product.serialNumber} references unknown category ${product.categoryName}`
            );
        }
        if (serialNumbers.has(product.serialNumber)) {
            throw new Error(
                `Seed catalog contains duplicate serial number ${product.serialNumber}`
            );
        }
        serialNumbers.add(product.serialNumber);
    }
}

/*
 * Inserts or updates the complete demo catalog without deleting user data.
 *
 * Categories are matched by their unique name and products by their unique
 * serial number. Running the script again updates the same documents instead
 * of creating duplicates.
 *
 * Models are injected so unit tests can use mocks and never touch a real DB.
 */
async function seedDatabase({
    Category,
    Product,
    categories = defaultCatalog.categories,
    products = defaultCatalog.products,
}) {
    if (!Category || typeof Category.findOneAndUpdate !== 'function') {
        throw new TypeError('A Category model with findOneAndUpdate is required');
    }
    if (!Product || typeof Product.findOneAndUpdate !== 'function') {
        throw new TypeError('A Product model with findOneAndUpdate is required');
    }

    validateCatalog(categories, products);

    const categoryIds = new Map();

    // Categories must exist first because Product.category stores their _id.
    for (const name of categories) {
        const category = await Category.findOneAndUpdate(
            { name },
            { $set: { name } },
            upsertOptions()
        );

        if (!category || !category._id) {
            throw new Error(`Category upsert did not return an _id for ${name}`);
        }

        categoryIds.set(name, category._id);
    }

    for (const catalogProduct of products) {
        const { categoryName, ...productData } = catalogProduct;
        const categoryId = categoryIds.get(categoryName);

        // categoryName is seed-only metadata; persisted products use ObjectId.
        await Product.findOneAndUpdate(
            { serialNumber: productData.serialNumber },
            { $set: { ...productData, category: categoryId } },
            upsertOptions()
        );
    }

    return {
        categoriesUpserted: categories.length,
        productsUpserted: products.length,
    };
}

module.exports = seedDatabase;
