const { listDeliveries, updateOrderStatus } = require('../services/deliveryService');
const { OrderError } = require('../services/orderService');

// Expected problems are answered directly; anything else goes to the central error handler
function answerOrderError(err, res) {
  if (err instanceof OrderError) {
    return res.status(err.status).json({ error: err.message });
  }
  throw err;
}

// GET /api/deliveries?status=<processing|in-transit|delivered>  (product managers)
async function getDeliveries(req, res) {
  const { status } = req.query;

  // "?status=a&status=b" arrives as an array, which is not a valid status
  if (status !== undefined && typeof status !== 'string') {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const deliveries = await listDeliveries({ status });
    return res.json({ deliveries });
  } catch (err) {
    return answerOrderError(err, res);
  }
}

// PATCH /api/orders/:id/status  with { status }  (product managers)
async function changeOrderStatus(req, res) {
  try {
    const order = await updateOrderStatus(req.params.id, req.body?.status);
    return res.json({ order });
  } catch (err) {
    return answerOrderError(err, res);
  }
}

module.exports = { getDeliveries, changeOrderStatus };
