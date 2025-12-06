// Nwallet API and WebSocket URLs
export const NWALLET_API_URL = 'http://3.111.22.56:6102';
export const NWALLET_WS_URL = 'ws://3.111.22.56:6101/ws'; // WebSocket URL on port 6101 (corrected)
export const NWALLET_FRONTEND_URL = 'http://3.111.22.56:6101';
export const NWALLET_GRAPHQL_URL = 'http://3.111.22.56:6102/graphql'; // GraphQL endpoint

// NFTGen API and WebSocket URLs
export const NFTGEN_API_URL = 'http://3.111.22.56:7102/api/nftgen'; // API server
export const NFTGEN_GRAPHQL_URL = 'http://3.111.22.56:7102/graphql'; // GraphQL endpoint
export const NFTGEN_WS_URL = 'ws://3.111.22.56:7101/ws'; // WebSocket URL
export const NFTGEN_ORIGIN = 'http://3.111.22.56:7103'; // Frontend origin - exact URL as specified

// Session storage keys
export const SESSION_STORAGE_KEY = 'nftgen_nwallet_session';
export const NWALLET_SESSION_KEY = 'nwallet_session';
export const LEGACY_SESSION_STORAGE_KEY = 'nija_wallet_session';

// Alchemy API key - Using environment variable or fallback
export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || '_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5'; // Use environment variable or fallback

// IPFS Gateway URLs
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs';
export const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// WebSocket configuration
export const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  MAX_SESSION_CHECK_RETRIES: 3,
  HEARTBEAT_INTERVAL: 30000
};

// Chain configuration
export const CHAIN_CONFIG = {
  SEPOLIA_CHAIN_ID: '0xaa36a7',
  SEPOLIA_RPC_URL: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || '_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5'}`, // Use environment variable or fallback
  MAINNET_CHAIN_ID: '0x1',
  NETWORK_NAMES: {
    '0xaa36a7': 'Sepolia Testnet',
    '0x1': 'Ethereum Mainnet',
    '0x5': 'Goerli Testnet',
    '0x13881': 'Polygon Mumbai',
    '0x89': 'Polygon Mainnet',
    '0xa4b1': 'Arbitrum One',
    '0xa': 'Optimism',
    '0x38': 'Binance Smart Chain'
  }
};

// WalletConnect compatibility configuration
export const WALLETCONNECT_CONFIG = {
  // WalletConnect v2 does not support paymaster customData as of April 2025
  // This flag can be used to disable paymaster features when using WalletConnect
  DISABLE_PAYMASTER_FOR_WALLETCONNECT: true,

  // Required methods for WalletConnect initialization
  REQUIRED_METHODS: [
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v4',
    'eth_accounts',
    'eth_requestAccounts',
    'eth_chainId',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_registerOnboarding',
    'wallet_watchAsset',
    'net_version'
  ],

  // Optional methods for WalletConnect initialization
  OPTIONAL_METHODS: [
    'eth_sendRawTransaction',
    'wallet_scanQRCode',
    'wallet_watchAsset'
  ]
};

/**
 * Helper function to get network name from chain ID
 * @param chainId The blockchain network chain ID
 * @returns The human-readable network name
 */
export function getNetworkNameFromChainId(chainId: string | null): string {
  if (!chainId) return 'Unknown Network';

  // Convert to lowercase for case-insensitive comparison
  const chainIdLower = chainId.toLowerCase();

  // Define network names type for type safety
  type NetworkNames = typeof CHAIN_CONFIG.NETWORK_NAMES;
  type ChainIdKey = keyof NetworkNames;

  // Check if the chain ID exists in our network names mapping
  if (Object.prototype.hasOwnProperty.call(CHAIN_CONFIG.NETWORK_NAMES, chainIdLower)) {
    // Safe to cast since we've checked the property exists
    return CHAIN_CONFIG.NETWORK_NAMES[chainIdLower as ChainIdKey];
  }

  return 'Unknown Network';
}