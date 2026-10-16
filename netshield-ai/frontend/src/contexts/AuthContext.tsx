// Authentication context
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: 'ADMIN' | 'ANALYST' | 'SOC_OPERATOR';
  is_active: boolean;
  last_login: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, username?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('netshield_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('netshield_token');
          localStorage.removeItem('netshield_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('netshield_token', access_token);
    localStorage.setItem('netshield_user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (email: string, password: string, fullName?: string, username?: string) => {
    const res = await api.post('/auth/register', { email, password, full_name: fullName, username });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('netshield_token', access_token);
    localStorage.setItem('netshield_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('netshield_token');
    localStorage.removeItem('netshield_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { User };
