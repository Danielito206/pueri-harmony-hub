import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/lib/types';
import { mockTeachers, mockParents } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock admin user
const mockAdmin: User = {
  id: 'admin1',
  email: 'admin@pueriangeli.cd',
  firstName: 'Administrateur',
  lastName: 'Système',
  role: 'admin',
  createdAt: new Date('2023-01-01'),
};

// Mock credentials for demo
const mockCredentials: { email: string; password: string; user: User }[] = [
  { email: 'admin@pueriangeli.cd', password: 'admin123', user: mockAdmin },
  { email: 'marie.dupont@pueriangeli.cd', password: 'prof123', user: mockTeachers[0] },
  { email: 'parent.mutombo@email.com', password: 'parent123', user: mockParents[0] },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const credential = mockCredentials.find(
      c => c.email === email && c.password === password
    );
    
    if (credential) {
      setUser(credential.user);
      return true;
    }
    return false;
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
