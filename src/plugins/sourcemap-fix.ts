/**
 * Custom Vite plugin to fix sourcemap issues with dag-jose and other IPFS-related libraries
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Creates a plugin that fixes sourcemap issues for specific libraries
 * @returns A Vite plugin that handles sourcemap issues
 */
export function sourcemapFix(): Plugin {
  return {
    name: 'sourcemap-fix',

    // Hook that runs after a module is loaded
    transform(code, id) {
      // Only process JavaScript files from node_modules that might have sourcemap issues
      if (
        id.includes('node_modules/dag-jose') ||
        id.includes('node_modules/@ipld') ||
        id.includes('node_modules/multiformats') ||
        id.includes('node_modules/ipfs-utils')
      ) {
        // Check if the file has a sourceMappingURL comment
        const sourcemapMatch = code.match(/\/\/# sourceMappingURL=(.+)$/m);

        if (sourcemapMatch) {
          const sourcemapUrl = sourcemapMatch[1];
          const sourcemapPath = path.resolve(path.dirname(id), sourcemapUrl);

          // Check if the sourcemap file exists
          if (!fs.existsSync(sourcemapPath)) {
            // Remove the sourcemap comment to prevent errors
            return {
              code: code.replace(/\/\/# sourceMappingURL=(.+)$/m, ''),
              map: null
            };
          }
        }
      }

      return null; // Return null to let Vite handle the file normally
    }
  };
}

export default sourcemapFix;
