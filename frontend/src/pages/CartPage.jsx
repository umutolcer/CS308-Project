import { useState } from 'react';
import { Link } from 'react-router';

import placeholderImage from '../assets/product-placeholder.svg';
import { useCart } from '../cart/cartContext';
import { formatPrice } from '../utils/formatPrice';

function CartRow({ item, onChangeQuantity, onRemove }) {
    // Seed images come from an external service, so fall back if one fails to load
    const [imageFailed, setImageFailed] = useState(false);
    const imageSrc = item.imageUrl && !imageFailed ? item.imageUrl : placeholderImage;
    const atMax = item.quantity >= item.quantityInStock;

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
                {atMax && <p className="cart-item-note">Maximum available quantity</p>}
                <button type="button" className="cart-item-remove" onClick={onRemove}>
                    Remove
                </button>
            </div>

            <div className="cart-item-quantity">
                <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name}`}
                    disabled={item.quantity <= 1}
                    onClick={() => onChangeQuantity(item.quantity - 1)}
                >
                    −
                </button>
                <span>{item.quantity}</span>
                <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    disabled={atMax}
                    onClick={() => onChangeQuantity(item.quantity + 1)}
                >
                    +
                </button>
            </div>

            <p className="cart-item-subtotal">{formatPrice(item.price * item.quantity)}</p>
        </li>
    );
}

export default function CartPage() {
    const { items, total, updateQuantity, removeItem } = useCart();

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
                    <CartRow
                        key={item.productId}
                        item={item}
                        onChangeQuantity={(quantity) => updateQuantity(item.productId, quantity)}
                        onRemove={() => removeItem(item.productId)}
                    />
                ))}
            </ul>

            <div className="cart-summary" role="group" aria-label="Order summary">
                <span>Total</span>
                <strong className="cart-total">{formatPrice(total)}</strong>
            </div>
        </section>
    );
}