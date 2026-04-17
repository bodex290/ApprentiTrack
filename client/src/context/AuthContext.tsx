import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { login as apiLogin, getMe } from '../services/api';

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'coach' | 'apprentice';
  first_name: string;
  last_name: string;
  must_change_password: boolean;
  apprentice_id: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ must_change_password: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.data);
    } catch {
      // Token invalid/expired — clear everything
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  // Re-run whenever the token changes (login / logout / external clear)
  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchUser().finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token, fetchUser]);

  // Listen for forced logouts from the 401 interceptor
  useEffect(() => {
    const handleForcedLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (email: string, password: string) => {
    // Clear any previous session first
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);

    const res = await apiLogin(email, password);
    const { access_token, must_change_password } = res.data;
    localStorage.setItem('token', access_token);
    // Fetch full user profile with the new token (before setting token state
    // to avoid a redundant useEffect→fetchUser race)
    const meRes = await getMe();
    setUser(meRes.data);
    setToken(access_token);
    return { must_change_password };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    if (localStorage.getItem('token')) {
      await fetchUser();
    }
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
