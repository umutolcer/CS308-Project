import { useAuth } from '../auth/authContext';
import { useCart } from './cartContext';

// Login redirects home, so synchronization errors must remain visible there.
export default function CartStatus() {
  const { user } = useAuth();
  const { loading, error, needsReview, items, reloadCart } = useCart();
  if (loading && user) return <p role="status" className="container">Loading your saved cart...</p>;
  if (!error) return null;
  return (
    <section className="container" aria-label="Cart synchronization">
      <p role="alert">{error}</p>
      {user && <button type="button" onClick={() => reloadCart()}>Reload saved cart</button>}
      {user && needsReview && (
        <>
          <ul>{items.map((item) => <li key={item.productId}>{item.name}: {item.quantity}</li>)}</ul>
          <p>If the saved cart is correct, use it and discard the guest backup.</p>
          <button type="button" onClick={() => reloadCart(true)}>Use saved cart and discard guest backup</button>
        </>
      )}
    </section>
  );
}
