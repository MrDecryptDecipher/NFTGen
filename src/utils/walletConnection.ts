import { Alchemy, Network, Wallet, Utils } from 'alchemy-sdk';
import { toast } from 'react-toastify';
import { SESSION_STORAGE_KEY, NWALLET_SESSION_KEY, NWALLET_API_URL } from '../config/constants';

// Define the EIP-1193 Ethereum provider interface
interface EthereumProvider {
  [key: string]: unknown;
  isNijaWallet?: boolean;
  name?: string;
  isMetaMask?: boolean;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (data: unknown) => void) => void;
  removeListener?: (event: string, callback: (data: unknown) => void) => void;
  selectedAddress?: string;
  chainId?: string;
  _emit?: (event: string, ...args: unknown[]) => void;
}

// Define session data interface
interface SessionData {
  address: string;
  sessionId: string;
  timestamp: number;
  chainId?: string;
  source?: string;
  origin?: string;
  nonce?: number;
}

// Instead of extending Window directly, declare the properties we need
declare global {
  interface Window {
    ethereum?: EthereumProvider;
    nijaWalletProvider?: EthereumProvider;
  }
}

// Initialize Alchemy SDK configuration for wallet operations
const alchemyConfig = {
  apiKey: import.meta.env.VITE_ALCHEMY_API_KEY || 'gRcliAnQ2ysaJacOBBlOCd7eT9NxGLd0',
  network: Network.ETH_SEPOLIA,
  maxRetries: 5,
  requestTimeout: 30000
};

// Create an Alchemy instance
const alchemy = new Alchemy(alchemyConfig);

console.log('Alchemy SDK initialized successfully');

/**
 * Create an Alchemy provider from session data
 * This follows the EIP-1193 standard for Ethereum providers
 */
export const createAlchemyProvider = (sessionData: SessionData): EthereumProvider => {
  console.log('Creating Alchemy provider from session data:', sessionData);

  if (!sessionData || !sessionData.address) {
    throw new Error('Invalid session data for provider creation');
  }

  // Create a provider that implements the EIP-1193 interface using Alchemy SDK
  const provider: EthereumProvider = {
    isNijaWallet: true,
    name: 'Nija Wallet',
    selectedAddress: sessionData.address,
    chainId: sessionData.chainId || '0xaa36a7', // Sepolia chain ID

    // Implement the request method
    request: async ({ method, params = [] }: { method: string; params?: unknown[] }): Promise<unknown> => {
      console.log('Alchemy provider request:', method, params);

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [sessionData.address];

        case 'eth_chainId':
          return sessionData.chainId || '0xaa36a7'; // Sepolia chain ID

        case 'eth_sendTransaction':
          // For send transaction, we need to redirect to Nwallet
          toast.info('Please complete this transaction in Nwallet');

          try {
            // Open Nwallet in a new tab with transaction parameters
            const txUrl = `http://3.111.22.56:6101/transaction?action=sendTransaction&params=${encodeURIComponent(JSON.stringify(params))}&from=${sessionData.address}&session=${sessionData.sessionId}`;
            window.open(txUrl, '_blank');

            // Return a placeholder transaction hash
            // In a real implementation, we would wait for the transaction to be completed
            return '0x0000000000000000000000000000000000000000000000000000000000000000';
          } catch (error) {
            console.error('Error redirecting to Nwallet for transaction:', error);
            throw new Error('Transaction needs to be completed in Nwallet');
          }

        case 'eth_sign':
        case 'personal_sign':
          // For signing, we need to redirect to Nwallet
          toast.info('Please complete this signing request in Nwallet');

          try {
            // Open Nwallet in a new tab with signing parameters
            const signUrl = `http://3.111.22.56:6101/sign?action=sign&params=${encodeURIComponent(JSON.stringify(params))}&from=${sessionData.address}&session=${sessionData.sessionId}`;
            window.open(signUrl, '_blank');

            // Return a placeholder signature
            // In a real implementation, we would wait for the signature to be completed
            return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
          } catch (error) {
            console.error('Error redirecting to Nwallet for signing:', error);
            throw new Error('Signing needs to be completed in Nwallet');
          }

        case 'eth_getBalance':
          // Get balance using Alchemy SDK
          try {
            return await alchemy.core.getBalance(params[0] as string);
          } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
          }

        case 'eth_getTransactionCount':
          // Get transaction count using Alchemy SDK
          try {
            return await alchemy.core.getTransactionCount(params[0] as string, params[1] as string);
          } catch (error) {
            console.error('Error getting transaction count:', error);
            throw error;
          }

        case 'eth_getBlockByNumber':
          // Get block by number using Alchemy SDK
          try {
            return await alchemy.core.getBlock(params[0] as string);
          } catch (error) {
            console.error('Error getting block:', error);
            throw error;
          }

        case 'eth_getTransactionReceipt':
          // Get transaction receipt using Alchemy SDK
          try {
            return await alchemy.core.getTransactionReceipt(params[0] as string);
          } catch (error) {
            console.error('Error getting transaction receipt:', error);
            throw error;
          }

        default:
          // For all other read-only methods, use Alchemy SDK
          try {
            console.log(`Using Alchemy SDK for method: ${method}`);
            return await alchemy.core.send(method, params);
          } catch (error) {
            console.error(`Error calling ${method} via Alchemy:`, error);
            throw error;
          }
      }
    },

    // Implement event listeners
    on: (event: string, callback: (data: unknown) => void): void => {
      console.log(`Alchemy provider: Added listener for ${event} event`);

      // Handle events based on type
      switch (event) {
        case 'accountsChanged':
          // We don't actually handle account changes in this provider
          // In a real implementation, we would subscribe to account changes
          break;

        case 'chainChanged':
          // We don't actually handle chain changes in this provider
          // In a real implementation, we would subscribe to chain changes
          break;

        case 'connect':
          // We don't actually handle connect events in this provider
          // In a real implementation, we would subscribe to connect events
          break;

        case 'disconnect':
          // We don't actually handle disconnect events in this provider
          // In a real implementation, we would subscribe to disconnect events
          break;

        default:
          console.log(`Unhandled event type: ${event}`);
          break;
      }

      // Using void to prevent unused variable warning
      void callback;
    },

    removeListener: (event: string, callback: (data: unknown) => void): void => {
      console.log(`Alchemy provider: Removed listener for ${event} event`);
      // We don't actually handle events in this provider
      // Using void to prevent unused variable warning
      void callback;
    }
  };

  return provider;
};

