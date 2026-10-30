const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt only reads the first 72 bytes, so longer passwords would be silently cut
const MAX_PASSWORD_LENGTH = 72;
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
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} bytes`;
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

// Compared against when the email is unknown, so a missing account takes about
// as long to reject as a wrong password
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

function signToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user._id),
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

async function login(req, res) {
  const { email, password } = req.body || {};

  // One generic message for every failure, so the response does not reveal
  // whether the email exists
  const invalidCredentials = () =>
    res.status(401).json({ error: 'Invalid email or password' });

  if (typeof email !== 'string' || typeof password !== 'string') {
    return invalidCredentials();
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.passwordHash : DUMMY_HASH
  );

  if (!user || !passwordMatches) {
    return invalidCredentials();
  }

  res.json({ token: signToken(user), user: user.toJSON() });
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.json({ user: user.toJSON() });
}

module.exports = { register, login, me };
