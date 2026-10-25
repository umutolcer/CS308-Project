require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {
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
