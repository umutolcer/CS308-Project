import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { getProductById } from '../api/products';
import placeholderImage from '../assets/product-placeholder.svg';
import { formatPrice } from '../utils/formatPrice';

// Label and value of each extra property; properties without a value are not shown
const DETAILS = [
  ['Category', (p) => p.category?.name],
  ['Model', (p) => p.model],
  ['Serial number', (p) => p.serialNumber],
  // warrantyStatus is a boolean: false must show "No", not disappear
  ['Warranty', (p) => (typeof p.warrantyStatus === 'boolean' ? (p.warrantyStatus ? 'Yes' : 'No') : null)],
  ['Distributor', (p) => p.distributorInfo],
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Seed images come from an external service, so fall back if one fails to load
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    setImageFailed(false);

    getProductById(id)
      .then((product) => {
        if (!cancelled) setState({ status: 'success', product });
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = unknown id; 400 = malformed id that the backend rejects
        if (err.status === 404 || err.status === 400) {
          setState({ status: 'notfound' });
        } else {
          setState({ status: 'error', message: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  if (state.status === 'loading') {
    return (
      <div className="status-message" role="status">
        <span className="spinner" aria-hidden="true" />
        <p>Loading product...</p>
      </div>
    );
  }

  if (state.status === 'notfound') {
    return (
      <section className="status-message not-found">
        <h1>Product not found</h1>
        <p>We couldn't find the product you are looking for.</p>
        <Link to="/" className="button">
          Back to home
        </Link>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="status-message status-error" role="alert">
        <p>{state.message}</p>
        <button type="button" className="button" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  }

  const { product } = state;
  const outOfStock = product.quantityInStock <= 0;
  const imageSrc = product.imageUrl && !imageFailed ? product.imageUrl : placeholderImage;
  const details = DETAILS.map(([label, read]) => [label, read(product)]).filter(
    ([, value]) => value,
  );

  return (
    <article>
      <Link to="/" className="back-link">
        ← Back to products
      </Link>

      <div className="product-detail">
        <img
          className="product-detail-image"
          src={imageSrc}
          alt={product.name}
          onError={() => setImageFailed(true)}
        />

        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-detail-price">{formatPrice(product.price)}</p>

          {product.description && (
            <p className="product-detail-description">{product.description}</p>
          )}

          {outOfStock ? (
            <p className="stock-status">
              <span className="badge badge-out">Out of stock</span>
            </p>
          ) : (
            <p className="stock-status">{product.quantityInStock} in stock</p>
          )}

          <dl className="product-detail-list">
            {details.map(([label, value]) => (
              <div key={label} className="product-detail-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}