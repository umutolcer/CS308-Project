import { useState } from 'react';
import { Link } from 'react-router';

import placeholderImage from '../assets/product-placeholder.svg';
import { useCart } from '../cart/cartContext';
import { formatPrice } from '../utils/formatPrice';

export default function ProductCard({ product }) {
  // Seed images come from an external service, so fall back if one fails to load
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = product.imageUrl && !imageFailed ? product.imageUrl : placeholderImage;
  const outOfStock = product.quantityInStock === 0;

  const { addItem, getQuantity, loading, error, needsReview } = useCart();
  const quantityInCart = getQuantity(product._id);
  // Out-of-stock products stay visible but cannot be added, and the cart never holds more than the stock
  const canAdd = !loading && !error && !needsReview && !outOfStock && quantityInCart < product.quantityInStock;

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
      {/* The button sits outside the link, so clicking it does not open the detail page */}
      <div className="product-card-actions">
        <button
          type="button"
          className="button product-card-add"
          disabled={!canAdd}
          onClick={() => addItem(product)}
        >
          Add to cart
        </button>
        {quantityInCart > 0 && <span className="product-card-in-cart">{quantityInCart} in cart</span>}
      </div>
    </article>
  );
}
