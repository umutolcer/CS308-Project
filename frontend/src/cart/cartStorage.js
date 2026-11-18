// Keeps the guest cart in localStorage so it survives a page reload.
export const CART_KEY = 'cs308_cart';

function isValidItem(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.productId === 'string' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.price === 'number' &&
    Number.isInteger(item.quantityInStock)
  );
}

// The stored value can be missing, broken or edited by hand, so only keep items that look right
export function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidItem)
      .map((item) => ({ ...item, quantity: Math.min(item.quantity, item.quantityInStock) }))
      .filter((item) => item.quantity > 0);
  } catch {
    return [];
  }
}

export function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Storage can be full or disabled (private mode); the cart then only lasts until a reload
  }
}
