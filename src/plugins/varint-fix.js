/**
 * Custom Vite plugin to fix varint module initialization issues
 */

export default function varintFix() {
  return {
    name: 'vite-plugin-varint-fix',
    
    // Transform the varint module to ensure proper initialization
    transform(code, id) {
      // Only transform the varint module
      if (id.includes('node_modules/varint/index.js')) {
        console.log('Applying varint fix to:', id);
        
        // Wrap the module in a function to ensure proper initialization
        const transformedCode = `
// Modified by vite-plugin-varint-fix
const varintModule = (function() {
  ${code}
  // Return the module exports
  return module.exports;
})();

// Export as both default and named exports
export default varintModule;
export const encode = varintModule.encode;
export const decode = varintModule.decode;
export const encodingLength = varintModule.encodingLength;
`;
        
        return {
          code: transformedCode,
          map: null // We don't need source maps for this transformation
        };
      }
      
      return null; // Return null to let Vite handle other modules
    }
  };
}
