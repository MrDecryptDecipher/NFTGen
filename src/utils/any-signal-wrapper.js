/**
 * This is a wrapper for the any-signal module to expose both named and default exports
 * to work around ESM/CommonJS compatibility issues
 */

// Define a fallback implementation first to ensure it's always available
function fallbackAnySignal(signals) {
  // Simple implementation that just returns the first signal or a dummy signal
  if (!signals || !Array.isArray(signals) || signals.length === 0) {
    return {
      signal: {
        aborted: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        onabort: null
      },
      clear: () => {}
    };
  }

  return {
    signal: signals[0],
    clear: () => {}
  };
}

// Define our exports first to avoid initialization issues
const anySignalExport = fallbackAnySignal;
export default anySignalExport;
export const anySignal = anySignalExport;

// Now try to load the real implementation
try {
  // Dynamic import to avoid initialization issues
  import('any-signal').then(anySignalModule => {
    // Only replace if we successfully loaded the module
    if (anySignalModule) {
      // Get the function from the module
      let realImplementation;

      if (typeof anySignalModule === 'function') {
        realImplementation = anySignalModule;
      } else if (typeof anySignalModule.default === 'function') {
        realImplementation = anySignalModule.default;
      } else {
        console.warn('any-signal module loaded but no valid function found, using fallback');
        return; // Keep using the fallback
      }

      // Replace the global reference if available
      if (typeof window !== 'undefined') {
        window.anySignalDefault = realImplementation;
      }

      console.log('Successfully loaded any-signal module');
    }
  }).catch(error => {
    console.warn('Error loading any-signal module, using fallback implementation:', error);
  });
} catch (error) {
  console.warn('Error in any-signal wrapper, using fallback implementation:', error);
}
