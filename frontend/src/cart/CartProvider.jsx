import { useCallback, useEffect, useMemo, useReducer } from 'react';

import { CartContext } from './cartContext';
import { cartReducer, getCartTotal, getItemCount } from './cartReducer';
import { loadCart, saveCart } from './cartStorage';

export function CartProvider({ children }) {
  // loadCart runs once, so a reload starts from the saved cart
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart);

  // Save after every change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    dispatch({ type: 'add', product, quantity });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    dispatch({ type: 'setQuantity', productId, quantity });
  }, []);

  const removeItem = useCallback((productId) => {
    dispatch({ type: 'remove', productId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const getQuantity = useCallback(
    (productId) => items.find((item) => item.productId === productId)?.quantity ?? 0,
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount: getItemCount(items),
      total: getCartTotal(items),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      getQuantity,
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, getQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
