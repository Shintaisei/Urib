'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  university: string;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 開発環境ではテストユーザーを設定
    if (process.env.NODE_ENV === 'development') {
      const testUser: User = {
        id: 1,
        email: 'test@hokudai.ac.jp',
        university: '北海道大学',
        is_verified: true,
      };
      setUser(testUser);
      localStorage.setItem('auth_token', 'test-token');
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('auth_token', 'authenticated');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

