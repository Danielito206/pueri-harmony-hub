import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types';
import { apiPost, setAuthToken, getAuthToken, setUnauthorizedHandler } from '@/lib/api';

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

// L'utilisateur connecté est conservé à côté du jeton (voir api.ts). Sans
// cela, un simple rafraîchissement de page renverrait vers l'écran de
// connexion en pleine saisie de données.
const USER_STORAGE_KEY = 'pueri.user';

const readStoredUser = (): User | null => {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.role) return null;
    return {
      ...parsed,
      // JSON.parse rend une chaîne : on restaure le type Date attendu ailleurs.
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
    } as User;
  } catch {
    return null;
  }
};

const writeStoredUser = (user: User | null) => {
  try {
    if (user) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Navigation privée ou stockage indisponible : la session reste valable
    // pour cet onglet, elle ne survivra simplement pas au rafraîchissement.
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // On ne restaure la session que si le jeton ET l'utilisateur sont présents :
  // un utilisateur sans jeton produirait une interface connectée dont chaque
  // action serait refusée par le serveur.
  const [user, setUser] = useState<User | null>(() =>
    getAuthToken() ? readStoredUser() : null
  );

  const clearSession = () => {
    setAuthToken(null);
    writeStoredUser(null);
    setUser(null);
  };

  // Si le serveur signale que la session n'est plus valable (jeton expiré ou
  // révoqué), on déconnecte proprement au lieu de laisser une interface
  // connectée dont plus rien ne fonctionne.
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
    return () => setUnauthorizedHandler(null);
  }, []);

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

    writeStoredUser(mappedUser);
    setUser(mappedUser);
    return mappedUser;
  };

  const logout = () => {
    clearSession();
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
