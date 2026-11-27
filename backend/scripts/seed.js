// Load local credentials without printing dotenv's startup message in tests.
require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const seedDatabase = require('../src/seed/seedDatabase');

/*
 * Runs the seed service as a short-lived command-line job.
 *
 * Dependencies can be replaced by unit-test mocks. The real command uses the
 * same connectDB module as the server and always closes its own connection.
 */
async function runSeed({
    connect = connectDB,
    disconnect = () => mongoose.disconnect(),
    seed = seedDatabase,
    CategoryModel = Category,
    ProductModel = Product,
} = {}) {
    let connected = false;

    try {
        await connect();
        connected = true;

        return await seed({
            Category: CategoryModel,
            Product: ProductModel,
        });
    } finally {
        // Do not call disconnect when the initial connection never succeeded.
        if (connected) {
            await disconnect();
        }
    }
}

async function main() {
    try {
        const result = await runSeed();
        console.log(
            `Seed completed: ${result.categoriesUpserted} categories and ${result.productsUpserted} products`
        );
    } catch {
        // Avoid logging errors that could contain database credentials.
        console.error('Database seed failed');
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main();
}

module.exports = { runSeed };
