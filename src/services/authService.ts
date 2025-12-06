/**
 * Centralized Authentication Service for NFTGen
 * 
 * This service handles all authentication-related operations including:
 * - Session management and storage
 * - Wallet address retrieval
 * - Authentication state validation
 * - Integration with Nwallet authentication system
 */

import { SESSION_STORAGE_KEY, NWALLET_API_URL } from '../config/constants';

export interface AuthSession {
  sessionId: string;
  address: string;
  email?: string;
  userId?: string;
  createdAt: number;
  lastActivity: number;
  isValid: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  ethAddress: string;
  solAddress: string;
  profile?: any;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  sessionId: string;
  user: AuthUser;
}

export class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;
  private authListeners: ((session: AuthSession | null) => void)[] = [];

  private constructor() {
    this.initializeFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    try {
      // Try to load session from standardized storage key
      const sessionData = this.getStoredSession();
      if (sessionData) {
        this.currentSession = sessionData;
        console.log('🔐 AuthService: Initialized with existing session for address:', sessionData.address);
      } else {
        console.log('🔐 AuthService: No existing session found');
      }
    } catch (error) {
      console.error('🔐 AuthService: Error initializing from storage:', error);
      this.clearSession();
    }
  }

  /**
   * Get stored session from localStorage with migration support
   */
  private getStoredSession(): AuthSession | null {
    // Try primary session key first
    let sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
    
    // If not found, try legacy keys and migrate
    if (!sessionStr) {
      const legacyKeys = [
        'nija_wallet_session',
        'nwallet_session',
        'nftgen_session',
        'nija_session'
      ];
      
      for (const key of legacyKeys) {
        sessionStr = localStorage.getItem(key);
        if (sessionStr) {
          console.log(`🔐 AuthService: Found session in legacy key ${key}, migrating...`);
          break;
        }
      }
    }

    if (!sessionStr) {
      return null;
    }

    try {
      const sessionData = JSON.parse(sessionStr);
      
      // Normalize session format
      const normalizedSession: AuthSession = {
        sessionId: sessionData.sessionId || sessionData.id || sessionData.session_id,
        address: sessionData.address || sessionData.ethAddress,
        email: sessionData.email,
        userId: sessionData.userId || sessionData.id,
        createdAt: sessionData.createdAt || Date.now(),
        lastActivity: Date.now(),
        isValid: true
      };

      // Validate required fields
      if (!normalizedSession.sessionId || !normalizedSession.address) {
        console.warn('🔐 AuthService: Invalid session data - missing required fields');
        return null;
      }

      // Store in standardized format
      this.storeSession(normalizedSession);
      
      return normalizedSession;
    } catch (error) {
      console.error('🔐 AuthService: Error parsing session data:', error);
      return null;
    }
  }

  /**
   * Store session in localStorage using standardized format
   */
  private storeSession(session: AuthSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      
      // Clean up legacy session keys
      const legacyKeys = [
        'nija_wallet_session',
        'nwallet_session', 
        'nftgen_session',
        'nija_session'
      ];
      
      legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🔐 AuthService: Session stored successfully');
    } catch (error) {
      console.error('🔐 AuthService: Error storing session:', error);
    }
  }

  /**
   * Authenticate with Nwallet system
   */
  public async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 AuthService: Attempting login for:', email);
      
      const response = await fetch(`${NWALLET_API_URL}/api/nftgen-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const loginData: LoginResponse = await response.json();
      
      if (loginData.success && loginData.sessionId && loginData.user) {
        // Create session object
        const session: AuthSession = {
          sessionId: loginData.sessionId,
          address: loginData.user.ethAddress,
          email: loginData.user.email,
          userId: loginData.user.id,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          isValid: true
        };

        // Store session
        this.currentSession = session;
        this.storeSession(session);
        
        // Notify listeners
        this.notifyAuthListeners(session);
        
        console.log('🔐 AuthService: Login successful for address:', session.address);
        return loginData;
      } else {
        throw new Error(loginData.message || 'Login failed');
      }
    } catch (error) {
      console.error('🔐 AuthService: Login error:', error);
      throw error;
    }
  }

  /**
   * Get current authentication session
   */
  public getSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Get current wallet address
   */
  public getWalletAddress(): string | null {
    return this.currentSession?.address || null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentSession !== null && this.currentSession.isValid;
  }

  /**
   * Get user credentials for blockchain operations
   */
  public async getUserCredentials(): Promise<any> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      const response = await fetch(`${NWALLET_API_URL}/api/nftgen-auth/credentials/${this.currentSession.sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get credentials: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.credentials;
      } else {
        throw new Error('Failed to retrieve credentials');
      }
    } catch (error) {
      console.error('🔐 AuthService: Error getting credentials:', error);
      throw error;
    }
  }

  /**
   * Validate current session with backend
   */
  public async validateSession(): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const response = await fetch(`${NWALLET_API_URL}/api/nftgen-auth/profile/${this.currentSession.sessionId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update last activity
          this.currentSession.lastActivity = Date.now();
          this.storeSession(this.currentSession);
          return true;
        }
      }
      
      // Session is invalid
      this.clearSession();
      return false;
    } catch (error) {
      console.error('🔐 AuthService: Session validation error:', error);
      return false;
    }
  }

  /**
   * Clear current session and logout
   */
  public clearSession(): void {
    this.currentSession = null;
    
    // Clear all possible session keys
    const sessionKeys = [
      SESSION_STORAGE_KEY,
      'nija_wallet_session',
      'nwallet_session',
      'nftgen_session', 
      'nija_session'
    ];
    
    sessionKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Notify listeners
    this.notifyAuthListeners(null);
    
    console.log('🔐 AuthService: Session cleared');
  }

  /**
   * Add authentication state listener
   */
  public addAuthListener(listener: (session: AuthSession | null) => void): void {
    this.authListeners.push(listener);
  }

  /**
   * Remove authentication state listener
   */
  public removeAuthListener(listener: (session: AuthSession | null) => void): void {
    const index = this.authListeners.indexOf(listener);
    if (index > -1) {
      this.authListeners.splice(index, 1);
    }
  }

  /**
   * Notify all authentication listeners
   */
  private notifyAuthListeners(session: AuthSession | null): void {
    this.authListeners.forEach(listener => {
      try {
        listener(session);
      } catch (error) {
        console.error('🔐 AuthService: Error in auth listener:', error);
      }
    });
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
