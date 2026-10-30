const jwt = require('jsonwebtoken');

// Rejects the request with 401 unless it carries a valid "Bearer <token>" header.
// On success the token payload is available as req.user ({ id, role }).
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    // Expired, tampered and malformed tokens all get the same response
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
