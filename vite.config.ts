import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';
import sourcemapFix from './src/plugins/sourcemap-fix';
import varintFix from './src/plugins/varint-fix';

// https://vitejs.dev/config/
export default defineConfig({
  // Add base URL for production builds
  base: '/',
  plugins: [
    react(),
    nodePolyfills({
      // Enable all Node.js API polyfills
      protocolImports: true,
      // Explicitly include all Node.js polyfills (including crypto for Web3.Storage)
      include: [
        'buffer',
        'process',
        'util',
        'stream',
        'events',
        'path',
        'crypto'
      ],
      // Enable global variables like process and Buffer
      globals: {
        Buffer: true,
        process: true,
        global: true
      },
      // Override problematic polyfills
      overrides: {
        // Use a more compatible stream implementation
        stream: 'readable-stream'
      }
    }),
    tsconfigPaths(),
    sourcemapFix(), // Add our custom sourcemap fix plugin
    varintFix() // Add our custom varint fix plugin
  ],
  server: {
    host: '0.0.0.0',
    port: 7103,
    strictPort: true, // Don't try another port if 7103 is in use
    hmr: {
      overlay: false,
      timeout: 5000,
      clientPort: 7103 // Ensure HMR uses the correct port
    },
    watch: {
      usePolling: true, // Enable polling for more reliable file watching
      interval: 1000
    },
    fs: {
      allow: ['..']
    },
    cors: {
      origin: '*', // Allow all origins for development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Origin',
        'X-Requested-With',
        'X-NFTGen-Origin',
        'X-NFTGen-Session',
        'x-nftgen-origin',
        'x-nftgen-session'
      ],
      credentials: true,
      exposedHeaders: [
        'Content-Type',
        'Authorization',
        'X-NFTGen-Origin',
        'X-NFTGen-Session'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://3.111.22.56:7104',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/graphql': {
        target: 'http://3.111.22.56:7104',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://3.111.22.56:7105',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer/',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util',
      crypto: 'crypto-browserify',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [
        /node_modules\/varint/,
        /node_modules\/dag-jose/,
        /node_modules\/@ipld/,
        /node_modules\/ipfs-utils/
      ]
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      // Properly handle external sourcemaps
      output: {
        sourcemapExcludeSources: false,
        sourcemapPathTransform: (relativeSourcePath) => {
          // Fix sourcemap paths for node_modules
          if (relativeSourcePath.includes('node_modules')) {
            return relativeSourcePath.replace(/^\.\.\//, '');
          }
          return relativeSourcePath;
        }
      }
    },
  },
  define: {
    'global': 'globalThis',
    'process.env': 'process.env',
  },
  optimizeDeps: {
    // Exclude problematic dependencies from optimization
    exclude: [
      'ipfs-core-utils',
      'ipld-dag-cbor'
    ],
    // Force include dependencies that may be dynamically imported
    include: [
      'buffer',
      'process',
      'stream-browserify',
      'util',
      'crypto-browserify',
      '@storacha/client', // Include the new Storacha client
      'varint', // Include varint to ensure it's properly pre-bundled
      'dag-jose', // Include dag-jose to properly handle its dependencies
      'ipfs-utils', // Include ipfs-utils to properly handle its dependencies
      'ipfs-utils/src/env' // Specifically include the env module
    ],
    // Add special handling for varint
    entries: [
      'varint'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      // Increase memory limit for large dependencies
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      target: 'es2020',
      // Improve module compatibility
      supported: {
        'dynamic-import': true,
        'import-meta': true
      }
    }
  }
});