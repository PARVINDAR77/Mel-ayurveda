'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAccessToken, getAccessToken, getErrorMessage } from '../lib/api-client';

export type RoleType =
  | 'SUPER_ADMIN'
  | 'SALESPERSON'
  | 'PENDING_REVIEWER'
  | 'APPROVAL_OFFICER'
  | 'MANAGEMENT'
  | 'FOLLOWUP_EXECUTIVE';

export interface UserProfile {
  id: string;
  employeeCode: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: RoleType;
  isActive: boolean;
  isAcceptingLeads?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getPanelRoute: (role?: RoleType) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getPanelRoute(role?: RoleType): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'SALESPERSON':
      return '/sales';
    case 'PENDING_REVIEWER':
      return '/pending';
    case 'APPROVAL_OFFICER':
      return '/approval';
    case 'MANAGEMENT':
      return '/management';
    case 'FOLLOWUP_EXECUTIVE':
      return '/sales/customer-care';
    default:
      return '/login';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      try {
        const refreshRes = await apiClient.post('/auth/refresh');
        token = refreshRes.data?.accessToken;
        if (token) setAccessToken(token);
      } catch {
        setUser(null);
        setIsLoading(false);
        return;
      }
    }

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, user: loggedUser } = res.data;

      setAccessToken(accessToken);
      setUser(loggedUser);

      const targetPath = getPanelRoute(loggedUser.role);
      router.push(targetPath);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: getErrorMessage(err),
      };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        getPanelRoute: (role) => getPanelRoute(role || user?.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
