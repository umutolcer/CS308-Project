// Load local credentials without printing dotenv's startup message in tests.
require('dotenv').config({ quiet: true });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { seedStaff } = require('../src/seed/seedStaff');

// The new passwords go to this file, which Git ignores (*.local.txt)
const CREDENTIALS_FILE = path.join(__dirname, '..', 'staff-credentials.local.txt');

function writeCredentials(created) {
  const lines = created.map((c) => `${c.role}\t${c.email}\t${c.password}`);
  const header = fs.existsSync(CREDENTIALS_FILE) ? '' : 'role\temail\tpassword\n';
  fs.appendFileSync(CREDENTIALS_FILE, header + lines.join('\n') + '\n', { mode: 0o600 });
}

async function main() {
  try {
    await connectDB();
    const { created, existing } = await seedStaff({
      UserModel: User,
      hashPassword: (password) => bcrypt.hash(password, 10),
      makePassword: () => crypto.randomBytes(12).toString('base64url'),
    });

    if (created.length) writeCredentials(created);

    // The passwords themselves are never printed
    console.log(`Created ${created.length} staff account(s), ${existing.length} already existed.`);
    if (created.length) console.log(`Passwords saved to ${CREDENTIALS_FILE}`);
  } catch {
    // Avoid logging errors that could contain database credentials.
    console.error('Staff seed failed');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
