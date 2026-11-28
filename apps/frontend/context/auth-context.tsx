'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAccessToken, getAccessToken, refreshAuthToken, getErrorMessage } from '../lib/api-client';

const USER_STORAGE_KEY = 'mel_user_profile';
const TOKEN_STORAGE_KEY = 'mel_access_token';

export type RoleType =
  | 'SUPER_ADMIN'
  | 'SALESPERSON'
  | 'PENDING_REVIEWER'
  | 'APPROVAL_OFFICER'
  | 'MANAGEMENT'
  | 'FOLLOWUP_EXECUTIVE'
  | 'BILLING_EXECUTIVE';

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

export interface LoginResult {
  success: boolean;
  error?: string;
  isLocked?: boolean;
  lockoutUntil?: string;
  remainingSeconds?: number;
  lockoutCycle?: number;
  remainingAttempts?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
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
      return '/approval';
    case 'APPROVAL_OFFICER':
      return '/approval';
    case 'MANAGEMENT':
      return '/management';
    case 'FOLLOWUP_EXECUTIVE':
      return '/sales/customer-care';
    case 'BILLING_EXECUTIVE':
      return '/billing';
    default:
      return '/login';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(USER_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignore JSON parse errors
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (savedUser && savedToken) {
          return false; // Already hydrated synchronously!
        }
      } catch {}
    }
    return true;
  });

  const router = useRouter();

  const refreshUser = useCallback(async () => {
    let token = getAccessToken();
    if (!token) {
      try {
        token = await refreshAuthToken();
      } catch {
        setUser(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {}
        }
        setIsLoading(false);
        return;
      }
    }

    if (!token) {
      setUser(null);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {}
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
        } catch {}
      }
    } catch (err: any) {
      // Only clear credentials if backend explicitly reports 401 unauthorized
      if (err?.response?.status === 401) {
        setUser(null);
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {}
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Synchronously ensure state is populated from localStorage on client mount
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem(USER_STORAGE_KEY);
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (savedUser && savedToken) {
          setUser((prev) => prev || JSON.parse(savedUser));
          setIsLoading(false);
        }
      } catch {}
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { accessToken, user: loggedUser } = res.data;

      setAccessToken(accessToken);
      setUser(loggedUser);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
        } catch {}
      }

      const targetPath = getPanelRoute(loggedUser.role);
      router.push(targetPath);
      return { success: true };
    } catch (err: any) {
      const responseData = err.response?.data;
      const isLocked =
        err.response?.status === 423 ||
        responseData?.error === 'AccountLocked' ||
        responseData?.statusCode === 423;

      return {
        success: false,
        error: getErrorMessage(err),
        isLocked,
        lockoutUntil: responseData?.lockoutUntil,
        remainingSeconds: responseData?.remainingSeconds,
        lockoutCycle: responseData?.lockoutCycle,
        remainingAttempts: responseData?.remainingAttempts,
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {}
      }
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
