import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types';
import { apiPost, setAuthToken } from '@/lib/api';

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
    let data: { user: AuthApiUser; token: string };
    try {
      data = await apiPost<{ user: AuthApiUser; token: string }>('/auth/login/', { email, password });
    } catch {
      return null;
    }
    const apiUser = data.user;

    // Le serveur exige ce jeton sur chaque requête protégée (créer/modifier/
    // supprimer). Sans lui, toute action admin est refusée avec une erreur 403,
    // même une fois "connecté" côté affichage.
    setAuthToken(data.token);

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
    setAuthToken(null);
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
