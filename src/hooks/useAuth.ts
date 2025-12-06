/**
 * Authentication Hook for NFTGen Components
 * 
 * This hook provides a React interface to the centralized authentication service
 * and manages authentication state for components.
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, AuthSession, LoginResponse } from '../services/authService';

export interface UseAuthReturn {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  session: AuthSession | null;
  walletAddress: string | null;
  error: string | null;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  validateSession: () => Promise<boolean>;
  getUserCredentials: () => Promise<any>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get current session from auth service
        const currentSession = authService.getSession();
        
        if (currentSession) {
          // Validate session with backend
          const isValid = await authService.validateSession();
          
          if (isValid) {
            setSession(currentSession);
            setIsAuthenticated(true);
            console.log('🔐 useAuth: Session validated successfully');
          } else {
            console.log('🔐 useAuth: Session validation failed');
            setSession(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('🔐 useAuth: No existing session found');
          setSession(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('🔐 useAuth: Error initializing auth:', error);
        setError('Failed to initialize authentication');
        setSession(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const handleAuthChange = (newSession: AuthSession | null) => {
      setSession(newSession);
      setIsAuthenticated(newSession !== null);
      
      if (newSession) {
        console.log('🔐 useAuth: Authentication state changed - logged in');
      } else {
        console.log('🔐 useAuth: Authentication state changed - logged out');
      }
    };

    authService.addAuthListener(handleAuthChange);

    return () => {
      authService.removeAuthListener(handleAuthChange);
    };
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔐 useAuth: Attempting login...');
      const loginResponse = await authService.login(email, password);
      
      // Auth service will update session and notify listeners
      console.log('🔐 useAuth: Login successful');
      return loginResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      console.error('🔐 useAuth: Login error:', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    try {
      console.log('🔐 useAuth: Logging out...');
      authService.clearSession();
      setError(null);
    } catch (error) {
      console.error('🔐 useAuth: Logout error:', error);
      setError('Failed to logout');
    }
  }, []);

  // Validate session function
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const isValid = await authService.validateSession();
      
      if (!isValid) {
        setSession(null);
        setIsAuthenticated(false);
      }
      
      return isValid;
    } catch (error) {
      console.error('🔐 useAuth: Session validation error:', error);
      setError('Failed to validate session');
      return false;
    }
  }, []);

  // Get user credentials function
  const getUserCredentials = useCallback(async (): Promise<any> => {
    try {
      setError(null);
      return await authService.getUserCredentials();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get credentials';
      console.error('🔐 useAuth: Get credentials error:', errorMessage);
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get wallet address
  const walletAddress = session?.address || null;

  return {
    isAuthenticated,
    isLoading,
    session,
    walletAddress,
    error,
    login,
    logout,
    validateSession,
    getUserCredentials,
    clearError
  };
};

/**
 * Authentication utility functions for non-React contexts
 */
export const authUtils = {
  /**
   * Get current wallet address
   */
  getWalletAddress: (): string | null => {
    return authService.getWalletAddress();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return authService.isAuthenticated();
  },

  /**
   * Get current session
   */
  getSession: (): AuthSession | null => {
    return authService.getSession();
  },

  /**
   * Get session ID for API calls
   */
  getSessionId: (): string | null => {
    const session = authService.getSession();
    return session?.sessionId || null;
  },

  /**
   * Get user credentials for blockchain operations
   */
  getUserCredentials: async (): Promise<any> => {
    return await authService.getUserCredentials();
  },

  /**
   * Validate current session
   */
  validateSession: async (): Promise<boolean> => {
    return await authService.validateSession();
  },

  /**
   * Clear session and logout
   */
  logout: (): void => {
    authService.clearSession();
  },

  /**
   * Create session object for localStorage compatibility
   */
  createSessionObject: (sessionId: string, address: string, email?: string): AuthSession => {
    return {
      sessionId,
      address,
      email,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      isValid: true
    };
  },

  /**
   * Format session for API calls
   */
  formatSessionForAPI: (): { sessionId: string; address: string } | null => {
    const session = authService.getSession();
    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      address: session.address
    };
  }
};

export default useAuth;
