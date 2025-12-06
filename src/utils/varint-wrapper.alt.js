/**
 * Alternative implementation of the varint wrapper
 * This approach uses dynamic imports to ensure the module is fully loaded
 */

// Define placeholder functions that will be replaced once the module is loaded
let encode = (...args) => {
  console.warn('Varint encode called before initialization');
  return new Uint8Array(0);
};

let decode = (...args) => {
  console.warn('Varint decode called before initialization');
  return 0;
};

let encodingLength = (...args) => {
  console.warn('Varint encodingLength called before initialization');
  return 0;
};

// Create a module object with the placeholder functions
const varintModule = {
  encode,
  decode,
  encodingLength
};

// Dynamically import the varint module and replace the placeholder functions
(async () => {
  try {
    // Import the module
    const varintImport = await import('varint');
    
    // Get the actual module (could be default export or the module itself)
    const varintOriginal = varintImport.default || varintImport;
    
    // Replace the placeholder functions with the actual implementations
    if (typeof varintOriginal.encode === 'function') {
      varintModule.encode = varintOriginal.encode;
      encode = varintOriginal.encode;
    }
    
    if (typeof varintOriginal.decode === 'function') {
      varintModule.decode = varintOriginal.decode;
      decode = varintOriginal.decode;
    }
    
    if (typeof varintOriginal.encodingLength === 'function') {
      varintModule.encodingLength = varintOriginal.encodingLength;
      encodingLength = varintOriginal.encodingLength;
    }
    
    console.log('Varint module successfully loaded');
  } catch (error) {
    console.error('Failed to load varint module:', error);
  }
})();

// Export the module object and the functions
export default varintModule;
export { encode, decode, encodingLength };
