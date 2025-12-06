// Polyfills for browser environment
import { Buffer } from 'buffer';
import process from 'process/browser';

// Extend Window interface
interface Window {
  isNode?: boolean;
  isBrowser?: boolean;
  isWebWorker?: boolean;
  isJsDom?: boolean;
  isReactNative?: boolean;
  isElectronMain?: boolean;
  isElectronRenderer?: boolean;
  global?: Window & typeof globalThis;
  Buffer?: typeof Buffer;
  process?: any; // Using any to avoid TypeScript errors
  crypto?: Crypto;
  anySignalDefault?: unknown;
  ethereum?: unknown;
  __nftgenPatched?: boolean;
  nijaHeartbeatInterval?: any;
  emitEthereumEvent?: (eventName: string, ...args: unknown[]) => void;
  Sentry?: {
    init: (config: unknown) => void;
    captureException: (error: unknown) => void;
    captureMessage: (message: string) => void;
  };
}

// Set environment detection flags
window.isNode = false;
window.isBrowser = true;
window.isWebWorker = typeof self !== 'undefined' &&
                    typeof self.WorkerGlobalScope !== 'undefined';
window.isJsDom = false;
window.isReactNative = false;
window.isElectronMain = false;
window.isElectronRenderer = false;

// Add polyfills to window
if (typeof window !== 'undefined') {
  // Add global reference
  window.global = window;

  // Add Buffer
  window.Buffer = Buffer;

  // Ensure crypto is available (use native browser crypto)
  if (!window.crypto && typeof crypto !== 'undefined') {
    window.crypto = crypto;
  }

  // Add process
  // @ts-expect-error - Process from browser polyfill
  window.process = process;

  // Ensure process.env exists
  if (!window.process.env) {
    // @ts-expect-error - Creating process.env
    window.process.env = {};
  }

  // Set browser flag
  // @ts-expect-error - Setting browser flag
  window.process.browser = true;
}

// Ensure global crypto is available for w3up-client (use native browser crypto)
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  if (typeof window !== 'undefined' && window.crypto) {
    globalThis.crypto = window.crypto;
  }
}

export {};