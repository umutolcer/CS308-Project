// Allows the request only when the logged-in user has one of the given roles.
// Must run after the authenticate middleware, which sets req.user.
// Example: router.post('/', authenticate, authorize('product_manager'), createProduct)
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do this' });
    }

    next();
  };
}

module.exports = authorize;
