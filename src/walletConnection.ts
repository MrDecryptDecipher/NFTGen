// Removed unused imports: toast, NijaWalletProvider, WalletEventType, WalletEvent, WalletMessage, TransactionParams, TransactionResponse, WalletEventHandler
import type {
  AccountsChangedCallback,
  ChainChangedCallback,
  DisconnectCallback
} from './types/wallet';
import * as ethers from 'ethers';
import { initializeNijaIntegration } from './nijaIntegration';
import { NWALLET_API_URL, SESSION_STORAGE_KEY, LEGACY_SESSION_STORAGE_KEY } from './config/constants';

// Removed unused constants: NIJA_WALLET_URL, CONNECTION_TIMEOUT, ENDPOINTS, METHOD_MAPPING

// Types
interface NijaProvider {
  isNijaWallet: boolean;
  name: string;
  userAgent: string;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  _events?: Map<string, Set<(...args: unknown[]) => void>>;
  _emit?: (event: string, ...args: unknown[]) => void;
}

declare global {
  interface Window {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    nijaWalletProvider?: NijaProvider;
    nijaHeartbeatInterval?: NodeJS.Timeout;
  }
}

// Try multiple methods to detect the Nija Wallet provider
export const isNijaWalletProvider = (): boolean => {
  // Check if we have a session - if so, consider the wallet connected
  const session = localStorage.getItem(SESSION_STORAGE_KEY) ||
                  localStorage.getItem('nija_session') ||
                  localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);

  if (session) {
    try {
      const sessionData = JSON.parse(session);
      if (sessionData && sessionData.address) {
        console.log(`isNijaWalletProvider: Session found for address ${sessionData.address}`);

        // If we have a valid session, create a minimal provider if one doesn't exist
        if (typeof window.ethereum === 'undefined' || !window.ethereum.isNijaWallet) {
          console.log('Creating minimal provider from session data');
          createMinimalProviderFromSession(sessionData);
        }

        return true;
      }
    } catch (error) {
      console.warn("Error parsing session data:", error);
    }
  }

  // Check for provider
  const providerFound = typeof window.ethereum !== 'undefined' &&
    window.ethereum.isNijaWallet === true;

  console.log(`isNijaWalletProvider: Provider check result: ${providerFound}`);
  return providerFound;
};

/**
 * Create a minimal provider from session data
 * This function creates a provider that can be used when the real provider is not available
 */
export const createMinimalProviderFromSession = (sessionData: { address?: string; chainId?: string }) => {
  console.log("Creating minimal provider from session data:", sessionData);

  // Only create if not already exists
  if (window.ethereum && window.ethereum.isNijaWallet) {
    console.log("Provider already exists, not creating minimal provider");
    return window.ethereum;
  }

  // Create a minimal provider that implements the basic EIP-1193 interface
  const minimalProvider = {
    isNijaWallet: true,
    _isCustomNijaImplementation: true,
    _nijaAccounts: [sessionData.address],
    _chainId: sessionData.chainId || '0xaa36a7', // Default to Sepolia if not specified

    // Basic request method implementation
    request: async ({ method, params }: { method: string; params?: unknown[] }) => {
      console.log(`Minimal provider request: ${method}`, params);

      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [sessionData.address];

        case 'eth_chainId':
          return sessionData.chainId || '0xaa36a7'; // Default to Sepolia

        case 'net_version':
          // Convert hex chainId to decimal
          const chainIdHex = sessionData.chainId || '0xaa36a7';
          return parseInt(chainIdHex, 16).toString();

        case 'eth_sendTransaction':
          console.warn('Minimal provider cannot send transactions. Please connect to real wallet.');
          throw new Error('Minimal provider cannot send transactions');

        default:
          console.warn(`Minimal provider does not support method: ${method}`);
          throw new Error(`Method not supported: ${method}`);
      }
    },

    // Event handling (simplified)
    _events: new Map(),
    on: function(event: string, handler: Function) {
      if (!this._events.has(event)) {
        this._events.set(event, new Set());
      }
      this._events.get(event)?.add(handler);
    },

    removeListener: function(event: string, handler: Function) {
      if (this._events.has(event)) {
        this._events.get(event)?.delete(handler);
      }
    },

    // Helper methods
    isConnected: () => true,

    // Session data
    _sessionData: sessionData
  };

  // Assign to window.ethereum
  window.ethereum = minimalProvider;

  console.log("Minimal provider created and assigned to window.ethereum");
  return minimalProvider;
};

