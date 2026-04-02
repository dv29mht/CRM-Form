import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthResponse } from '../api/auth';

interface AuthState {
  token: string | null;
  user: Omit<AuthResponse, 'token'> | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (data: AuthResponse) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    return { token, user: null };
  });

  const setAuth = (data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    const { token, ...user } = data;
    setState({ token, user });
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    setState({ token: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
