/**
 * This is a wrapper for the varint module to expose both named and default exports
 * to work around ESM/CommonJS compatibility issues
 */

// Import the varint module directly
import varintOriginal from 'varint';

// Create a safe wrapper for the module with proper function implementations
const varintModule = {
  // Implement encode function safely
  encode: function(num, arr, offset) {
    // Make sure varintOriginal is properly loaded
    if (!varintOriginal || (typeof varintOriginal !== 'function' && !varintOriginal.encode && !varintOriginal.default?.encode)) {
      console.error('Varint module not properly loaded');
      // Return a safe fallback
      if (arr) {
        arr[offset || 0] = num & 0x7f;
        return 1;
      }
      return new Uint8Array([num & 0x7f]);
    }

    // Use the proper encode function
    const encodeFn = typeof varintOriginal === 'function' ? varintOriginal :
                    (varintOriginal.encode || varintOriginal.default?.encode);

    try {
      return encodeFn(num, arr, offset);
    } catch (error) {
      console.error('Error in varint encode:', error);
      // Return a safe fallback
      if (arr) {
        arr[offset || 0] = num & 0x7f;
        return 1;
      }
      return new Uint8Array([num & 0x7f]);
    }
  },

  // Implement decode function safely
  decode: function(buf, offset) {
    // Make sure varintOriginal is properly loaded
    if (!varintOriginal || (typeof varintOriginal !== 'function' && !varintOriginal.decode && !varintOriginal.default?.decode)) {
      console.error('Varint module not properly loaded');
      // Return a safe fallback
      return buf[offset || 0] & 0x7f;
    }

    // Use the proper decode function
    const decodeFn = typeof varintOriginal === 'function' ? varintOriginal :
                    (varintOriginal.decode || varintOriginal.default?.decode);

    try {
      return decodeFn(buf, offset);
    } catch (error) {
      console.error('Error in varint decode:', error);
      // Return a safe fallback
      return buf[offset || 0] & 0x7f;
    }
  },

  // Implement encodingLength function safely
  encodingLength: function(num) {
    // Make sure varintOriginal is properly loaded
    if (!varintOriginal || (typeof varintOriginal !== 'function' && !varintOriginal.encodingLength && !varintOriginal.default?.encodingLength)) {
      console.error('Varint module not properly loaded');
      // Return a safe fallback
      return num < 128 ? 1 : 2;
    }

    // Use the proper encodingLength function
    const encodingLengthFn = typeof varintOriginal === 'function' ? varintOriginal.encodingLength :
                            (varintOriginal.encodingLength || varintOriginal.default?.encodingLength);

    try {
      return encodingLengthFn(num);
    } catch (error) {
      console.error('Error in varint encodingLength:', error);
      // Return a safe fallback
      return num < 128 ? 1 : 2;
    }
  }
};

// Export the entire module as default
export default varintModule;

// Export the named exports directly as functions
export const encode = varintModule.encode;
export const decode = varintModule.decode;
export const encodingLength = varintModule.encodingLength;
