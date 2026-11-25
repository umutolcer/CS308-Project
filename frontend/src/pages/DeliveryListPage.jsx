import { useEffect, useState } from 'react';

import { getDeliveries, updateOrderStatus } from '../api/deliveries';
import { formatPrice } from '../utils/formatPrice';
import { isDeliveryCompleted, nextOrderStatus, orderStatusLabel } from '../utils/orderStatus';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Not completed' },
  { value: 'completed', label: 'Completed' },
];

function matchesFilter(delivery, filter) {
  if (filter === 'pending') return !isDeliveryCompleted(delivery.status);
  if (filter === 'completed') return isDeliveryCompleted(delivery.status);
  return true;
}

function DeliveryRow({ delivery, saving, error, onAdvance }) {
  const next = nextOrderStatus(delivery.status);
  const completed = isDeliveryCompleted(delivery.status);

  return (
    <tr>
      <td>{delivery.deliveryId}</td>
      <td>{delivery.customerId}</td>
      <td>
        {delivery.productId}
        {delivery.productName && <span className="delivery-product-name">{delivery.productName}</span>}
      </td>
      <td>{delivery.quantity}</td>
      <td>{formatPrice(delivery.totalPrice)}</td>
      <td>{delivery.deliveryAddress}</td>
      <td>
        <span className={`order-status order-status-${delivery.status}`}>
          {orderStatusLabel(delivery.status)}
        </span>
      </td>
      <td>{completed ? 'Yes' : 'No'}</td>
      <td>
        {next && (
          <button
            type="button"
            className="button delivery-action"
            disabled={saving}
            onClick={() => onAdvance(delivery.orderId, next)}
            aria-label={`Mark delivery ${delivery.deliveryId} as ${orderStatusLabel(next)}`}
          >
            {saving ? 'Saving…' : `Mark as ${orderStatusLabel(next)}`}
          </button>
        )}
        {error && <p role="alert" className="status-error delivery-error">{error}</p>}
      </td>
    </tr>
  );
}

export default function DeliveryListPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  // Keyed by order id: one status change updates every product of that order
  const [savingOrders, setSavingOrders] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    getDeliveries()
      .then((list) => {
        if (cancelled) return;
        setDeliveries(list);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  function handleRetry() {
    setStatus('loading');
    setReloadCount((count) => count + 1);
  }

  async function handleAdvance(orderId, newStatus) {
    setSavingOrders((current) => ({ ...current, [orderId]: true }));
    setRowErrors((current) => ({ ...current, [orderId]: '' }));

    try {
      await updateOrderStatus(orderId, newStatus);
      setDeliveries((current) => current.map((delivery) => (
        delivery.orderId === orderId ? { ...delivery, status: newStatus } : delivery
      )));
    } catch (err) {
      setRowErrors((current) => ({ ...current, [orderId]: `Could not update: ${err.message}` }));
    } finally {
      setSavingOrders((current) => ({ ...current, [orderId]: false }));
    }
  }

  const visibleDeliveries = deliveries.filter((delivery) => matchesFilter(delivery, filter));
  const pendingCount = deliveries.filter((delivery) => !isDeliveryCompleted(delivery.status)).length;

  return (
    <section className="deliveries">
      <div className="page-header">
        <h1>Deliveries</h1>
        <p>Products to deliver and their delivery addresses. Update an order as it moves.</p>
      </div>

      {status === 'loading' && (
        <p role="status" className="status-message">
          <span className="spinner" aria-hidden="true" />
          Loading deliveries…
        </p>
      )}

      {status === 'error' && (
        <div role="alert" className="status-message status-error">
          <p>Could not load deliveries: {errorMessage}</p>
          <button type="button" className="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && deliveries.length === 0 && (
        <p className="status-message">There are no deliveries yet.</p>
      )}

      {status === 'ready' && deliveries.length > 0 && (
        <>
          <div className="product-toolbar">
            <div className="category-filter" role="group" aria-label="Filter deliveries">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className="category-filter-button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="delivery-summary">
              {pendingCount} of {deliveries.length} deliveries not completed
            </p>
          </div>

          {visibleDeliveries.length === 0 ? (
            <p className="status-message">No deliveries match this filter.</p>
          ) : (
            <div className="table-wrapper">
              <table className="delivery-table">
                <thead>
                  <tr>
                    <th scope="col">Delivery ID</th>
                    <th scope="col">Customer ID</th>
                    <th scope="col">Product ID</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Total price</th>
                    <th scope="col">Delivery address</th>
                    <th scope="col">Status</th>
                    <th scope="col">Completed</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDeliveries.map((delivery) => (
                    <DeliveryRow
                      key={delivery.deliveryId}
                      delivery={delivery}
                      saving={Boolean(savingOrders[delivery.orderId])}
                      error={rowErrors[delivery.orderId]}
                      onAdvance={handleAdvance}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
