import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthContext } from '../../src/auth/authContext';
import { CartProvider } from '../../src/cart/CartProvider';
import { useCart } from '../../src/cart/cartContext';
import { CART_KEY, MERGE_KEY, markMergePending, saveCart } from '../../src/cart/cartStorage';
import { getSavedCart, mergeGuestCart, saveUserCart } from '../../src/api/cart';

vi.mock('../../src/api/cart', () => ({ getSavedCart: vi.fn(), mergeGuestCart: vi.fn(), saveUserCart: vi.fn() }));
const A = { _id: 'user-a', name: 'Ada' };
const B = { _id: 'user-b', name: 'Bob' };
const line = (quantity = 2) => ({ productId: 'p1', name: 'Phone', price: 10, quantityInStock: 5, quantity });
const product = { _id: 'p1', name: 'Phone', price: 10, quantityInStock: 5 };

function setup(initialUser = null, loading = false, strict = false) {
  let auth = { user: initialUser, loading };
  function Wrapper({ children }) {
    const tree = <AuthContext.Provider value={auth}><CartProvider>{children}</CartProvider></AuthContext.Provider>;
    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  }
  const hook = renderHook(() => useCart(), { wrapper: Wrapper });
  return { ...hook, auth: (user, pending = false) => { auth = { user, loading: pending }; hook.rerender(); } };
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  getSavedCart.mockResolvedValue({ items: [] });
  mergeGuestCart.mockResolvedValue({ items: [line(4)] });
  saveUserCart.mockResolvedValue({ items: [line(3)] });
});

