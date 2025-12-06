import { configureChains, createConfig, Chain } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { initializeIntegration } from '../nijaIntegration';

export const projectId = '1ee409593129cebf8c29a7064ce8915e';

// Configure chains with providers
const { publicClient, webSocketPublicClient } = configureChains(
  [mainnet, sepolia],
  [publicProvider()]
);

// Create custom connector for Nija Wallet
const nijaConnector = new InjectedConnector({
  chains: [mainnet, sepolia],
  options: {
    name: 'Nija Wallet',
    shimDisconnect: false,
    getProvider: () => {
      if (typeof window === 'undefined') return undefined;
      
      // Initialize Nija Wallet connection
      initializeIntegration();
      return window.ethereum;
    },
  },
});

// Create wagmi config with only Nija Wallet connector
export const config = createConfig({
  autoConnect: true,
  connectors: [nijaConnector],
  publicClient,
  webSocketPublicClient,
});

// Export available chains for use in other components
export const availableChains = [mainnet, sepolia];

// DApp metadata
export const dAppInfo = {
  name: 'NFTGen',
  description: 'NFT Generation and Management Tool',
  url: 'https://nftgenrtr.surge.sh',
  icons: ['https://nftgenrtr.surge.sh/icon.png'],
  chains: availableChains.map((chain: Chain) => ({
    id: chain.id,
    name: chain.name,
    network: chain.network,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls,
  })),
};

// Network specific configurations
export const networkConfig = {
  ethereum: {
    supportedChains: availableChains,
    defaultChain: mainnet,
    gasSettings: {
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
      gasLimit: undefined,
    },
  },
};

// Export utility functions
export const isMainnet = (chainId: number) => chainId === mainnet.id;
export const isSepolia = (chainId: number) => chainId === sepolia.id;

// URLs
export const BROWSER_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'http://3.111.22.56:3000';

export const NFTGEN_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5175'
  : 'http://3.111.22.56:5175';

export const NWALLET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'http://3.111.22.56:3000';

export const NWALLET_WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:6102'
  : 'ws://3.111.22.56:6102';