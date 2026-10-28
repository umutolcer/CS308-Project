const bcrypt = require('bcryptjs');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

// Returns an error message for the first invalid field, or null when all are valid
function validateRegisterInput({ name, email, homeAddress, password }) {
  if (!isNonEmptyString(name)) return 'Name is required';
  if (!isNonEmptyString(email) || !EMAIL_PATTERN.test(email.trim())) {
    return 'A valid email is required';
  }
  if (!isNonEmptyString(homeAddress)) return 'Home address is required';
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

async function register(req, res) {
  const validationError = validateRegisterInput(req.body || {});
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { name, email, homeAddress, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // The role is never read from the request, so new accounts are always customers
  let user;
  try {
    user = await User.create({
      name,
      email: normalizedEmail,
      homeAddress,
      passwordHash,
    });
  } catch (err) {
    // Two requests with the same email can pass the check above at the same
    // time; the unique index then rejects the second one
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email is already registered' });
    }
    throw err;
  }

  res.status(201).json({ user: user.toJSON() });
}

module.exports = { register };