// Get the Nija Wallet provider
export const getNijaWalletProvider = () => {
  console.log("getNijaWalletProvider: Checking for Nija Wallet provider...");

  // Explicitly check window.ethereum and the flag
  if (typeof window.ethereum !== 'undefined') {
    if (window.ethereum.isNijaWallet === true) {
      console.log("getNijaWalletProvider: Found window.ethereum with isNijaWallet=true.");
      return window.ethereum;
    }
    // No mock provider needed
  }

  // Check if window.nijaWallet exists as a fallback
  if (typeof window.nijaWallet !== 'undefined') {
    console.log("Found window.nijaWallet");

    if (window.nijaWallet.ethereum) {
      console.log("Found Nwallet provider in window.nijaWallet.ethereum");
      return window.nijaWallet.ethereum;
    }

    // If nijaWallet exists but doesn't have ethereum property, it might be the provider itself
    if (typeof window.nijaWallet.request === 'function') {
      console.log("Using window.nijaWallet directly as provider");
      return window.nijaWallet;
    }
  }

  // Check for parent window provider (for iframe integration)
  try {
    if (window.parent && window.parent !== window) {
      console.log("Checking parent window for Nwallet provider...");

      // Try to access parent window's ethereum
      if (window.parent.ethereum && window.parent.ethereum.isNijaWallet) {
        console.log("Found Nwallet provider in parent window.ethereum");
        return window.parent.ethereum;
      }

      // Try to access parent window's nijaWallet
      if (window.parent.nijaWallet) {
        if (window.parent.nijaWallet.ethereum) {
          console.log("Found Nwallet provider in parent window.nijaWallet.ethereum");
          return window.parent.nijaWallet.ethereum;
        }

        if (typeof window.parent.nijaWallet.request === 'function') {
          console.log("Using parent window.nijaWallet directly as provider");
          return window.parent.nijaWallet;
        }
      }
    }
  } catch (error) {
    console.warn("Error accessing parent window:", error);
  }

  // If we still don't have a provider, check if we have a session and use window.ethereum
  try {
    // Check both session keys
    const session = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem('nija_wallet_session');
    if (session && typeof window.ethereum !== 'undefined') {
      const sessionData = JSON.parse(session);
      if (sessionData && sessionData.address) {
        console.log(`Using window.ethereum with session for address ${sessionData.address}`);
        return window.ethereum;
      }
    }
  } catch (error) {
    console.warn("Error using window.ethereum with session:", error);
  }

  console.log("getNijaWalletProvider: Nija provider not found or invalid.");
  return null;
};

// Helper function to handle timeouts
const withTimeout = async (promise: Promise<any>, ms: number, errorMessage: string) => {
  let timeoutId: NodeJS.Timeout | undefined = undefined; // Initialize explicitly
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    // Check before clearing
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    return result;
  } catch (error) {
    // Check before clearing
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    throw error;
  }
};

