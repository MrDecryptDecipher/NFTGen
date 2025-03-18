import { toast } from 'react-toastify';
import type {
  NijaWalletProvider,
  WalletEventType,
  WalletEvent,
  WalletMessage,
  TransactionParams,
  TransactionResponse,
  AccountsChangedCallback,
  ChainChangedCallback,
  DisconnectCallback,
  WalletEventHandler
} from './types/wallet';

// Constants for Nija Wallet
const NIJA_WALLET_URL = 'http://3.111.22.56:5174';
const CONNECTION_TIMEOUT = 15000; // 15 seconds timeout

// API endpoints
const ENDPOINTS = {
  CONNECT: '/api/v1/connect',
  GET_ADDRESS: '/api/v1/wallet/address',
  GET_CHAIN_ID: '/api/v1/network/chain',
  SEND_TRANSACTION: '/api/v1/transaction/send',
  HEALTH: '/api/v1/health',
  DISCONNECT: '/api/v1/disconnect',
  SESSION_VERIFY: '/api/v1/session/verify',
  SESSION_STORE: '/api/v1/session/store'
};

// Ethereum method mapping to Nija Wallet methods
const METHOD_MAPPING: { [key: string]: string } = {
  'eth_accounts': 'nija_getAccounts',
  'eth_requestAccounts': 'nija_requestAccounts',
  'eth_chainId': 'nija_getChainId',
  'eth_sendTransaction': 'nija_sendTransaction'
};

// Types
interface NijaProvider {
  isNijaWallet: boolean;
  name: string;
  userAgent: string;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  _events?: Map<string, Set<Function>>;
  _emit?: (event: string, ...args: any[]) => void;
}

declare global {
  interface Window {
    ethereum?: any;
    nijaWalletProvider?: NijaProvider;
    nijaHeartbeatInterval?: NodeJS.Timeout;
  }
}

// Try multiple methods to detect the Nwallet provider
export const isNijaWalletProvider = (): boolean => {
  // First check if we have our dedicated provider
  if (window.nijaWalletProvider) {
    return true;
  }
  
  // Check for the ethereum object with Nija flags
  if (window.ethereum) {
    // Check for explicit Nija Wallet flag
    if (window.ethereum.isNijaWallet) {
      return true;
    }
    
    // Check for Nija Wallet in the provider name
    if (window.ethereum.name && typeof window.ethereum.name === 'string' &&
        window.ethereum.name.toLowerCase().includes('nija')) {
      return true;
    }
  }
  
  // Check if running in the expected Nwallet environment
  const hostname = window.location.hostname;
  if (hostname === '3.111.22.56' || hostname === 'localhost') {
    return true;
  }
  
  return false;
};

// Get the Nija Wallet provider
export const getNijaWalletProvider = () => {
  // First check if we have our dedicated provider
  if (window.nijaWalletProvider) {
    return window.nijaWalletProvider;
  }
  
  // Check for session parameter
  const urlParams = new URLSearchParams(window.location.search);
  const encodedSession = urlParams.get('session');
  
  if (encodedSession) {
    try {
      // Decode and parse session data
      const sessionData = JSON.parse(decodeURIComponent(encodedSession));
      
      // Create a provider that uses the session data
      const provider = {
        isNijaWallet: true,
        name: 'Nija Wallet',
        userAgent: 'Nija Wallet/1.0.0',
        request: async (args: { method: string; params?: any[] }) => {
          switch (args.method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              return [sessionData.address];
            case 'eth_chainId':
              return sessionData.chainId;
            default:
              throw new Error(`Method ${args.method} not supported`);
          }
        },
        on: (event: string, callback: (...args: any[]) => void) => {
          // Handle subscription events
          switch (event) {
            case 'accountsChanged':
              callback([sessionData.address]);
              break;
            case 'chainChanged':
              callback(sessionData.chainId);
              break;
          }
        },
        removeListener: () => {}
      };
      
      // Store the provider for future use
      window.nijaWalletProvider = provider;
      return provider;
    } catch (error) {
      console.error('Error creating provider from session:', error);
    }
  }

  // If no session or error, check for window.ethereum
  if (window.ethereum?.isNijaWallet) {
    return window.ethereum;
  }

  return null;
};

