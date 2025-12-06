// Custom typings for modules without type definitions

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// For IPFS HTTP Client
declare module 'ipfs-http-client' {
  export interface AddResult {
    path: string;
    size: number;
    hash?: string;
    cid?: string;
  }

  export interface IPFSHTTPClient {
    add(file: File | Blob | string | Uint8Array): Promise<AddResult>;
  }

  export interface IPFSOptions {
    host: string;
    port: number;
    protocol: string;
    headers: {
      authorization: string;
    };
  }

  export function create(options: IPFSOptions): IPFSHTTPClient;
}

// Global Buffer reference for browser environments
interface Window {
  Buffer: typeof Buffer;
  fs: {
    readFile(path: string, options?: { encoding?: string }): Promise<Buffer | string>;
  };
}

// Enhanced JSX namespace
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}

// Fix for the BufferConstructor name
interface BufferConstructor {
  from(str: string, encoding?: string): Buffer;
  from(arrayBuffer: ArrayBuffer, byteOffset?: number, length?: number): Buffer;
  alloc(size: number): Buffer;
  isBuffer(obj: unknown): boolean;
}

// Define the Buffer globally since it's used by IPFS client
declare const Buffer: BufferConstructor;

// Ensure TypeScript doesn't complain about the Buffer implementation
interface Buffer extends Uint8Array {
  toString(encoding?: string, start?: number, end?: number): string;
  write(string: string, offset?: number, length?: number, encoding?: string): number;
  copy(target: Buffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
}

// Global type declarations for the NFTGen application

interface SentryInstance {
  init: (config: Record<string, unknown>) => void;
  captureException: (error: Error | unknown) => void;
  captureMessage: (message: string) => void;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  isNijaWallet?: boolean;
  name?: string;
  __nijaPatched?: boolean;
  chainId?: string;
  selectedAddress?: string;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  [key: string]: unknown;
}

interface NFTActivity {
  id?: string;
  transactionHash?: string;
  hash?: string;
  type: string;
  status: 'pending' | 'success' | 'failed';
  timestamp?: number | string;
  tokenId?: string;
  tokenURI?: string;
  to?: string;
  from?: string;
  name?: string;
  description?: string;
  image?: string;
  externalUrl?: string;
  nftgenUrl?: string;
  details?: Record<string, unknown>;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface NijaWalletProvider {
  isNijaWallet: boolean;
  name: string;
  chainId?: string;
  selectedAddress?: string;
  sessionId?: string;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  sendTransaction: (params: Record<string, unknown>) => Promise<{ hash: string }>;
}

declare global {
  interface Window {
    // Ethereum provider
    ethereum?: EthereumProvider;

    // Sentry error tracking
    Sentry?: SentryInstance;
    __SENTRY__?: { enabled: boolean };

    // Nija Wallet integration
    nijaHeartbeatInterval?: NodeJS.Timeout;
    emitEthereumEvent?: (eventName: string, data: unknown) => void;
    nijaWalletProvider?: NijaWalletProvider;
    nijaWalletConnected?: boolean;
    nijaWalletAddress?: string;
    nijaWalletChainId?: string;
    nijaWalletSessionId?: string;

    // NFTGen WebSocket connection
    nftGenWalletWs?: WebSocket;

    // Environment flags
    isNode?: boolean;
    isBrowser?: boolean;
    isWebWorker?: boolean;

    // Node.js polyfills
    global?: typeof globalThis;
    Buffer?: typeof Buffer;
    process?: {
      env: Record<string, string | undefined>;
      browser?: boolean;
      [key: string]: unknown;
    };
  }
}

export {};