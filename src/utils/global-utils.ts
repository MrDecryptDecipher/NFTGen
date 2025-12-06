/**
 * Global Utilities with Singleton Pattern
 *
 * This module exposes utility functions to the global window object
 * so they can be used in places where direct imports are not possible,
 * such as in JSX event handlers.
 *
 * Implements singleton pattern to prevent duplicate initialization.
 */

import { getBestImageUrl, handleImageError } from './image-utils';

// Singleton state tracking
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Extend the Window interface to include our utilities
declare global {
  interface Window {
    NFTGenUtils?: {
      getBestImageUrl: typeof getBestImageUrl;
      handleImageError: typeof handleImageError;
      _initialized: boolean;
      _initTimestamp: number;
    };
  }
}

/**
 * Initialize global utilities with singleton pattern
 * This function ensures only one initialization occurs across the entire application
 */
export function initializeGlobalUtils(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    console.log('Global utilities initialization already in progress, returning existing promise');
    return initializationPromise;
  }

  // Return resolved promise if already initialized
  if (isInitialized && window.NFTGenUtils?._initialized) {
    console.log('Global utilities already initialized, skipping duplicate initialization');
    return Promise.resolve();
  }

  // Create new initialization promise
  initializationPromise = new Promise<void>((resolve) => {
    console.log('🔧 Initializing global utilities (singleton pattern)...');

    // Double-check to prevent race conditions
    if (isInitialized && window.NFTGenUtils?._initialized) {
      console.log('Global utilities already initialized during promise creation, resolving immediately');
      resolve();
      return;
    }

    try {
      // Create the NFTGenUtils object
      window.NFTGenUtils = {
        getBestImageUrl,
        handleImageError,
        _initialized: true,
        _initTimestamp: Date.now()
      };

      // Clean up any mock NFT data from localStorage (one-time cleanup)
      cleanupMockData();

      // Mark as initialized
      isInitialized = true;

      console.log('✅ Global utilities initialized successfully (singleton)');
      resolve();
    } catch (error) {
      console.error('❌ Failed to initialize global utilities:', error);
      // Reset state on error to allow retry
      isInitialized = false;
      initializationPromise = null;
      resolve(); // Don't reject to prevent app crashes
    }
  });

  return initializationPromise;
}

/**
 * Clean up mock NFT data from localStorage
 * Separated into its own function for better organization
 */
function cleanupMockData(): void {
  try {
    const keys = Object.keys(localStorage);
    const nftKeys = keys.filter(key =>
      key.startsWith('nft_data_') ||
      key.startsWith('nft_image_') ||
      key.startsWith('nft_image_tx_') ||
      key.startsWith('nftgen_tx_')
    );

    if (nftKeys.length > 0) {
      console.log(`🧹 Cleaning up ${nftKeys.length} mock NFT entries from localStorage`);
      nftKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    }
  } catch (e) {
    console.warn('⚠️ Failed to clean up localStorage:', e);
  }
}

/**
 * Initialize known NFT data
 * This function is now a no-op as we're using only real data from Alchemy/Nwallet
 */
export function initializeKnownNFTs(): void {
  console.log('Known NFT initialization disabled - using only real data from Alchemy/Nwallet');
}

/**
 * Check if global utilities are initialized
 */
export function isGlobalUtilsInitialized(): boolean {
  return isInitialized && window.NFTGenUtils?._initialized === true;
}

/**
 * Get initialization timestamp
 */
export function getInitializationTimestamp(): number | null {
  return window.NFTGenUtils?._initTimestamp || null;
}

/**
 * Force reset initialization state (for testing purposes only)
 * @internal
 */
export function _resetInitializationState(): void {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️ _resetInitializationState should only be used in tests');
  }
  isInitialized = false;
  initializationPromise = null;
  if (window.NFTGenUtils) {
    delete window.NFTGenUtils;
  }
}

export default {
  initializeGlobalUtils,
  initializeKnownNFTs,
  isGlobalUtilsInitialized,
  getInitializationTimestamp,
  _resetInitializationState
};
