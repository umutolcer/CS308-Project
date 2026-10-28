require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { requireEnv } = require('./src/config/env');

const PORT = process.env.PORT || 5000;

async function start() {
  // Without a secret every login would fail with a 500 at request time, so stop early
  try {
    requireEnv('JWT_SECRET');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    await connectDB();
  } catch {
    // connectDB already logged the reason
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
