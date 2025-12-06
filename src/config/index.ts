/**
 * Central configuration file for NFTGen
 * This file exports all configuration values needed across the application
 */

// API configuration
export const API_BASE_URL = 'http://3.111.22.56:7102';

// NFT API configuration
export const NFT_API_BASE_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://3.111.22.56:7102';

// WebSocket configuration
export const WS_BASE_URL = 'ws://3.111.22.56:7101';

// Nwallet configuration
export const NIJA_WALLET_URL = 'http://3.111.22.56:6102';
export const NFTGEN_URL = 'http://3.111.22.56:7103';

// WebSocket and API URLs
export const NFT_WS_URL = process.env.REACT_APP_WS_URL || process.env.VITE_WS_URL || 'ws://3.111.22.56:7101';
export const WALLET_API_URL = process.env.REACT_APP_WALLET_API_URL || process.env.VITE_WALLET_API_URL || 'http://3.111.22.56:6102/api';

// API Keys - Use environment variable or fallback to working key
export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || "_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5";
export const NFT_STORAGE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEZmMTQ0MjVCODFGNzA3NDVGMTQ0MjVCODFGNzA3NDVGIiwiaXNzIjoibmZ0LXN0b3JhZ2UiLCJpYXQiOjE3MTU2MzI0NzI3NDcsIm5hbWUiOiJORlRHZW5fVXBkYXRlZCJ9.Ej_mI8J5cdgvUV5kd-fzTLkPVnGTQjV_WeTotE3v8xM";

// Chain configuration
export const CHAIN_CONFIG = {
  SEPOLIA_CHAIN_ID: '0xaa36a7',
  SEPOLIA_NAME: 'Sepolia',
  SEPOLIA_RPC_URL: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || "_XAl1Ia4WGRgbPuKHT2m_HR-ZnCvOuY5"}`,
};

// Session storage keys
export const SESSION_STORAGE_KEY = 'nija_wallet_session';

// Contract addresses
export const NFT_CONTRACT_ADDRESS = '0x7C48738789A79FAb8DD3Ed0E787A9456262E928A';

// Default NFT configuration
export const DEFAULT_NFT_ATTRIBUTES = [
  { trait_type: "Creator", value: "NFTGen" },
  { trait_type: "Platform", value: "NFTGen" }
];

// IPFS configuration
export const IPFS_GATEWAY_URLS = [
  'https://ipfs.alchemy.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
];

// Default timeout values
export const DEFAULT_API_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_IPFS_TIMEOUT = 20000; // 20 seconds

// Reusable error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Wallet not connected. Please connect your wallet to continue.',
  IPFS_UPLOAD_FAILED: 'Failed to upload to IPFS. Please try again later.',
  NFT_MINT_FAILED: 'Failed to mint NFT. Please try again later.',
  INVALID_METADATA: 'Invalid NFT metadata. Please check your inputs and try again.',
};