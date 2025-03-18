/// <reference types="vite/client" />

// Environment variables
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly REACT_APP_ALCHEMY_API_KEY: string;
  readonly REACT_APP_ALCHEMY_MAINNET_URL: string;
  readonly REACT_APP_ALCHEMY_SEPOLIA_URL: string;
  readonly REACT_APP_WALLETCONNECT_PROJECT_ID: string;
  readonly REACT_APP_CONTRACT_ADDRESS: string;
  readonly REACT_APP_PINATA_KEY: string;
  readonly REACT_APP_PINATA_SECRET: string;
  readonly REACT_APP_NFT_STORAGE_KEY: string;
  readonly REACT_APP_ENABLE_MOCK_IPFS: string;
  readonly REACT_APP_DISABLE_SENTRY: string;
  readonly REACT_APP_SUPPRESS_ROUTER_WARNINGS: string;
  readonly REACT_APP_DISABLE_WEBSOCKET: string;
  readonly REACT_APP_SENTRY_DSN: string;
  readonly REACT_APP_SENTRY_DIRECT: string;
  readonly PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Ensure process.env is available in the browser environment
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_ALCHEMY_API_KEY: string;
    REACT_APP_ALCHEMY_MAINNET_URL: string;
    REACT_APP_ALCHEMY_SEPOLIA_URL: string;
    REACT_APP_WALLETCONNECT_PROJECT_ID: string;
    REACT_APP_CONTRACT_ADDRESS: string;
    REACT_APP_PINATA_KEY: string;
    REACT_APP_PINATA_SECRET: string;
    REACT_APP_NFT_STORAGE_KEY: string;
    REACT_APP_ENABLE_MOCK_IPFS: string;
    REACT_APP_DISABLE_SENTRY: string;
    REACT_APP_SUPPRESS_ROUTER_WARNINGS: string;
    REACT_APP_DISABLE_WEBSOCKET: string;
    REACT_APP_SENTRY_DSN: string;
    REACT_APP_SENTRY_DIRECT: string;
    PORT: string;
  }
}