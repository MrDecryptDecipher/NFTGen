import { ethers } from 'ethers';

export interface NijaWalletProvider {
  isNijaWallet: boolean;
  name: string;
  userAgent: string;
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string, callback: (...args: any[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: any;
    nijaWalletProvider?: any;
  }
}

const NIJA_WALLET_URL = 'http://localhost:5177';

export const setupNijaWalletConnection = async () => {
  try {
    // Check if Nija Wallet is available
    if (!window.nijaWalletProvider && !window.ethereum?.isNijaWallet) {
      // Try to fetch the wallet info from Nija Wallet
      const response = await fetch(`${NIJA_WALLET_URL}/api/wallet-info`);
      if (!response.ok) throw new Error('Nija Wallet not available');
      
      const { ethereumAddress, network } = await response.json();
      
      // Create a provider that will forward requests to Nija Wallet
      const provider: NijaWalletProvider = {
        isNijaWallet: true,
        name: 'Nija Wallet',
        userAgent: 'NijaWallet/1.0.0',
        request: async (args) => {
          switch (args.method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              return [ethereumAddress];
            case 'eth_chainId':
              return network === 'mainnet' ? '0x1' : '0xaa36a7';
            case 'eth_sendTransaction':
              // Forward transaction requests to Nija Wallet
              const txResponse = await fetch(`${NIJA_WALLET_URL}/api/send-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args.params?.[0])
              });
              if (!txResponse.ok) throw new Error('Transaction failed');
              return await txResponse.json();
            default:
              throw new Error(`Method ${args.method} not supported`);
          }
        },
        on: (event: string, callback: (...args: any[]) => void) => {
          // Handle subscription events
          if (event === 'accountsChanged') {
            callback([ethereumAddress]);
          } else if (event === 'chainChanged') {
            callback(network === 'mainnet' ? '0x1' : '0xaa36a7');
          }
        },
        removeListener: (event: string, callback: (...args: any[]) => void) => {
          // No-op since we don't actually maintain listeners
        }
      };

      // Inject the provider
      window.ethereum = provider;
      window.nijaWalletProvider = provider;
    }

    // Request accounts to trigger connection
    const accounts = await window.ethereum?.request({ 
      method: 'eth_requestAccounts' 
    });

    return accounts?.[0];
  } catch (error) {
    console.error('Error connecting to Nija Wallet:', error);
    throw error;
  }
};

export const isNijaWalletConnected = () => {
  return !!(window.ethereum?.isNijaWallet || window.nijaWalletProvider);
};

export const getNijaWalletAddress = async () => {
  if (!isNijaWalletConnected()) {
    return await setupNijaWalletConnection();
  }
  const accounts = await window.ethereum?.request({ 
    method: 'eth_accounts' 
  });
  return accounts?.[0];
}; 