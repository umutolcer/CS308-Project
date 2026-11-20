import { apiGet, apiPost, apiPut } from './client';

// Only IDs and quantities are input; the server supplies current prices/stock.
const quantitiesOnly = (items) => items.map(({ productId, quantity }) => ({ productId, quantity }));

// A proxy can return an empty/non-cart response even with a successful status.
// Reject it before the provider adopts it or removes the guest backup.
function requireCart(result) {
  if (!result || !Array.isArray(result.items) || result.items.some((item) =>
    !item || typeof item.productId !== 'string' || typeof item.name !== 'string' ||
    !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
    !Number.isFinite(item.price) || item.price < 0 ||
    !Number.isInteger(item.quantityInStock) || item.quantity > item.quantityInStock
  )) {
    throw new Error('The server returned an invalid cart');
  }
  return result;
}

export const getSavedCart = async () => requireCart(await apiGet('/cart'));
export const mergeGuestCart = async (items) => requireCart(
  await apiPost('/cart/merge', { items: quantitiesOnly(items) }),
);
export const saveUserCart = async (items) => requireCart(
  await apiPut('/cart', { items: quantitiesOnly(items) }),
);
