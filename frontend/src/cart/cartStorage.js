// Keeps the guest cart in localStorage so it survives a page reload.
export const CART_KEY = 'cs308_cart';
export const MERGE_KEY = 'cs308_cart_merge_pending';

// Write before POST /merge so a lost response/reload cannot replay quantities.
// Unlike ordinary guest storage, failures here must stop the merge request.
export function markMergePending(userId) {
  localStorage.setItem(MERGE_KEY, userId);
}

export function hasPendingMerge() {
  try {
    return localStorage.getItem(MERGE_KEY) !== null;
  } catch {
    return true;
  }
}

export function finishGuestMerge() {
  // If cleanup fails, keep the replay guard until the guest copy is removed.
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(MERGE_KEY);
}

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
