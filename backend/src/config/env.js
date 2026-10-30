// Throws when a required environment variable is missing or blank.
// Called at startup so a bad setup fails fast with a clear message.
function requireEnv(name, env = process.env) {
  const value = env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

module.exports = { requireEnv };