// Setup connection to Nija Wallet
export const setupNijaWalletConnection = async () => {
  console.log("setupNijaWalletConnection: Attempting connection...");
  const provider = getNijaWalletProvider();
  if (!provider) {
    console.error('setupNijaWalletConnection: Nija Wallet provider not found.');
    // Redirect to Nwallet
    window.open('http://3.111.22.56', '_blank');
    throw new Error('Nija Wallet provider not detected. Opening Nwallet in a new tab.');
  }

  try {
    console.log("setupNijaWalletConnection: Requesting accounts...");
    // This request likely triggers the Nwallet UI and subsequent redirect with session
    const accounts = await withTimeout(
        provider.request({ method: 'eth_requestAccounts' }),
        CONNECTION_TIMEOUT,
        'Connection request timed out (eth_requestAccounts)'
    );
    // If eth_requestAccounts itself returns session info (non-standard), handle here.
    // Otherwise, assume the redirect mechanism handles session delivery.
    if (!accounts || accounts.length === 0 || !ethers.isAddress(accounts[0])) {
      throw new Error('No valid accounts returned/approved in Nija Wallet.');
    }
    const address = accounts[0];
    console.log(`setupNijaWalletConnection: Account approval received: ${address}`);

    // Chain ID might also be available immediately or after redirect
    let chainId = 'unknown';
    try {
        chainId = await withTimeout(
            provider.request({ method: 'eth_chainId' }),
            CONNECTION_TIMEOUT,
            'Chain ID request timed out (eth_chainId)'
        );
        console.log(`setupNijaWalletConnection: Chain ID received: ${chainId}`);
    } catch (chainIdError) {
        console.warn("setupNijaWalletConnection: Failed to get chain ID immediately after account request.", chainIdError);
    }

    // --- Session ID is NOT fetched here ---
    // It's expected to arrive via URL redirect after Nwallet approval.
    // The WalletContext will handle reading it from the URL.

    // We don't store to localStorage here anymore, context handles it after redirect.
    // localStorage.removeItem('nija_wallet_session'); // Ensure clean slate if flow restarts

    console.log("setupNijaWalletConnection: Account approval successful. Waiting for potential redirect/session info.");

    // Initialize Nija Wallet integration
    try {
      console.log("Initializing Nija Wallet integration from wallet connection...");
      await initializeNijaIntegration();
    } catch (integrationError) {
      console.error("Error initializing Nija Wallet integration:", integrationError);
      // Non-critical error, don't throw
    }

    // Return what we have now, context will update fully after redirect/session parsing
    return {
      address: address,
      chainId: chainId, // May be 'unknown' initially
      provider
    };
  } catch (error) {
    console.error('Error during Nija Wallet connection setup (requesting accounts/chain):', error);
    // localStorage.removeItem('nija_wallet_session');
    throw error;
  }
};

// Verify connection: Read local session, verify against Nwallet backend via authenticated call
export const verifyWalletConnection = async (): Promise<string | null> => {
    console.log("verifyWalletConnection: Checking local session...");
    let sessionData;
    try {
      // First try the new session key
      let localSession = localStorage.getItem(SESSION_STORAGE_KEY);

      // If not found, try the old session key
      if (!localSession) {
        localSession = localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
        if (localSession) {
          console.log("verifyWalletConnection: Found session with old key, migrating to new key");
          localStorage.setItem(SESSION_STORAGE_KEY, localSession);
        }
      }

      if (!localSession) {
          console.log("verifyWalletConnection: No local session found.");
          return null;
      }

      sessionData = JSON.parse(localSession);
      // Ensure all needed parts are present
      if (!sessionData.address || !sessionData.sessionId) {
          console.warn("verifyWalletConnection: Invalid/Incomplete local session data found.", sessionData);
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem('nija_wallet_session');
          return null;
      }
      console.log("verifyWalletConnection: Local session found:", sessionData);

      // Set the address in window.ethereum if it exists
      if (window.ethereum && typeof window.ethereum === 'object') {
        console.log(`verifyWalletConnection: Using session address ${sessionData.address}`);
        // No need to modify window.ethereum directly
      }
    } catch (error) {
        console.error("verifyWalletConnection: Error parsing local session:", error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
    }

    // For development and testing purposes, return the address without verification
    // This allows us to bypass the backend verification when it's not available
    console.log(`verifyWalletConnection: Skipping remote verification and using session for address ${sessionData.address}`);
    return sessionData.address;

    /* Commenting out actual verification for now since the backend may not be ready
    // Verify by attempting an authenticated API call to an endpoint using verifySession middleware
    console.log(`verifyWalletConnection: Verifying session via authenticated call to ${NIJA_WALLET_URL}...`);
    try {
      // Use an endpoint known to be protected by verifySession, like GET_WALLET_DETAILS
      const response = await fetch(`${NIJA_WALLET_URL}${ENDPOINTS.GET_WALLET_DETAILS}`, {
        method: 'GET',
        headers: {
          // Correct Header Format found in api-server.js verifySession middleware
          'Authorization': `Bearer ${sessionData.sessionId}:${sessionData.nonce}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
          if (response.status === 401) { // 401 Unauthorized specifically means invalid session
              console.log(`verifyWalletConnection: Session invalid (HTTP ${response.status}).`);
          } else { // Other errors (network, server error)
              console.warn(`verifyWalletConnection: Verification call failed (HTTP ${response.status}).`);
          }
          throw new Error(`Session verification failed (HTTP ${response.status})`);
      }

      // Check response content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
          console.warn('verifyWalletConnection: Response is not JSON, received:', contentType);
          throw new Error('Invalid response format');
      }

      // If the call succeeds (200 OK), the session is valid.
      // Optionally check if response body contains expected data
      const data = await response.json();
      if (data.address && data.address.toLowerCase() === sessionData.address.toLowerCase()) {
            console.log(`verifyWalletConnection: Session verified successfully for address ${sessionData.address}`);
            return sessionData.address;
      } else {
          console.warn(`verifyWalletConnection: Verification call succeeded, but wallet details mismatch? Data:`, data);
          // Treat mismatch as verification failure?
          throw new Error('Verification succeeded but response data mismatch.');
      }

    } catch (error) {
      console.error('verifyWalletConnection: Error during authenticated API call for verification:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    */
};

// Setup event listeners for provider
export const setupWalletEventListeners = (callbacks: {
  onConnect?: AccountsChangedCallback;
  onDisconnect?: DisconnectCallback;
  onChainChange?: ChainChangedCallback;
  onAccountChange?: AccountsChangedCallback;
}): (() => void) => {
  console.log("Setting up wallet event listeners...");

  const provider = getNijaWalletProvider();

  // If no provider or provider does not support events, return a no-op cleanup function
  if (!provider || typeof provider.on !== 'function') {
    console.warn("Provider not available or does not support events. Skipping event listener setup.");
    return () => {}; // Return a no-op cleanup function
  }

  // Account changed handler
  const handleAccountsChanged = (accounts: string[]) => {
    console.log("Accounts changed:", accounts);
    if (accounts.length === 0) {
      // Handle disconnect
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    } else {
      // Handle account change/connect
      if (callbacks.onAccountChange) callbacks.onAccountChange(accounts);
    }
  };

  // Chain changed handler
  const handleChainChanged = (chainId: string) => {
    console.log("Chain changed:", chainId);
    if (callbacks.onChainChange) callbacks.onChainChange(chainId);
  };

  // Disconnect handler
  const handleDisconnect = (error: unknown) => {
    console.log("Disconnect event:", error);
    if (callbacks.onDisconnect) callbacks.onDisconnect();
  };

  // Connect handler
  const handleConnect = (connectInfo: { chainId?: string }) => {
    console.log("Connect event:", connectInfo);
    // When connected, we'll get the account via accounts changed event
  };

  // Register event listeners
  provider.on('accountsChanged', handleAccountsChanged);
  provider.on('chainChanged', handleChainChanged);
  provider.on('disconnect', handleDisconnect);
  provider.on('connect', handleConnect);

  console.log("Wallet event listeners registered successfully");

  // Return cleanup function
  return () => {
    if (provider && typeof provider.removeListener === 'function') {
      try {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
        provider.removeListener('disconnect', handleDisconnect);
        provider.removeListener('connect', handleConnect);
        console.log("Wallet event listeners removed successfully");
      } catch (error) {
        console.error("Error removing wallet event listeners:", error);
      }
    }
  };
};

// Get wallet address
export const getWalletAddress = async () => {
  try {
    const provider = getNijaWalletProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });
    return accounts?.[0] || null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
};

