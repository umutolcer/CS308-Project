import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { getMyOrders } from '../api/orders';
import { useAuth } from '../auth/authContext';
import { formatPrice } from '../utils/formatPrice';
import { getStatusLabel } from '../utils/orderStatus';

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

function OrderCard({ order }) {
  return (
    <li className="order-card">
      <div className="order-card-header">
        <div>
          {/* The last 8 characters of the id are enough for a customer to refer to an order */}
          <h2 className="order-card-title">Order #{order._id.slice(-8)}</h2>
          <p className="order-card-date">{dateFormatter.format(new Date(order.createdAt))}</p>
        </div>
        <span className={`badge order-status order-status-${order.status}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <ul className="order-items">
        {order.items.map((item) => (
          <li key={item.productId} className="order-item">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <dl className="order-details">
        <dt>Delivery address</dt>
        <dd>{order.deliveryAddress}</dd>
        {order.cardLast4 && (
          <>
            <dt>Paid with</dt>
            <dd>Card ending in {order.cardLast4}</dd>
          </>
        )}
        <dt>Total</dt>
        <dd className="order-total">{formatPrice(order.totalPrice)}</dd>
      </dl>
    </li>
  );
}

function OrderList() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // Ignore a response that arrives after the page was left or the request was retried
    let ignore = false;

    getMyOrders()
      .then((data) => {
        if (ignore) return;
        setOrders(data);
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        setErrorMessage(error.status === 401 ? 'Your session has expired. Please log in again.' : error.message);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  function handleRetry() {
    setStatus('loading');
    setReloadCount((count) => count + 1);
  }

  if (status === 'loading') {
    return (
      <p role="status" className="status-message">
        <span className="spinner" aria-hidden="true" />
        Loading your orders…
      </p>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className="status-message status-error">
        <p>Could not load your orders: {errorMessage}</p>
        <button type="button" className="button" onClick={handleRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="status-message">
        <p>You have no orders yet.</p>
        <Link to="/" className="button">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <ul className="order-list">
      {orders.map((order) => (
        <OrderCard key={order._id} order={order} />
      ))}
    </ul>
  );
}

export default function OrderHistoryPage() {
  const { user, loading } = useAuth();

  return (
    <section className="orders">
      <h1>My orders</h1>

      {/* Wait until a stored token has been checked, so a logged-in user doesn't see the login prompt */}
      {loading && (
        <p role="status" className="status-message">
          <span className="spinner" aria-hidden="true" />
          Loading…
        </p>
      )}

      {!loading && !user && (
        <div className="status-message">
          <p>Log in to see your orders.</p>
          <Link to="/login" className="button">
            Log in
          </Link>
        </div>
      )}

      {!loading && user && <OrderList />}
    </section>
  );
}
