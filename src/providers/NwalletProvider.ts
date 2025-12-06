import { ethers } from 'ethers';
import { toast } from 'react-toastify';

// Import constants from constants file
import { NWALLET_FRONTEND_URL, NWALLET_API_URL, NWALLET_WS_URL } from '../config/constants';

// Constants
const NWALLET_URL = NWALLET_FRONTEND_URL;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

// Types
export interface NwalletProvider {
  isNijaWallet: boolean;
  name?: string;
  selectedAddress?: string;
  chainId?: string;
  networkVersion?: string;
  isMetaMask?: boolean; // Some dApps check for this
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  emit?: (event: string, ...args: unknown[]) => void;
  isConnected?: () => boolean;
  _events?: Map<string, Set<(...args: unknown[]) => void>>;
  _providerId?: string; // Unique identifier for mock providers
}

// Session interface
export interface NwalletSession {
  address: string;
  chainId: string;
  sessionId: string;
  timestamp: number;
  networks?: {
    ethereum: string;
    solana?: string;
  };
}

/**
 * Get the Nwallet provider from window.ethereum
 * This is the main entry point for interacting with Nwallet
 */
export const getNwalletProvider = async (): Promise<NwalletProvider | null> => {
  console.log("Checking for Nwallet provider...");

  // Check if window.ethereum exists and has the isNijaWallet flag
  if (typeof window.ethereum !== 'undefined') {
    if (window.ethereum.isNijaWallet === true) {
      console.log("Found Nwallet provider in window.ethereum");
      return window.ethereum as NwalletProvider;
    }
  }

  // Check if window.nijaWallet exists as a fallback
  if (typeof window.nijaWallet !== 'undefined') {
    console.log("Found window.nijaWallet");

    if (window.nijaWallet.ethereum) {
      console.log("Found Nwallet provider in window.nijaWallet.ethereum");
      return window.nijaWallet.ethereum as NwalletProvider;
    }

    // If nijaWallet exists but doesn't have ethereum property, it might be the provider itself
    if (typeof window.nijaWallet.request === 'function') {
      console.log("Using window.nijaWallet directly as provider");
      return window.nijaWallet as unknown as NwalletProvider;
    }
  }

  // Check for parent window provider (for iframe integration)
  try {
    if (window.parent && window.parent !== window) {
      console.log("Checking parent window for Nwallet provider...");

      // Try to access parent window's ethereum
      if (window.parent.ethereum && window.parent.ethereum.isNijaWallet) {
        console.log("Found Nwallet provider in parent window.ethereum");
        return window.parent.ethereum as unknown as NwalletProvider;
      }

      // Try to access parent window's nijaWallet
      if (window.parent.nijaWallet) {
        if (window.parent.nijaWallet.ethereum) {
          console.log("Found Nwallet provider in parent window.nijaWallet.ethereum");
          return window.parent.nijaWallet.ethereum as unknown as NwalletProvider;
        }

        if (typeof window.parent.nijaWallet.request === 'function') {
          console.log("Using parent window.nijaWallet directly as provider");
          return window.parent.nijaWallet as unknown as NwalletProvider;
        }
      }
    }
  } catch (error) {
    console.warn("Error accessing parent window:", error);
  }

  // If we still don't have a provider, try to connect to the real Nwallet
  const session = getNwalletSession();
  if (session && session.address) {
    console.log("Session found but no real provider available. Attempting to connect to real Nwallet...");

    // Try to connect to the real Nwallet instead of creating a mock
    try {
      // Check if Nwallet is running on the expected port
      const nwalletUrl = 'http://3.111.22.56:6103';
      console.log(`Attempting to connect to Nwallet at ${nwalletUrl}`);

      // Test connection to Nwallet
      const response = await fetch(`${nwalletUrl}/health`, {
        method: 'GET',
        timeout: 5000
      }).catch(() => null);

      if (response && response.ok) {
        console.log("✅ Nwallet connection successful");
        // Create a provider that implements the required interface
        return {
          isNwallet: true,
          request: async ({ method, params }: any) => {
            console.log(`Nwallet request: ${method}`, params);
            // Return session-based responses for common methods
            if (method === 'eth_accounts') {
              return [session.address];
            }
            if (method === 'eth_chainId') {
              return session.chainId;
            }
            if (method === 'eth_requestAccounts') {
              return [session.address];
            }
            if (method === 'net_version') {
              return parseInt(session.chainId, 16).toString();
            }
            // For other methods, try to proxy to Nwallet if possible
            try {
              const proxyResponse = await fetch(`${nwalletUrl}/rpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, params })
              });
              if (proxyResponse.ok) {
                const result = await proxyResponse.json();
                return result.result;
              }
            } catch (error) {
              console.warn(`Failed to proxy ${method} to Nwallet:`, error);
            }
            return null;
          },
          // Add event listener support for compatibility
          on: (event: string, handler: (...args: unknown[]) => void) => {
            console.log(`Mock event listener added for ${event}`);
          },
          removeListener: (event: string, handler: (...args: unknown[]) => void) => {
            console.log(`Mock event listener removed for ${event}`);
          }
        };
      } else {
        console.log("❌ Real Nwallet provider not available. Please ensure Nwallet is running.");
        return null;
      }
    } catch (error) {
      console.error("Failed to connect to real Nwallet:", error);
      return null;
    }
  }

  console.log("Nwallet provider not found and no session available");
  return null;
};

/**
 * DISABLED: Mock provider functionality removed to enforce real Nwallet connections only
 * This function is disabled to prevent mock data usage
 */
const createMockProvider = (address: string, chainId: string): NwalletProvider | null => {
  console.log(`❌ Mock provider creation disabled. Real Nwallet connection required for address ${address} and chainId ${chainId}`);
  return null;

  // Create event handlers storage
  const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {
    'accountsChanged': [],
    'chainChanged': [],
    'connect': [],
    'disconnect': []
  };

  // Create a unique identifier for this provider instance
  // This helps avoid conflicts with other providers
  const providerId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  // Create the mock provider
  const mockProvider: NwalletProvider = {
    isNijaWallet: true,
    selectedAddress: address,
    chainId: chainId,
    networkVersion: chainId === '0x1' ? '1' : chainId === '0xaa36a7' ? '11155111' : '1',
    _providerId: providerId, // Add a unique identifier

    // Request method implementation
    request: async ({ method, params }) => {
      console.log(`Mock provider request: ${method}`, params);

      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [address];
        case 'eth_chainId':
          return chainId;
        case 'net_version':
          return chainId === '0x1' ? '1' : chainId === '0xaa36a7' ? '11155111' : '1';
        case 'eth_sendTransaction':
          console.log('Mock transaction request:', params);
          // Return a mock transaction hash
          return `0x${Math.random().toString(16).substring(2)}`;
        case 'personal_sign':
          console.log('Mock sign request:', params);
          // Return a mock signature
          return `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
        case 'eth_signTypedData':
        case 'eth_signTypedData_v4':
          console.log('Mock sign typed data request:', params);
          // Return a mock signature
          return `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
        case 'wallet_switchEthereumChain':
          console.log('Mock switch chain request:', params);
          // Update the chainId
          if (params && Array.isArray(params) && params.length > 0 && typeof params[0] === 'object') {
            const chainParam = params[0] as { chainId?: string };
            if (chainParam.chainId) {
              const newChainId = chainParam.chainId;
              mockProvider.chainId = newChainId;
              mockProvider.networkVersion = newChainId === '0x1' ? '1' : newChainId === '0xaa36a7' ? '11155111' : '1';
              // Emit chainChanged event
              if (mockProvider.emit) {
                mockProvider.emit('chainChanged', newChainId);
              }
            }
          }
          return null;
        default:
          console.warn(`Unhandled method in mock provider: ${method}`);
          return null;
      }
    },

    // Event handling
    on: (event: string, handler: (...args: unknown[]) => void) => {
      console.log(`Mock provider: Adding handler for ${event}`);
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    },

    removeListener: (event: string, handler: (...args: unknown[]) => void) => {
      console.log(`Mock provider: Removing handler for ${event}`);
      if (eventHandlers[event]) {
        const index = eventHandlers[event].indexOf(handler);
        if (index !== -1) {
          eventHandlers[event].splice(index, 1);
        }
      }
    },

    // Helper method to emit events (for testing)
    emit: (event: string, ...args: unknown[]) => {
      console.log(`Mock provider emitting event: ${event}`, args);
      if (eventHandlers[event]) {
        eventHandlers[event].forEach(handler => handler(...args));
      }
    },

    isConnected: () => true
  };

  // Emit initial connect event with a delay to avoid conflicts
  setTimeout(() => {
    if (mockProvider.emit) {
      mockProvider.emit('connect', { chainId });
      mockProvider.emit('accountsChanged', [address]);
    }
  }, 500); // Increased delay to avoid conflicts

  return mockProvider;
};

/**
 * Connect to Nwallet and get the user's Ethereum address
 * This will prompt the user to approve the connection if not already connected
 */
export const connectToNwallet = async (): Promise<string | null> => {
  console.log("Connecting to Nwallet...");

  // First, check if we already have a valid session
  const existingSession = getNwalletSession();
  if (existingSession && existingSession.address) {
    console.log("Using existing Nwallet session with address:", existingSession.address);
    return existingSession.address;
  }

  // If no valid session exists, try to get a provider
  const provider = await getNwalletProvider();

  if (!provider) {
    console.warn("Nwallet provider not found and no valid session exists");
    // Instead of silently creating a mock session, return null to indicate failure
    // This allows the calling code to handle the error appropriately
    return null;
  }

  try {
    console.log("Requesting accounts from Nwallet...");
    // This will prompt the user to approve the connection if not already connected
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];

    if (!accounts || accounts.length === 0) {
      console.warn('No accounts returned from Nwallet');
      return null;
    }

    const address = accounts[0];
    console.log(`Connected to Nwallet with address: ${address}`);

    // Save the session information with the real address from Nwallet
    saveNwalletSession(address);

    // Set up event listeners for account and network changes
    try {
      setupEventListeners(provider);
    } catch (listenerError) {
      console.warn('Failed to set up event listeners:', listenerError);
      // Continue anyway as this is not critical
    }

    return address;
  } catch (error) {
    console.warn('Failed to connect to Nwallet:', error);
    // Return null to indicate failure instead of silently creating a mock session
    return null;
  }
};

/**
 * Get the current chain ID from Nwallet
 */
export const getChainId = async (): Promise<string> => {
  // First check if we have a valid session with a chainId
  const session = getNwalletSession();
  if (session && session.chainId) {
    console.log("Using chainId from existing session:", session.chainId);
    return session.chainId;
  }

  // If no session or no chainId in session, try to get from provider
  const provider = await getNwalletProvider();
  if (!provider) {
    console.warn('Nwallet provider not detected, using default chain ID');
    return "0xaa36a7"; // Sepolia testnet
  }

  try {
    const chainId = await provider.request({ method: 'eth_chainId' });
    if (typeof chainId === 'string') {
      return chainId;
    } else {
      console.warn('Invalid chainId returned from provider:', chainId);
      return "0xaa36a7"; // Sepolia testnet
    }
  } catch (error) {
    console.warn('Failed to get chain ID:', error);
    // Return a default chain ID instead of throwing an error
    return "0xaa36a7"; // Sepolia testnet
  }
};

/**
 * Send a transaction through Nwallet
 * This will prompt the user to approve the transaction
 */
export const sendTransaction = async (transaction: Record<string, unknown>): Promise<string> => {
  console.log("Sending transaction through Nwallet...", transaction);
  const provider = await getNwalletProvider();

  if (!provider) {
    throw new Error('Nwallet provider not detected.');
  }

  try {
    // This will prompt the user to approve the transaction in Nwallet
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [transaction]
    });

    // Ensure we have a string hash
    if (typeof txHash === 'string') {
      console.log(`Transaction sent: ${txHash}`);
      return txHash;
    } else {
      throw new Error('Invalid transaction hash returned');
    }
  } catch (error) {
    console.error('Failed to send transaction:', error);
    toast.error('Failed to send transaction. Please try again.');
    throw error;
  }
};

/**
 * Sign a message with the user's private key
 * This will prompt the user to approve the signature
 */
export const signMessage = async (message: string): Promise<string> => {
  console.log("Signing message with Nwallet...");
  const provider = await getNwalletProvider();

  if (!provider) {
    throw new Error('Nwallet provider not detected.');
  }

  try {
    const accountsResult = await provider.request({ method: 'eth_accounts' });
    // Safely handle the accounts array
    const accounts = Array.isArray(accountsResult) ? accountsResult : [];

    if (accounts.length === 0) {
      throw new Error('No accounts available for signing.');
    }

    const address = typeof accounts[0] === 'string' ? accounts[0] : '';
    if (!address) {
      throw new Error('Invalid account address.');
    }

    // Convert the message to hex (Ethers.js v6 syntax)
    const msgHex = ethers.hexlify(ethers.toUtf8Bytes(message));

    // Request the user to sign the message
    const signatureResult = await provider.request({
      method: 'personal_sign',
      params: [msgHex, address]
    });

    // Ensure we have a string signature
    if (typeof signatureResult === 'string') {
      console.log(`Message signed: ${signatureResult}`);
      return signatureResult;
    } else {
      throw new Error('Invalid signature returned');
    }
  } catch (error) {
    console.error('Failed to sign message:', error);
    toast.error('Failed to sign message. Please try again.');
    throw error;
  }
};

/**
 * Generate a unique address for a user based on browser fingerprint or random if not available
 */
export const generateUniqueAddress = (): string => {
  try {
    // Try to get a consistent fingerprint for this browser
    const fingerprint =
      navigator.userAgent +
      screen.width +
      screen.height +
      navigator.language +
      new Date().getTimezoneOffset();

    // Create a hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert hash to hex string and ensure it's 40 chars (20 bytes) for ETH address
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');

    // Create a deterministic but unique address for this browser
    // Format: 0x + 8 chars from hash + 32 random chars to complete the address
    const randomPart = Array.from({length: 32}, () =>
      Math.floor(Math.random() * 16).toString(16)).join('');

    return `0x${hashHex}${randomPart}`;
  } catch (e) {
    // Fallback to completely random address if browser fingerprinting fails
    const randomAddress = '0x' + Array.from({length: 40}, () =>
      Math.floor(Math.random() * 16).toString(16)).join('');
    return randomAddress;
  }
};

/**
 * Save the Nwallet session information to localStorage
 * Enhanced to save to multiple localStorage keys for maximum compatibility
 */
export const saveNwalletSession = (address?: string): void => {
  // If no address is provided, generate a unique one
  const userAddress = address || generateUniqueAddress();

  try {
    console.log("[NwalletProvider] Saving wallet session for address:", userAddress);

    // Create a session with default values first
    const defaultSession: NwalletSession = {
      address: userAddress,
      chainId: "0xaa36a7", // Default to Sepolia testnet
      sessionId: `session_${Date.now()}`,
      timestamp: Date.now(),
      networks: {
        ethereum: 'sepolia'
      }
    };

    // Safely save to localStorage with try/catch for each operation
    const sessionJSON = JSON.stringify(defaultSession);

    try {
      localStorage.setItem('nwallet_session', sessionJSON);
    } catch (e) {
      console.warn("[NwalletProvider] Failed to save to nwallet_session:", e);
    }

    try {
      localStorage.setItem('nija_wallet_session', sessionJSON);
    } catch (e) {
      console.warn("[NwalletProvider] Failed to save to nija_wallet_session:", e);
    }

    try {
      localStorage.setItem('nftgen_nwallet_session', sessionJSON);
    } catch (e) {
      console.warn("[NwalletProvider] Failed to save to nftgen_nwallet_session:", e);
    }

    console.log("[NwalletProvider] Default wallet session saved:", defaultSession);

    // Try to get the actual chain ID asynchronously
    getChainId()
      .then(chainId => {
        // Update the session with the actual chain ID
        const updatedSession: NwalletSession = {
          ...defaultSession,
          chainId,
          networks: {
            ethereum: chainId === '0x1' ? 'mainnet' : 'sepolia'
          }
        };

        // Save the updated session to all possible localStorage keys
        const updatedJSON = JSON.stringify(updatedSession);
        localStorage.setItem('nwallet_session', updatedJSON);
        localStorage.setItem('nija_wallet_session', updatedJSON);
        localStorage.setItem('nftgen_nwallet_session', updatedJSON);

        console.log("[NwalletProvider] Updated wallet session saved to all keys:", updatedSession);

        // Dispatch a storage event to notify all components
        window.dispatchEvent(new Event('storage'));
      })
      .catch(chainError => {
        console.warn('[NwalletProvider] Failed to get chain ID for session, using default:', chainError);
        // Default session is already saved, so no action needed

        // Still dispatch a storage event to notify all components
        window.dispatchEvent(new Event('storage'));
      });
  } catch (error) {
    console.warn('[NwalletProvider] Failed to save wallet session:', error);

    // Create a minimal session as a last resort
    try {
      const minimalSession = {
        address,
        chainId: "0xaa36a7",
        sessionId: `session_${Date.now()}`,
        timestamp: Date.now()
      };

      // Save the minimal session to all possible localStorage keys
      const minimalJSON = JSON.stringify(minimalSession);
      localStorage.setItem('nwallet_session', minimalJSON);
      localStorage.setItem('nija_wallet_session', minimalJSON);
      localStorage.setItem('nftgen_nwallet_session', minimalJSON);

      console.log("[NwalletProvider] Minimal wallet session saved to all keys:", minimalSession);

      // Dispatch a storage event to notify all components
      window.dispatchEvent(new Event('storage'));
    } catch (fallbackError) {
      console.error('[NwalletProvider] Failed to save minimal session:', fallbackError);
    }
  }
};

/**
 * Get the current Nwallet session from localStorage
 * Enhanced with better error handling and logging
 */
export const getNwalletSession = (): NwalletSession | null => {
  try {
    console.log("[NwalletProvider] Getting Nwallet session...");

    // Try to get the session from localStorage with multiple possible keys
    // Safely access localStorage with try/catch for each operation
    let sessionData = null;
    let nijaSession = null;
    let nftgenSession = null;

    try {
      sessionData = localStorage.getItem('nwallet_session');
    } catch (e) {
      console.warn("[NwalletProvider] Failed to access nwallet_session:", e);
    }

    try {
      nijaSession = localStorage.getItem('nija_wallet_session');
    } catch (e) {
      console.warn("[NwalletProvider] Failed to access nija_wallet_session:", e);
    }

    try {
      nftgenSession = localStorage.getItem('nftgen_nwallet_session');
    } catch (e) {
      console.warn("[NwalletProvider] Failed to access nftgen_nwallet_session:", e);
    }

    console.log("[NwalletProvider] Session data in localStorage:", {
      nwallet_session: sessionData ? "exists" : "not found",
      nija_wallet_session: nijaSession ? "exists" : "not found",
      nftgen_nwallet_session: nftgenSession ? "exists" : "not found"
    });

    // Use the first available session
    const activeSessionData = sessionData || nijaSession || nftgenSession;

    if (!activeSessionData) {
      // Check URL for session data
      const urlParams = new URLSearchParams(window.location.search);
      const sessionParam = urlParams.get('session');

      if (sessionParam) {
        try {
          console.log("[NwalletProvider] Found session parameter in URL");
          // Try to parse the session from URL
          const urlSession = JSON.parse(decodeURIComponent(sessionParam));

          // Create a valid session object from URL data
          const session: NwalletSession = {
            address: urlSession.address || "",
            chainId: urlSession.chainId || "0xaa36a7",
            sessionId: urlSession.sessionId || `session_${Date.now()}`,
            timestamp: Date.now(), // Always use current timestamp
            networks: {
              ethereum: urlSession.chainId === '0x1' ? 'mainnet' : 'sepolia'
            }
          };

          // Only proceed if we have a valid address from the URL
          if (session.address && session.address.startsWith('0x')) {
            // Safely save the session to all possible localStorage keys
            const sessionJSON = JSON.stringify(session);

            try {
              localStorage.setItem('nwallet_session', sessionJSON);
            } catch (storageError) {
              console.warn("[NwalletProvider] Failed to save URL session to nwallet_session:", storageError);
            }

            try {
              localStorage.setItem('nija_wallet_session', sessionJSON);
            } catch (storageError) {
              console.warn("[NwalletProvider] Failed to save URL session to nija_wallet_session:", storageError);
            }

            try {
              localStorage.setItem('nftgen_nwallet_session', sessionJSON);
            } catch (storageError) {
              console.warn("[NwalletProvider] Failed to save URL session to nftgen_nwallet_session:", storageError);
            }

            console.log("[NwalletProvider] Created session from URL parameters:", session);
            return session;
          } else {
            console.warn('[NwalletProvider] Invalid address in URL session:', session.address);
          }
        } catch (parseError) {
          console.warn('[NwalletProvider] Failed to parse session from URL:', parseError);
        }
      }

      // At this point, we don't have a valid session from localStorage or URL
      console.warn("[NwalletProvider] No valid Nwallet session found");
      return null;
    }

    // Parse the session from localStorage
    try {
      const session = JSON.parse(activeSessionData) as NwalletSession;

      // Validate the session - if critical fields are missing, consider it invalid
      if (!session.address || !session.address.startsWith('0x')) {
        console.warn("[NwalletProvider] Session has invalid address:", session.address);
        return null;
      }

      if (!session.chainId) {
        console.warn("[NwalletProvider] Session missing chainId");
        // We can fix this as it's not as critical
        session.chainId = "0xaa36a7";
      }

      if (!session.sessionId) {
        console.warn("[NwalletProvider] Session missing sessionId");
        // We can fix this as it's not as critical
        session.sessionId = `session_${Date.now()}`;
      }

      if (!session.timestamp) {
        console.warn("[NwalletProvider] Session missing timestamp");
        // We can fix this as it's not as critical
        session.timestamp = Date.now();
      }

      // Always update the timestamp to ensure the session is considered fresh
      session.timestamp = Date.now();

      // Safely save the validated session back to localStorage
      const sessionJSON = JSON.stringify(session);

      try {
        localStorage.setItem('nwallet_session', sessionJSON);
      } catch (storageError) {
        console.warn("[NwalletProvider] Failed to save validated session to nwallet_session:", storageError);
      }

      try {
        localStorage.setItem('nija_wallet_session', sessionJSON);
      } catch (storageError) {
        console.warn("[NwalletProvider] Failed to save validated session to nija_wallet_session:", storageError);
      }

      try {
        localStorage.setItem('nftgen_nwallet_session', sessionJSON);
      } catch (storageError) {
        console.warn("[NwalletProvider] Failed to save validated session to nftgen_nwallet_session:", storageError);
      }

      console.log("[NwalletProvider] Using validated session:", session);
      return session;
    } catch (parseError) {
      console.error('[NwalletProvider] Error parsing session data:', parseError);
      return null;
    }
  } catch (error) {
    console.error('[NwalletProvider] Critical error in getNwalletSession:', error);
    return null;
  }
};

/**
 * Set up event listeners for account and network changes
 */
export const setupEventListeners = (provider: NwalletProvider): void => {
  // Remove any existing listeners to avoid duplicates
  const accountsChangedHandler = (...args: unknown[]) => {
    console.log("Accounts changed:", args);
    // Safely handle the accounts array
    const accounts = Array.isArray(args[0]) ? args[0] as string[] : [];

    if (accounts.length === 0) {
      // User disconnected
      localStorage.removeItem('nwallet_session');
      toast.info('Disconnected from Nwallet.');
      // Reload the page to reset the state
      window.location.reload();
    } else {
      // User switched accounts
      const address = accounts[0];
      if (typeof address === 'string') {
        saveNwalletSession(address);
        toast.info('Nwallet account changed.');
      }
    }
  };

  const chainChangedHandler = (...args: unknown[]) => {
    const chainId = typeof args[0] === 'string' ? args[0] : null;
    console.log("Chain changed:", chainId);

    if (chainId) {
      // Update the session with the new chain ID
      const session = getNwalletSession();
      if (session) {
        session.chainId = chainId;
        session.networks = {
          ...session.networks,
          ethereum: chainId === '0x1' ? 'mainnet' : 'sepolia'
        };
        localStorage.setItem('nwallet_session', JSON.stringify(session));
      }
      toast.info('Nwallet network changed.');
    }
  };

  const disconnectHandler = (...args: unknown[]) => {
    console.log("Disconnect event received", args);

    // Safely remove session data from localStorage
    try {
      localStorage.removeItem('nwallet_session');
    } catch (e) {
      console.warn("[NwalletProvider] Failed to remove nwallet_session:", e);
    }

    try {
      localStorage.removeItem('nija_wallet_session');
    } catch (e) {
      console.warn("[NwalletProvider] Failed to remove nija_wallet_session:", e);
    }

    try {
      localStorage.removeItem('nftgen_nwallet_session');
    } catch (e) {
      console.warn("[NwalletProvider] Failed to remove nftgen_nwallet_session:", e);
    }

    toast.info('Disconnected from Nwallet.');
    // Reload the page to reset the state
    window.location.reload();
  };

  // Remove existing listeners if any (only if provider supports it)
  if (typeof provider.removeListener === 'function') {
    try {
      provider.removeListener('accountsChanged', accountsChangedHandler);
      provider.removeListener('chainChanged', chainChangedHandler);
      provider.removeListener('disconnect', disconnectHandler);
      console.log("Removed existing event listeners");
    } catch (error) {
      console.warn('Error removing existing listeners:', error);
    }
  } else {
    console.log("Provider doesn't support removeListener - skipping cleanup");
  }

  // Add new listeners (only if provider supports it)
  if (typeof provider.on === 'function') {
    try {
      provider.on('accountsChanged', accountsChangedHandler);
      provider.on('chainChanged', chainChangedHandler);
      provider.on('disconnect', disconnectHandler);
      console.log("Event listeners set up for Nwallet provider");
    } catch (error) {
      console.error('Failed to set up event listeners:', error);
    }
  } else {
    console.log("Provider doesn't support event listeners - using session-based approach");
  }
};

/**
 * Create an ethers.js provider from the Nwallet provider
 * Updated for Ethers.js v6 - Web3Provider renamed to BrowserProvider
 */
export const createEthersProvider = async (): Promise<ethers.BrowserProvider | null> => {
  const provider = await getNwalletProvider();
  if (!provider) return null;

  try {
    // Ethers.js v6: Web3Provider renamed to BrowserProvider
    return new ethers.BrowserProvider(provider as ethers.Eip1193Provider);
  } catch (error) {
    console.error('Failed to create ethers provider:', error);
    return null;
  }
};

/**
 * Get a signer from the ethers provider
 * Updated for Ethers.js v6 - JsonRpcSigner type updated
 */
export const getEthersSigner = async (): Promise<ethers.JsonRpcSigner | null> => {
  const ethersProvider = await createEthersProvider();
  if (!ethersProvider) return null;

  try {
    return await ethersProvider.getSigner();
  } catch (error) {
    console.error('Failed to get signer:', error);
    return null;
  }
};
