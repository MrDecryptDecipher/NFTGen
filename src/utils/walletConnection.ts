import { ethers } from 'ethers';

interface EthereumProvider {
  [key: string]: any;
  isNijaWallet?: boolean;
  name?: string;
  isMetaMask?: boolean;
  request?: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  selectedAddress?: string;
  chainId?: string;
  _emit?: (event: string, ...args: any[]) => void;
}

// Instead of extending Window directly, declare the properties we need
declare global {
  var ethereum: EthereumProvider | undefined;
  var nijaWalletProvider: EthereumProvider | undefined;
}

// Mock provider for development
const createMockProvider = (): EthereumProvider => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
  
  return {
    isNijaWallet: true,
    name: 'Nija Wallet',
    selectedAddress: mockAddress,
    chainId: '0x1',
    request: async ({ method, params = [] }) => {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [mockAddress];
        case 'eth_chainId':
          return '0x1';
        default:
          console.log('Mock provider received request:', method, params);
          return null;
      }
    },
    on: (event: string, callback: (...args: any[]) => void) => {
      console.log('Mock provider event listener added:', event);
    },
    removeListener: (event: string, callback: (...args: any[]) => void) => {
      console.log('Mock provider event listener removed:', event);
    }
  };
};

export const getNijaWalletProvider = (): EthereumProvider | null => {
  // For development, always return the mock provider
  if (!globalThis.nijaWalletProvider) {
    globalThis.nijaWalletProvider = createMockProvider();
  }
  return globalThis.nijaWalletProvider;
};

export const setupNijaWalletConnection = async (): Promise<void> => {
  const provider = getNijaWalletProvider();
  
  if (!provider) {
    throw new Error('Nija Wallet provider not found');
  }

  // Auto-connect without user interaction
  const address = localStorage.getItem('ethereumAddress');
  if (address) {
    return;
  }

  try {
    const accounts = await provider.request?.({
      method: 'eth_requestAccounts'
    });

    if (accounts?.[0]) {
      localStorage.setItem('ethereumAddress', accounts[0]);
      localStorage.setItem('nijaWalletSession', Date.now().toString());
    }
  } catch (error) {
    console.error('Failed to connect to Nija Wallet:', error);
    throw error;
  }
};

export const verifyWalletConnection = async (): Promise<boolean> => {
  const provider = getNijaWalletProvider();
  const sessionId = localStorage.getItem('nijaWalletSession');
  const address = localStorage.getItem('ethereumAddress');

  // For development, always return true
  return true;
}; 