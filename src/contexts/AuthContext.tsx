import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types';
import { apiPost } from '@/lib/api';

interface AuthApiUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar?: string | null;
  date_joined: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<User | null> => {
    let data: { user: AuthApiUser };
    try {
      data = await apiPost<{ user: AuthApiUser }>('/auth/login/', { email, password });
    } catch {
      return null;
    }
    const apiUser = data.user;

    const mappedUser: User = {
      id: String(apiUser.id),
      email: apiUser.email,
      firstName: apiUser.first_name,
      lastName: apiUser.last_name,
      role: apiUser.role,
      avatar: apiUser.avatar || undefined,
      createdAt: new Date(apiUser.date_joined),
    };

    setUser(mappedUser);
    return mappedUser;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
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