/**
 * Check if the current provider is a Nija Wallet provider
 */
export const isNijaWalletProvider = (): boolean => {
  // First check if we have a session
  try {
    const sessionDataStr = localStorage.getItem(SESSION_STORAGE_KEY) ||
                          localStorage.getItem(NWALLET_SESSION_KEY);

    if (sessionDataStr) {
      const session = JSON.parse(sessionDataStr) as SessionData;
      if (session && session.address) {
        console.log('isNijaWalletProvider: Session found for address', session.address);

        // If we have a session, create an Alchemy provider
        try {
          console.log('Creating Alchemy provider from session data');
          const provider = createAlchemyProvider(session);

          // Assign the provider to window.ethereum
          window.ethereum = provider;

          console.log('Alchemy provider created and assigned to window.ethereum');
          return true;
        } catch (error) {
          console.error('Error creating Alchemy provider:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for Nija Wallet session:', error);
  }

  // If we don't have a session, check if window.ethereum exists and has the isNijaWallet flag
  if (window.ethereum && window.ethereum.isNijaWallet) {
    return true;
  }

  // Check if we're in an iframe and the parent has a Nija Wallet provider
  try {
    if (window !== window.parent && window.parent.ethereum && window.parent.ethereum.isNijaWallet) {
      // Copy the parent's provider to this window
      window.ethereum = window.parent.ethereum;
      return true;
    }
  } catch (error) {
    console.error('Error checking parent window for Nija Wallet provider:', error);
  }

  console.log('No Ethereum provider detected');
  return false;
};

/**
 * Get the Nija Wallet provider
 */
export const getNijaWalletProvider = (): EthereumProvider | null => {
  // Check if we already have a provider
  if (window.ethereum && window.ethereum.isNijaWallet) {
    return window.ethereum;
  }

  // Check if we have a session
  try {
    const sessionDataStr = localStorage.getItem(SESSION_STORAGE_KEY) ||
                          localStorage.getItem(NWALLET_SESSION_KEY);

    if (sessionDataStr) {
      const session = JSON.parse(sessionDataStr) as SessionData;
      if (session && session.address) {
        // Create an Alchemy provider
        const provider = createAlchemyProvider(session);

        // Assign the provider to window.ethereum
        window.ethereum = provider;

        return provider;
      }
    }
  } catch (error) {
    console.error('Error getting Nija Wallet provider:', error);
  }

  // Check if we're in an iframe and the parent has a Nija Wallet provider
  try {
    if (window !== window.parent && window.parent.ethereum && window.parent.ethereum.isNijaWallet) {
      // Copy the parent's provider to this window
      window.ethereum = window.parent.ethereum;
      return window.ethereum;
    }
  } catch (error) {
    console.error('Error checking parent window for Nija Wallet provider:', error);
  }

  return null;
};

/**
 * Setup the Nija Wallet connection
 */
export const setupNijaWalletConnection = async (): Promise<void> => {
  console.log('Setting up Nija Wallet connection...');

  // Check if we have a provider
  const provider = getNijaWalletProvider();

  if (!provider) {
    console.error('Nija Wallet provider not found');
    throw new Error('Nija Wallet provider not found');
  }

  try {
    // Request accounts to ensure we're connected
    console.log('Requesting accounts from provider...');
    const accounts = await provider.request?.({
      method: 'eth_requestAccounts'
    }) as string[];

    if (accounts && accounts.length > 0) {
      console.log('Connected to account:', accounts[0]);

      // We're connected, update the session if needed
      const sessionDataStr = localStorage.getItem(SESSION_STORAGE_KEY) ||
                          localStorage.getItem(NWALLET_SESSION_KEY);

      if (!sessionDataStr) {
        console.log('No existing session found, creating new session');

        // Get the chain ID
        const chainId = (await provider.request?.({ method: 'eth_chainId' }) as string) || '0xaa36a7';
        console.log('Chain ID:', chainId);

        // Create a new session
        const session: SessionData = {
          address: accounts[0],
          sessionId: `nija_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          timestamp: Date.now(),
          chainId: chainId,
          source: 'nija_wallet',
          origin: window.location.origin
        };

        // Store the session
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        localStorage.setItem(NWALLET_SESSION_KEY, JSON.stringify(session));

        console.log('New session created and stored');
      } else {
        console.log('Using existing session');

        // Parse the existing session
        const session = JSON.parse(sessionDataStr) as SessionData;

        // Check if the session is expired (older than 24 hours)
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        const sessionExpiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (sessionAge > sessionExpiryTime) {
          console.log('Session expired, creating new session');

          // Get the chain ID
          const chainId = (await provider.request?.({ method: 'eth_chainId' }) as string) || '0xaa36a7';

          // Create a new session
          const newSession: SessionData = {
            address: accounts[0],
            sessionId: `nija_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            timestamp: now,
            chainId: chainId,
            source: 'nija_wallet',
            origin: window.location.origin
          };

          // Store the new session
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
          localStorage.setItem(NWALLET_SESSION_KEY, JSON.stringify(newSession));

          console.log('New session created and stored');
        } else {
          console.log('Session is still valid');
        }
      }
    } else {
      console.error('No accounts returned from provider');
      throw new Error('No accounts returned from provider');
    }
  } catch (error) {
    console.error('Failed to connect to Nija Wallet:', error);
    throw error;
  }
};

/**
 * Verify the wallet connection
 */
export const verifyWalletConnection = async (): Promise<boolean> => {
  console.log('Verifying wallet connection...');

  // Check if we have a provider
  const provider = getNijaWalletProvider();

  if (!provider) {
    console.log('No provider found');
    return false;
  }

  try {
    // Request accounts to verify connection
    console.log('Requesting accounts to verify connection...');
    const accounts = await provider.request?.({
      method: 'eth_accounts'
    }) as string[];

    const isConnected = !!(accounts && accounts.length > 0);
    console.log('Wallet connection verified:', isConnected);

    if (isConnected) {
      console.log('Connected to account:', accounts[0]);

      // Check if the session is valid
      const sessionDataStr = localStorage.getItem(SESSION_STORAGE_KEY) ||
                          localStorage.getItem(NWALLET_SESSION_KEY);

      if (sessionDataStr) {
        // Parse the existing session
        const session = JSON.parse(sessionDataStr) as SessionData;

        // Check if the session is expired (older than 24 hours)
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        const sessionExpiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (sessionAge > sessionExpiryTime) {
          console.log('Session expired');
          return false;
        }

        // Check if the session address matches the connected account
        if (session.address.toLowerCase() !== accounts[0].toLowerCase()) {
          console.log('Session address does not match connected account');
          return false;
        }

        console.log('Session is valid');
      } else {
        console.log('No session found');
        return false;
      }
    }

    return isConnected;
  } catch (error) {
    console.error('Error verifying wallet connection:', error);
    return false;
  }
};