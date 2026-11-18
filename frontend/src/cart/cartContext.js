import { createContext, useContext } from 'react';

// The default is an empty cart that ignores changes, so components such as ProductCard
// also render in tests that have no CartProvider
export const CartContext = createContext({
  items: [],
  itemCount: 0,
  total: 0,
  addItem: () => {},
  updateQuantity: () => {},
  removeItem: () => {},
  clearCart: () => {},
  getQuantity: () => 0,
});

export function useCart() {
  return useContext(CartContext);
}
