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
  init: (config: any) => void;
  captureException: (error: any) => void;
  captureMessage: (message: string) => void;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  isNijaWallet?: boolean;
  name?: string;
  __nijaPatched?: boolean;
  chainId?: string;
  selectedAddress?: string;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  [key: string]: any;
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
    emitEthereumEvent?: (eventName: string, ...args: any[]) => void;
    
    // Node.js polyfills
    global?: typeof globalThis;
    Buffer?: typeof Buffer;
    process?: any;
  }
}

export {};