/**
 * This is a wrapper for the ipfs-utils module to expose named exports
 * to work around ESM/CommonJS compatibility issues
 */

// Use window environment flags if available, otherwise detect directly
let envFlags = {
  isBrowser: false,
  isNode: false,
  isWebWorker: false,
  isJsDom: false,
  isReactNative: false,
  isElectronMain: false,
  isElectronRenderer: false
};

// Initialize environment detection
if (typeof window !== 'undefined' && window.isBrowser !== undefined) {
  // Use the pre-defined environment flags from polyfill.ts
  envFlags = {
    isBrowser: !!window.isBrowser,
    isNode: !!window.isNode,
    isWebWorker: !!window.isWebWorker,
    isJsDom: !!window.isJsDom,
    isReactNative: !!window.isReactNative,
    isElectronMain: !!window.isElectronMain,
    isElectronRenderer: !!window.isElectronRenderer
  };
} else {
  // Direct detection as fallback
  envFlags.isBrowser = typeof window !== 'undefined' &&
                      typeof window.document !== 'undefined';

  envFlags.isNode = typeof process !== 'undefined' &&
                   typeof process.versions !== 'undefined' &&
                   typeof process.versions.node !== 'undefined';

  envFlags.isWebWorker = typeof self !== 'undefined' &&
                        typeof self.WorkerGlobalScope !== 'undefined';

  envFlags.isJsDom = envFlags.isBrowser &&
                    typeof window.navigator !== 'undefined' &&
                    window.navigator.userAgent &&
                    window.navigator.userAgent.includes('jsdom');

  envFlags.isReactNative = typeof navigator !== 'undefined' &&
                          typeof navigator.userAgent !== 'undefined' &&
                          navigator.userAgent.includes('ReactNative');

  envFlags.isElectronMain = envFlags.isNode &&
                           typeof process.versions !== 'undefined' &&
                           typeof process.versions.electron !== 'undefined' &&
                           process.type === 'browser';

  envFlags.isElectronRenderer = envFlags.isBrowser &&
                               typeof window.process !== 'undefined' &&
                               typeof window.process.versions !== 'undefined' &&
                               typeof window.process.versions.electron !== 'undefined';
}

// Export the environment detection variables
export const isBrowser = envFlags.isBrowser;
export const isNode = envFlags.isNode;
export const isWebWorker = envFlags.isWebWorker;
export const isJsDom = envFlags.isJsDom;
export const isReactNative = envFlags.isReactNative;
export const isElectronMain = envFlags.isElectronMain;
export const isElectronRenderer = envFlags.isElectronRenderer;

// Also provide a default export
export default {
  isBrowser,
  isNode,
  isJsDom,
  isReactNative,
  isElectronMain,
  isElectronRenderer,
  isWebWorker
};