describe('saved cart synchronization', () => {
  test('guest operations stay local and do not call authenticated endpoints', () => {
    const hook = setup();
    act(() => { hook.result.current.addItem(product); });
    expect(hook.result.current.itemCount).toBe(1);
    expect(JSON.parse(localStorage.getItem(CART_KEY))[0].quantity).toBe(1);
    expect(getSavedCart).not.toHaveBeenCalled();
    expect(saveUserCart).not.toHaveBeenCalled();
  });

  test('login merges the guest cart and adopts the server result', async () => {
    saveCart([line()]);
    const hook = setup();
    hook.auth(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(4));
    expect(mergeGuestCart).toHaveBeenCalledWith([line()]);
    expect(localStorage.getItem(CART_KEY)).toBeNull();
    expect(localStorage.getItem(MERGE_KEY)).toBeNull();
    expect(hook.result.current.error).toBe('');
  });

  test('keeps both guest additions when React batches them in one action', () => {
    const hook = setup();
    act(() => {
      hook.result.current.addItem(product);
      hook.result.current.addItem(product);
    });
    expect(hook.result.current.itemCount).toBe(2);
    expect(JSON.parse(localStorage.getItem(CART_KEY))[0].quantity).toBe(2);
  });

  test('restores a saved cart with GET when there is no guest cart', async () => {
    getSavedCart.mockResolvedValue({ items: [line(3)] });
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(3));
    expect(mergeGuestCart).not.toHaveBeenCalled();
  });

  test('does not send requests or modify the guest cart before auth restoration finishes', async () => {
    saveCart([line()]);
    const hook = setup(null, true);
    act(() => { hook.result.current.addItem(product); });
    expect(getSavedCart).not.toHaveBeenCalled();
    expect(mergeGuestCart).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(CART_KEY))).toEqual([line()]);
    hook.auth(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(4));
  });

  test('StrictMode sends the additive merge only once', async () => {
    saveCart([line()]);
    const hook = setup(A, false, true);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(4));
    expect(mergeGuestCart).toHaveBeenCalledTimes(1);
  });

  test('keeps the guest backup and reports a failed merge without replaying POST', async () => {
    saveCart([line()]);
    mergeGuestCart.mockRejectedValue(new Error('response lost'));
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.error).toContain('Could not'));
    expect(hook.result.current.needsReview).toBe(true);
    expect(JSON.parse(localStorage.getItem(CART_KEY))).toEqual([line()]);
    expect(localStorage.getItem(MERGE_KEY)).toBe(A._id);
    hook.rerender();
    expect(mergeGuestCart).toHaveBeenCalledTimes(1);
  });

  test('a remount with an uncertain merge reads saved data instead of merging again', async () => {
    saveCart([line()]);
    markMergePending(A._id);
    getSavedCart.mockResolvedValue({ items: [line(4)] });
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(4));
    expect(mergeGuestCart).not.toHaveBeenCalled();
    expect(hook.result.current.needsReview).toBe(true);
    expect(localStorage.getItem(CART_KEY)).not.toBeNull();
  });

  test('explicit saved-cart acceptance clears the backup without another merge', async () => {
    saveCart([line()]);
    markMergePending(A._id);
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.needsReview).toBe(true));
    await act(async () => { await hook.result.current.reloadCart(true); });
    expect(hook.result.current.needsReview).toBe(false);
    expect(localStorage.getItem(CART_KEY)).toBeNull();
    expect(localStorage.getItem(MERGE_KEY)).toBeNull();
    expect(mergeGuestCart).not.toHaveBeenCalled();
  });

  test('a normal reload does not discard an uncertain guest backup', async () => {
    saveCart([line()]);
    markMergePending(A._id);
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.needsReview).toBe(true));
    await act(async () => { await hook.result.current.reloadCart(); });
    expect(localStorage.getItem(CART_KEY)).not.toBeNull();
    expect(hook.result.current.needsReview).toBe(true);
  });

  test('logged-in changes use PUT and use the response as the source of truth', async () => {
    getSavedCart.mockResolvedValue({ items: [line(2)] });
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(2));
    await act(async () => { await hook.result.current.addItem(product); });
    expect(saveUserCart).toHaveBeenCalledWith([line(3)]);
    expect(hook.result.current.itemCount).toBe(3);
    expect(localStorage.getItem(CART_KEY)).toBeNull();
  });

  test('failed saves keep the old state and offer GET reconciliation', async () => {
    getSavedCart.mockResolvedValue({ items: [line(2)] });
    saveUserCart.mockRejectedValue(new Error('offline'));
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(2));
    await act(async () => { await hook.result.current.updateQuantity('p1', 3); });
    expect(hook.result.current.itemCount).toBe(2);
    expect(hook.result.current.error).toContain('Could not save');
    getSavedCart.mockResolvedValue({ items: [line(3)] });
    await act(async () => { await hook.result.current.reloadCart(); });
    expect(hook.result.current.itemCount).toBe(3);
    expect(hook.result.current.error).toBe('');
  });

  test('logout clears account items locally, and re-login loads them from the server', async () => {
    getSavedCart.mockResolvedValue({ items: [line(2)] });
    const hook = setup(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(2));
    hook.auth(null);
    expect(hook.result.current.items).toEqual([]);
    expect(saveUserCart).not.toHaveBeenCalled();
    expect(localStorage.getItem(CART_KEY)).toBeNull();
    hook.auth(A);
    await waitFor(() => expect(hook.result.current.itemCount).toBe(2));
    expect(getSavedCart).toHaveBeenCalledTimes(2);
  });

  test('ignores a delayed response belonging to the previous account', async () => {
    let resolveA;
    getSavedCart.mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve; }))
      .mockResolvedValueOnce({ items: [] });
    const hook = setup(A);
    hook.auth(B);
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => { resolveA({ items: [line(5)] }); });
    expect(hook.result.current.items).toEqual([]);
  });

  test('a delayed merge response after logout does not clear the guest backup', async () => {
    let resolveMerge;
    saveCart([line()]);
    mergeGuestCart.mockReturnValueOnce(new Promise((resolve) => { resolveMerge = resolve; }));
    const hook = setup(A);
    hook.auth(null);
    await act(async () => { resolveMerge({ items: [line(4)] }); });
    expect(hook.result.current.items).toEqual([]);
    expect(localStorage.getItem(CART_KEY)).not.toBeNull();
    expect(localStorage.getItem(MERGE_KEY)).toBe(A._id);
  });
});
