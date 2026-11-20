import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import { getSavedCart, mergeGuestCart, saveUserCart } from '../api/cart';
import { CartContext } from './cartContext';
import { cartReducer, getCartTotal, getItemCount } from './cartReducer';
import { finishGuestMerge, hasPendingMerge, loadCart, markMergePending, saveCart } from './cartStorage';

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?._id || user?.id || null;
  const [cart, setCart] = useState(() => ({ owner: null, items: loadCart() }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const session = useRef(null);
  const writing = useRef(false);

  useEffect(() => {
    // Persist only actual guest edits, not the empty state produced by logout.
    // Keep storage side effects outside React's state updater.
    if (!authLoading && !userId && cart.guestChanged && !hasPendingMerge()) {
      saveCart(cart.items);
    }
  }, [authLoading, userId, cart]);

  useEffect(() => {
    if (authLoading) return undefined;
    let active = true;
    if (!userId) {
      // Saved account items must never become another visitor's guest cart.
      if (session.current) setCart({ owner: null, items: [] });
      session.current = null;
      writing.current = false;
      setBusy(false);
      setError('');
      setNeedsReview(false);
      return undefined;
    }

    // Reuse this promise when StrictMode replays the effect, instead of sending
    // two additive POSTs. The storage guard also protects a full page reload.
    if (session.current?.owner !== userId) {
      const guest = loadCart();
      const pending = hasPendingMerge();
      const current = { owner: userId, review: pending, request: null };
      session.current = current;
      current.request = (async () => {
        if (!pending && guest.length) {
          markMergePending(userId);
          current.review = true;
          const result = await mergeGuestCart(guest);
          // A logout/account switch must not let this old response delete data
          // belonging to the next session. Its pending backup remains reviewable.
          if (session.current === current) {
            finishGuestMerge();
            current.review = false;
          }
          return result;
        }
        return getSavedCart();
      })();
    }

    const current = session.current;
    setBusy(true);
    setError('');
    current.request.then((result) => {
      if (!active || session.current !== current) return;
      setCart({ owner: userId, items: result.items });
      setNeedsReview(current.review);
      if (current.review) setError('A previous cart merge could not be confirmed. Review your saved cart before continuing.');
    }).catch(() => {
      if (!active || session.current !== current) return;
      setNeedsReview(current.review);
      setError('Could not load or merge your cart. Your guest cart has been kept.');
    }).finally(() => {
      if (active && session.current === current) setBusy(false);
    });
    return () => { active = false; };
  }, [userId, authLoading]);

  // Hide another account's items immediately, before the logout effect runs.
  const ready = !authLoading && cart.owner === userId;
  const items = ready ? cart.items : [];
  const loading = Boolean(authLoading || busy);

  const changeCart = useCallback((action) => {
    if (!ready || busy || needsReview || writing.current || (userId && error)) return;
    if (!userId) {
      if (hasPendingMerge()) {
        setError('Log in and review the pending merge before changing the guest cart.');
        return;
      }
      // Use the latest state for each action, including batched guest updates.
      setCart((previous) => {
        const next = cartReducer(previous.items, action);
        return { owner: null, items: next, guestChanged: true };
      });
      return;
    }

    const next = cartReducer(cart.items, action);
    const current = session.current;
    writing.current = true;
    setBusy(true);
    setError('');
    return (async () => {
      try {
        const result = await saveUserCart(next);
        if (session.current === current) setCart({ owner: userId, items: result.items });
      } catch {
        if (session.current === current) setError('Could not save your cart. Reload the saved cart before trying again.');
      } finally {
        if (session.current === current) {
          writing.current = false;
          setBusy(false);
        }
      }
    })();
  }, [ready, busy, needsReview, cart, userId, error]);

  const reloadCart = useCallback(async (acceptSaved = false) => {
    const current = session.current;
    if (!userId || !current || busy || writing.current) return;
    writing.current = true;
    setBusy(true);
    try {
      const result = await getSavedCart();
      if (session.current !== current) return;
      // An explicit user choice resolves uncertainty without replaying POST.
      if (acceptSaved) {
        finishGuestMerge();
        current.review = false;
      }
      setCart({ owner: userId, items: result.items });
      setNeedsReview(current.review);
      setError(current.review ? 'Review your saved cart; the guest backup is still kept.' : '');
    } catch {
      if (session.current === current) setError('Could not reload your saved cart. Please try again later.');
    } finally {
      if (session.current === current) {
        writing.current = false;
        setBusy(false);
      }
    }
  }, [userId, busy]);

  const value = useMemo(() => ({
    items, itemCount: getItemCount(items), total: getCartTotal(items),
    loading, error, needsReview, reloadCart,
    addItem: (product, quantity = 1) => changeCart({ type: 'add', product, quantity }),
    updateQuantity: (productId, quantity) => changeCart({ type: 'setQuantity', productId, quantity }),
    removeItem: (productId) => changeCart({ type: 'remove', productId }),
    clearCart: () => changeCart({ type: 'clear' }),
    getQuantity: (id) => items.find((item) => item.productId === id)?.quantity ?? 0,
  }), [items, loading, error, needsReview, reloadCart, changeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
