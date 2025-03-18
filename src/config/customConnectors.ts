import { InjectedConnector } from 'wagmi/connectors/injected';
import { Chain } from 'wagmi';

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Check if the provider is from Nija Custodian Wallet
 * This function filters out other wallet providers like MetaMask
 */
function isNijaWalletProvider(provider: any): boolean {
  if (!provider) return false;
  
  // Check for Nija Wallet specific properties
  return (
    provider.isNijaWallet === true || 
    (provider.name && provider.name.toLowerCase().includes('nija')) ||
    (provider.isNijaWallet !== undefined)
  );
}

/**
 * Create a custom NijaWallet connector that extends InjectedConnector
 */
export const createNWalletConnector = (chains: Chain[] = []) => {
  // Create the connector with the required properties
  const connector = new InjectedConnector({
    chains,
    options: {
      name: 'Nija Custodian Wallet',
      shimDisconnect: true,
      getProvider: () => {
        if (typeof window === 'undefined') return undefined;
        return isNijaWalletProvider(window.ethereum) ? window.ethereum : undefined;
      }
    }
  });
  
  // Add missing id property
  (connector as any).id = 'nijaWallet';
  
  return connector;
};

/**
 * Create all custom connectors for the application
 */
export function createCustomConnectors(chains: Chain[] = []) {
  return [createNWalletConnector(chains)];
} 