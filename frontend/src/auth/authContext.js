import { createContext, useContext } from 'react';

// The default value is "logged out", so components such as Navbar
// also render without a provider (App.test.jsx and Navbar.test.jsx rely on this)
export const AuthContext = createContext({
  user: null,
  loading: false,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}