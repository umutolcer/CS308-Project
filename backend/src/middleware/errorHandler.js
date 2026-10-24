// Express recognizes error handlers by their 4 arguments, so `next` must stay
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Malformed JSON bodies and other client errors carry their own 4xx status
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
