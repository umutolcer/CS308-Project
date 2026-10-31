import { useState } from 'react';
import { Link } from 'react-router';

import placeholderImage from '../assets/product-placeholder.svg';
import { formatPrice } from '../utils/formatPrice';

export default function ProductCard({ product }) {
  // Seed images come from an external service, so fall back if one fails to load
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = product.imageUrl && !imageFailed ? product.imageUrl : placeholderImage;
  const outOfStock = product.quantityInStock === 0;

  return (
    <article className="product-card">
      <Link to={`/products/${product._id}`} className="product-card-link">
        <img
          src={imageSrc}
          alt={product.name}
          className="product-card-image"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
        <div className="product-card-body">
          <h3 className="product-card-name">{product.name}</h3>
          <p className="product-card-price">{formatPrice(product.price)}</p>
          {outOfStock && <span className="badge">Out of stock</span>}
        </div>
      </Link>
    </article>
  );
}