// Helper function to handle timeouts
const withTimeout = async (promise: Promise<any>, ms: number, errorMessage: string) => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Setup connection to Nija Wallet
export const setupNijaWalletConnection = async () => {
  try {
    if (!isNijaWalletProvider()) {
      throw new Error('Nija Wallet provider not detected');
    }
    
    const provider = getNijaWalletProvider();
    
    // Request accounts with timeout
    const accounts = await withTimeout(
      provider.request({ method: 'eth_requestAccounts' }),
      CONNECTION_TIMEOUT,
      'Connection request timed out'
    );
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from provider');
    }
    
    // Get chain ID with timeout
    const chainId = await withTimeout(
      provider.request({ method: 'eth_chainId' }),
      CONNECTION_TIMEOUT,
      'Chain ID request timed out'
    );
    
    // Store connection info
    localStorage.setItem('nija_eth_address', accounts[0]);
    localStorage.setItem('nija_chain_id', chainId);
    
    return {
      address: accounts[0],
      chainId: parseInt(chainId, 16),
      provider
    };
  } catch (error) {
    console.error('Error setting up Nija Wallet connection:', error);
    // Clear any stale data
    localStorage.removeItem('nija_eth_address');
    localStorage.removeItem('nija_chain_id');
    throw error;
  }
};

// Verify wallet connection
export const verifyWalletConnection = async () => {
  try {
    // Check if we have a session
    const session = localStorage.getItem('nija_session');
    if (!session) {
      throw new Error('No session found');
    }

    // Check if provider exists and is Nija Wallet
    if (!window.ethereum?.isNijaWallet) {
      throw new Error('Nija Wallet provider not found');
    }

    // Verify accounts with timeout
    const accounts = await withTimeout(
      window.ethereum.request({ method: 'eth_accounts' }),
      CONNECTION_TIMEOUT,
      'Account verification timed out'
    );

    if (!accounts || accounts.length === 0) {
      throw new Error('No connected accounts');
    }

    return accounts[0];
  } catch (error) {
    console.error('Wallet verification failed:', error);
    // Clear any stale data
    localStorage.removeItem('nija_session');
    return null;
  }
};

