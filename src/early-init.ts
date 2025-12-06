/**
 * This file is imported at the top of main.tsx to run initialization logic
 * before any React components are mounted.
 */

// Session storage key
const SESSION_STORAGE_KEY = 'nija_wallet_session';

// Add custom properties to window
interface Window {
  _originalEthereum?: any;
  _nijaEventHandlers?: Map<string, Set<Function>>;
  ethereum?: any;
}

/**
 * Create a mock provider for Nija Wallet when no real provider is available
 */
function createEarlyMockProvider(sessionData: any) {
  console.log('Early init: Creating mock provider from stored session');
  
  // Check if we need to create a mock provider
  if (typeof window.ethereum !== 'undefined' && window.ethereum.isNijaWallet === true) {
    console.log('Early init: Real Nija Wallet provider already exists');
    return;
  }
  
  // Create a minimal provider with essential methods
  const mockProvider = {
    isNijaWallet: true,
    _isNijaMockProvider: true,
    selectedAddress: sessionData.address,
    chainId: sessionData.chainId,
    
    // Basic request implementation
    async request({ method, params }: { method: string; params?: any[] }) {
      console.log(`Early mock provider request: ${method}`, params);
      
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [sessionData.address];
          
        case 'eth_chainId':
          return sessionData.chainId;
          
        default:
          console.warn(`Early mock provider doesn't support ${method}`);
          throw new Error(`Method ${method} not supported`);
      }
    },
    
    // Event handling stubs
    on(event: string, handler: Function) {
      console.log(`Early mock provider: Registered handler for ${event} event`);
      if (!window._nijaEventHandlers) {
        window._nijaEventHandlers = new Map();
      }
      if (!window._nijaEventHandlers.has(event)) {
        window._nijaEventHandlers.set(event, new Set());
      }
      window._nijaEventHandlers.get(event)?.add(handler);
    },
    
    removeListener(event: string, handler: Function) {
      if (window._nijaEventHandlers?.has(event)) {
        window._nijaEventHandlers.get(event)?.delete(handler);
      }
    },
    
    isConnected() {
      return true;
    }
  };
  
  // Store original provider if it exists
  if (window.ethereum) {
    window._originalEthereum = window.ethereum;
  }
  
  // Set up event handler storage
  if (!window._nijaEventHandlers) {
    window._nijaEventHandlers = new Map();
  }
  
  // Set our mock provider
  console.log('Early init: Setting window.ethereum to mock provider');
  window.ethereum = mockProvider;
  console.log('Early init: Mock Nija Wallet provider injected successfully');
  
  return mockProvider;
}

// Run immediately when this file is imported
console.log('Early initialization: Checking for Nija Wallet session');
try {
  // Check if localStorage is available before accessing it
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.sessionId && session.address) {
        console.log('Early initialization: Valid session found, creating mock provider');
        createEarlyMockProvider(session);
      }
    }
  } else {
    console.warn('Early initialization: localStorage not available, skipping session check');
  }
} catch (error) {
  console.error('Error in early initialization:', error);
  // Don't throw the error, just log it to prevent app crashes
}