/**
 * Safe storage utility with fallback for environments where localStorage is not available
 * or throws "Access to storage is not allowed from this context" errors
 */

// In-memory fallback storage when localStorage is not available
const memoryStorage = new Map<string, string>();

// Session storage fallback when localStorage is not available
const sessionStorageFallback = new Map<string, string>();

// Cross-origin storage detection
let storageAccessDenied = false;
let lastStorageTest = 0;
const STORAGE_TEST_INTERVAL = 30000; // Test every 30 seconds

/**
 * Enhanced localStorage availability check with cross-origin detection
 * @returns True if localStorage is available and working, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  const now = Date.now();

  // Only test periodically to avoid performance issues
  if (now - lastStorageTest < STORAGE_TEST_INTERVAL && storageAccessDenied) {
    return false;
  }

  try {
    const testKey = '__nftgen_storage_test__';
    const testValue = `test_${now}`;

    // Test localStorage write
    localStorage.setItem(testKey, testValue);

    // Test localStorage read
    const result = localStorage.getItem(testKey) === testValue;

    // Test localStorage delete
    localStorage.removeItem(testKey);

    lastStorageTest = now;
    storageAccessDenied = false;

    console.log('localStorage is available and working');
    return result;
  } catch (e) {
    lastStorageTest = now;
    storageAccessDenied = true;

    const errorMessage = e instanceof Error ? e.message : String(e);
    console.warn('localStorage is not available:', errorMessage);

    // Check for specific cross-origin errors
    if (errorMessage.includes('Access to storage is not allowed') ||
        errorMessage.includes('SecurityError') ||
        errorMessage.includes('cross-origin')) {
      console.warn('Cross-origin storage access detected, using fallback storage');
    }

    return false;
  }
}

/**
 * Enhanced storage getter with multiple fallback mechanisms
 * @param key The key to get
 * @returns The value or null if not found
 */
export function getStorageItem(key: string): string | null {
  // Try localStorage first
  if (!storageAccessDenied) {
    try {
      if (isLocalStorageAvailable()) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          console.log(`Retrieved ${key} from localStorage`);
          return value;
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`Error getting item from localStorage: ${key}`, errorMessage);

      // Mark storage as denied if it's a cross-origin error
      if (errorMessage.includes('Access to storage is not allowed') ||
          errorMessage.includes('SecurityError') ||
          errorMessage.includes('cross-origin')) {
        storageAccessDenied = true;
      }
    }
  }

  // Try sessionStorage as fallback
  try {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null) {
      console.log(`Retrieved ${key} from sessionStorage`);
      return sessionValue;
    }
  } catch (e) {
    console.warn(`Error getting item from sessionStorage: ${key}`, e);
  }

  // Check sessionStorage fallback map
  const sessionFallbackValue = sessionStorageFallback.get(key);
  if (sessionFallbackValue !== undefined) {
    console.log(`Retrieved ${key} from sessionStorage fallback`);
    return sessionFallbackValue;
  }

  // Finally check memory storage
  const memoryValue = memoryStorage.get(key);
  if (memoryValue !== undefined) {
    console.log(`Retrieved ${key} from memory storage`);
    return memoryValue;
  }

  return null;
}

/**
 * Enhanced storage setter with multiple fallback mechanisms
 * @param key The key to set
 * @param value The value to set
 */
export function setStorageItem(key: string, value: string): void {
  let success = false;

  // Try localStorage first
  if (!storageAccessDenied) {
    try {
      if (isLocalStorageAvailable()) {
        localStorage.setItem(key, value);
        success = true;
        console.log(`Successfully stored ${key} in localStorage`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn(`Error setting item in localStorage: ${key}`, errorMessage);

      // Mark storage as denied if it's a cross-origin error
      if (errorMessage.includes('Access to storage is not allowed') ||
          errorMessage.includes('SecurityError') ||
          errorMessage.includes('cross-origin')) {
        storageAccessDenied = true;
      }
    }
  }

  // Try sessionStorage as fallback
  if (!success) {
    try {
      sessionStorage.setItem(key, value);
      sessionStorageFallback.set(key, value);
      success = true;
      console.log(`Successfully stored ${key} in sessionStorage`);
    } catch (e) {
      console.warn(`Error setting item in sessionStorage: ${key}`, e);
    }
  }

  // Always store in memory as final fallback
  memoryStorage.set(key, value);
  if (!success) {
    console.log(`Stored ${key} in memory storage as fallback`);
  }
}

/**
 * Remove an item from storage with fallback to memory storage
 * @param key The key to remove
 */
export function removeStorageItem(key: string): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
    memoryStorage.delete(key);
  } catch (e) {
    console.warn(`Error removing item from storage: ${key}`, e);
    memoryStorage.delete(key);
  }
}

/**
 * Clear all items from storage with fallback to memory storage
 */
export function clearStorage(): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.clear();
    }
    memoryStorage.clear();
  } catch (e) {
    console.warn('Error clearing storage', e);
    memoryStorage.clear();
  }
}

/**
 * Get all keys from storage with fallback to memory storage
 * @returns Array of keys
 */
export function getStorageKeys(): string[] {
  try {
    if (isLocalStorageAvailable()) {
      return Object.keys(localStorage);
    }
    return Array.from(memoryStorage.keys());
  } catch (e) {
    console.warn('Error getting storage keys', e);
    return Array.from(memoryStorage.keys());
  }
}

/**
 * Check if a key exists in storage with fallback to memory storage
 * @param key The key to check
 * @returns True if the key exists, false otherwise
 */
export function hasStorageItem(key: string): boolean {
  try {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key) !== null;
    }
    return memoryStorage.has(key);
  } catch (e) {
    console.warn(`Error checking if item exists in storage: ${key}`, e);
    return memoryStorage.has(key);
  }
}

/**
 * Get the storage length with fallback to memory storage
 * @returns The number of items in storage
 */
export function getStorageLength(): number {
  try {
    if (isLocalStorageAvailable()) {
      return localStorage.length;
    }
    return memoryStorage.size;
  } catch (e) {
    console.warn('Error getting storage length', e);
    return memoryStorage.size;
  }
}

// Export a default object with all functions
export default {
  isLocalStorageAvailable,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  getStorageKeys,
  hasStorageItem,
  getStorageLength
};