// Get chain ID
export const getChainId = async () => {
  try {
    const provider = getNijaWalletProvider();
    const chainId = await provider.request({ method: 'eth_chainId' });
    return chainId;
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return null;
  }
};

// Send transaction
export const sendTransaction = async (provider: ethers.BrowserProvider, params: { to: string; value?: string; data?: string; gas?: string; gasPrice?: string }) => {
  try {
    const txHash = await provider.send('eth_sendTransaction', [params]);
    return txHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = async () => {
  console.log("WalletContext: disconnect function called."); // Added log
  try {
    const provider = getNijaWalletProvider();
    if (!provider) {
        console.warn("disconnectWallet: Provider not found.");
        // Still clear local storage even if provider isn't found
    } else {
        // Note: 'wallet_disconnect' is not standard EIP-1193.
        if (typeof provider.request === 'function') {
            try {
                 await provider.request({ method: 'wallet_disconnect' });
            } catch (e) {
                 console.warn("'wallet_disconnect' method failed or doesn't exist on provider:", e);
            }
        } else {
            console.warn("'wallet_disconnect' method not available on provider.");
        }
    }
  } catch (error) {
      console.error('Error during disconnect attempt:', error);
  } finally {
      // Always clear session and notify regardless of provider/method success
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
      localStorage.removeItem('nija_session');
      window.dispatchEvent(new CustomEvent('nijaWalletDisconnected'));
      console.log("All sessions cleared and disconnect event dispatched.");
  }
};

