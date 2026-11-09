import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginUser } from '../api/auth';
import { AuthContext } from './authContext';
import { clearToken, getToken, setToken } from './tokenStorage';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" while a stored token is being checked against /api/auth/me
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return undefined;

    let cancelled = false;
    getCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((err) => {
        // Only drop the token when the server rejects it, not on network errors
        if (err.status === 401) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token } = await loginUser({ email, password });
    setToken(token);
    try {
      setUser(await getCurrentUser());
    } catch (err) {
      clearToken();
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}