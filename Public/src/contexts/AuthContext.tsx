import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState, LoginCredentials } from '@/types';
import { authApi } from '@/utils/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      
      // Check if we have a session
      const response = await fetch('/api/user.php', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setState({
            user: data.data,
            isLoggedIn: true,
            isLoading: false,
          });
          return;
        }
      }

      // No valid session
      setState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Set up periodic auth check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isLoggedIn) {
        checkAuth();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isLoggedIn, checkAuth]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      
      const response = await authApi.login(credentials);
      
      if (response.success && response.data?.userId) {
        // Fetch user data
        await checkAuth();
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      setState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      
      await authApi.logout();
      
      setState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setState({
        user: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
