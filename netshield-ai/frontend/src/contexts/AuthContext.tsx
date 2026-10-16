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
  theme?: 'dark' | 'light';
  last_login: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, username?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  theme: 'dark',
  toggleTheme: async () => {},
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('netshield_theme');
    return (saved === 'light' ? 'light' : 'dark');
  });

  const applyTheme = (t: 'dark' | 'light') => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('netshield_theme', t);
  };

  useEffect(() => {
    // Initial DOM theme sync
    document.documentElement.setAttribute('data-theme', theme);

    const token = localStorage.getItem('netshield_token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          if (res.data?.theme) {
            applyTheme(res.data.theme);
          }
        })
        .catch(() => {
          localStorage.removeItem('netshield_token');
          localStorage.removeItem('netshield_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const toggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);

    // Persist to backend if authenticated
    try {
      await api.patch('/auth/theme', { theme: nextTheme });
      if (user) {
        setUser({ ...user, theme: nextTheme });
      }
    } catch {
      // Preference safely retained in localStorage
    }
  };

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('netshield_token', access_token);
    localStorage.setItem('netshield_user', JSON.stringify(userData));
    setUser(userData);
    if (userData?.theme) {
      applyTheme(userData.theme);
    }
  };

  const register = async (email: string, password: string, fullName?: string, username?: string) => {
    const res = await api.post('/auth/register', { email, password, full_name: fullName, username });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('netshield_token', access_token);
    localStorage.setItem('netshield_user', JSON.stringify(userData));
    setUser(userData);
    if (userData?.theme) {
      applyTheme(userData.theme);
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('netshield_token');
    localStorage.removeItem('netshield_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, theme, toggleTheme, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export type { User };
