import { Link, useLocation } from 'react-router';

import { formatPrice } from '../utils/formatPrice';

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const order = state?.order;

  if (!order) {
    return (
      <section className="status-message cart-empty">
        <h1>Order confirmation</h1>
        <p>We couldn't find an order to show.</p>
        <Link to="/" className="button">
          Back to home
        </Link>
      </section>
    );
  }

  return (
    <section className="confirmation">
      <h1>Thank you for your order</h1>
      <p>Your payment was confirmed.</p>
      <p>
        Order number: <strong>{order._id}</strong>
      </p>
      {typeof order.total === 'number' && (
        <p>
          Total paid: <strong>{formatPrice(order.total)}</strong>
        </p>
      )}
      <Link to="/" className="button">
        Continue shopping
      </Link>
    </section>
  );
}