import { useState } from 'react';
import { Link } from 'react-router';

import placeholderImage from '../assets/product-placeholder.svg';
import { useCart } from '../cart/cartContext';
import { formatPrice } from '../utils/formatPrice';

function CartRow({ item }) {
  // Seed images come from an external service, so fall back if one fails to load
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = item.imageUrl && !imageFailed ? item.imageUrl : placeholderImage;

  return (
    <li className="cart-item">
      <img
        className="cart-item-image"
        src={imageSrc}
        alt={item.name}
        onError={() => setImageFailed(true)}
      />

      <div className="cart-item-info">
        <Link to={`/products/${item.productId}`} className="cart-item-name">
          {item.name}
        </Link>
        <p className="cart-item-price">{formatPrice(item.price)}</p>
      </div>

      <span className="cart-item-quantity">Qty: {item.quantity}</span>
      <p className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</p>
    </li>
  );
}

export default function CartPage() {
  const { items, total } = useCart();

  if (items.length === 0) {
    return (
      <section className="status-message cart-empty">
        <h1>Your cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/" className="button">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Your cart</h1>

      <ul className="cart-list">
        {items.map((item) => (
          <CartRow key={item.productId} item={item} />
        ))}
      </ul>

      <div className="cart-summary" role="group" aria-label="Order summary">
        <span>Total</span>
        <strong className="cart-total">{formatPrice(total)}</strong>
      </div>
    </section>
  );
}