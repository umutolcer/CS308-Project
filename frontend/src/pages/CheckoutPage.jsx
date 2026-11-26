import { useState } from 'react';
import { Link } from 'react-router';

import { useCart } from '../cart/cartContext';
import {
  formatCardNumber,
  formatExpiry,
  validateAddress,
  validateCardHolder,
  validateCardNumber,
  validateCvv,
  validateExpiry,
} from '../utils/checkoutValidators';
import { formatPrice } from '../utils/formatPrice';

const EMPTY_VALUES = { address: '', cardNumber: '', cardHolder: '', expiry: '', cvv: '' };

function Field({ id, label, error, ...inputProps }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} aria-invalid={Boolean(error)} {...inputProps} />
      <p className="field-error" role={error ? 'alert' : undefined}>
        {error}
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  const { items, total } = useCart();
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'cardNumber') next = formatCardNumber(value);
    if (name === 'expiry') next = formatExpiry(value);
    if (name === 'cvv') next = value.replace(/\D/g, '').slice(0, 3);
    setValues((prev) => ({ ...prev, [name]: next }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {
      address: validateAddress(values.address),
      cardNumber: validateCardNumber(values.cardNumber),
      cardHolder: validateCardHolder(values.cardHolder),
      expiry: validateExpiry(values.expiry),
      cvv: validateCvv(values.cvv),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    // The order is placed in a later commit
  };

  if (items.length === 0) {
    return (
      <section className="status-message cart-empty">
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/" className="button">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Checkout</h1>

      <div className="checkout">
        <form className="auth-form checkout-card" onSubmit={handleSubmit} noValidate>
          <h2>Shipping address</h2>
          <Field
            id="address"
            label="Address"
            autoComplete="street-address"
            value={values.address}
            error={errors.address}
            onChange={handleChange}
          />

          <h2>Payment</h2>
          <Field
            id="cardNumber"
            label="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            value={values.cardNumber}
            error={errors.cardNumber}
            onChange={handleChange}
          />
          <Field
            id="cardHolder"
            label="Name on card"
            autoComplete="cc-name"
            value={values.cardHolder}
            error={errors.cardHolder}
            onChange={handleChange}
          />
          <div className="checkout-form-row">
            <Field
              id="expiry"
              label="Expiry (MM/YY)"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={values.expiry}
              error={errors.expiry}
              onChange={handleChange}
            />
            <Field
              id="cvv"
              label="CVV"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={values.cvv}
              error={errors.cvv}
              onChange={handleChange}
            />
          </div>

          <button type="submit">Pay {formatPrice(total)}</button>
        </form>

        <aside className="checkout-card" aria-label="Order summary">
          <h2>Order summary</h2>
          <ul className="checkout-summary-list">
            {items.map((item) => (
              <li key={item.productId} className="checkout-summary-row">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="checkout-summary-row checkout-total">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </p>
        </aside>
      </div>
    </section>
  );
}