// Event handling
export const setupWalletEventListeners = (provider: any) => {
  if (!provider) return;
  
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      localStorage.removeItem('nija_eth_address');
      window.dispatchEvent(new CustomEvent('nijaWalletDisconnected'));
    } else {
      localStorage.setItem('nija_eth_address', accounts[0]);
      window.dispatchEvent(new CustomEvent('nijaWalletAccountChanged', { detail: accounts[0] }));
    }
  };
  
  const handleChainChanged = (chainId: string) => {
    localStorage.setItem('nija_chain_id', chainId);
    window.dispatchEvent(new CustomEvent('nijaWalletChainChanged', { detail: chainId }));
  };
  
  const handleDisconnect = () => {
    localStorage.removeItem('nija_eth_address');
    localStorage.removeItem('nija_chain_id');
    window.dispatchEvent(new CustomEvent('nijaWalletDisconnected'));
  };
  
  provider.on('accountsChanged', handleAccountsChanged);
  provider.on('chainChanged', handleChainChanged);
  provider.on('disconnect', handleDisconnect);
  
  return () => {
    provider.removeListener('accountsChanged', handleAccountsChanged);
    provider.removeListener('chainChanged', handleChainChanged);
    provider.removeListener('disconnect', handleDisconnect);
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
export const sendTransaction = async (params: TransactionParams) => {
  try {
    const provider = getNijaWalletProvider();
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [params]
    });
    return txHash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

// Disconnect wallet
export const disconnectWallet = async () => {
  try {
    const provider = getNijaWalletProvider();
    await provider.request({ method: 'wallet_disconnect' });
    localStorage.removeItem('nija_eth_address');
    localStorage.removeItem('nija_chain_id');
    window.dispatchEvent(new CustomEvent('nijaWalletDisconnected'));
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    throw error;
  }
};

// Handle wallet events
export const handleEthereumRequest = async (method: string, params: any[] = []) => {
  try {
    if (!window.ethereum?.isNijaWallet) {
      throw new Error('Nija Wallet provider not found');
    }
    
    return await window.ethereum.request({ method, params });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Failed to handle Ethereum request (${method}): ${error.message}`);
    }
    throw error;
  }
};

// Initialize connection to Nija Wallet
export const initializeNijaWallet = async () => {
  try {
    // Wait for provider to be injected
    await waitForProvider();

    // Get the session from URL
    const searchParams = new URLSearchParams(window.location.search);
    const session = searchParams.get('nija_session');
    
    if (!session) {
      throw new Error('No session found');
    }

    // Store session in localStorage
    localStorage.setItem('nija_session', session);

    // Request accounts to establish connection
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned');
    }

    // Set up event listeners
    setupEventListeners();

    // Start heartbeat
    startHeartbeat();

    return accounts[0];
  } catch (error) {
    console.error('Failed to initialize Nija Wallet:', error);
    toast.error('Failed to connect to Nija Wallet');
    throw error;
  }
};

// Helper function to wait for provider
const waitForProvider = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.ethereum?.isNijaWallet) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Provider injection timeout'));
    }, 3000);

    window.addEventListener('ethereum#initialized', () => {
      clearTimeout(timeout);
      if (window.ethereum?.isNijaWallet) {
        resolve();
      } else {
        reject(new Error('Nija Wallet provider not found'));
      }
    }, { once: true });
  });
};

// Set up event listeners
const setupEventListeners = () => {
  if (!window.ethereum?.isNijaWallet) return;

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // Handle disconnection
      localStorage.removeItem('nija_session');
      window.location.reload();
    } else {
      localStorage.setItem('nija_eth_address', accounts[0]);
      window.dispatchEvent(new CustomEvent('nijaWalletAccountChanged', { 
        detail: accounts[0] 
      }));
    }
  };

  const handleChainChanged = (chainId: string) => {
    localStorage.setItem('nija_chain_id', chainId);
    window.dispatchEvent(new CustomEvent('nijaWalletChainChanged', { 
      detail: chainId 
    }));
    window.location.reload();
  };

  const handleDisconnect = () => {
    localStorage.removeItem('nija_session');
    localStorage.removeItem('nija_eth_address');
    localStorage.removeItem('nija_chain_id');
    window.dispatchEvent(new CustomEvent('nijaWalletDisconnected'));
    window.location.reload();
  };

  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);
  window.ethereum.on('disconnect', handleDisconnect);
};

// Start heartbeat to keep connection alive
const startHeartbeat = () => {
  // Clear existing interval if any
  if (window.nijaHeartbeatInterval) {
    clearInterval(window.nijaHeartbeatInterval);
  }

  // Set up new heartbeat
  window.nijaHeartbeatInterval = setInterval(async () => {
    try {
      const session = localStorage.getItem('nija_session');
      if (!session) {
        clearInterval(window.nijaHeartbeatInterval);
        return;
      }

      const accounts = await window.ethereum?.request({
        method: 'eth_accounts'
      });

      if (!accounts || accounts.length === 0) {
        handleDisconnect();
      }
    } catch (error) {
      console.error('Heartbeat failed:', error);
      handleDisconnect();
    }
  }, 30000); // Every 30 seconds
};

// Handle disconnect
const handleDisconnect = () => {
  localStorage.removeItem('nija_session');
  localStorage.removeItem('nija_eth_address');
  localStorage.removeItem('nija_chain_id');
  window.dispatchEvent(new CustomEvent('nijaWalletDisconnected'));
  
  if (window.nijaHeartbeatInterval) {
    clearInterval(window.nijaHeartbeatInterval);
  }
  
  window.location.reload();
};