import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCommonjs(),
    nodePolyfills({
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill specific modules.
      protocolImports: true,
    }),
  ],
  define: {
    // Add environment variables for StrictMode control
    'import.meta.env.VITE_DISABLE_STRICT_MODE': JSON.stringify(process.env.VITE_DISABLE_STRICT_MODE || 'false')
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'varint': resolve(__dirname, 'src/utils/varint-wrapper.js'),
      'ipfs-utils/src/env.js': resolve(__dirname, 'src/utils/ipfs-utils-wrapper.js'),
      'ipfs-utils/src/env': resolve(__dirname, 'src/utils/ipfs-utils-wrapper.js'),
      'any-signal': resolve(__dirname, 'src/utils/any-signal-wrapper.js'),
    },
    mainFields: ['browser', 'module', 'main']
  },
  server: {
    port: 7103,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      clientPort: 7103
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:7102',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/graphql': {
        target: 'http://localhost:7102',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:7101',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'ethers',
      '@apollo/client',
      'react-toastify',
      '@headlessui/react',
      '@heroicons/react',
      'process',
      'buffer',
      './src/utils/varint-wrapper.js',
      './src/utils/ipfs-utils-wrapper.js',
      './src/utils/any-signal-wrapper.js'
    ],
    exclude: [
      'ipfs-core',
      'ipfs-http-client'
    ],
    // Add ESBuild options to fix module export issues
    esbuildOptions: {
      define: {
        global: 'globalThis',
      }
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /varint/, /ipfs-utils/, /any-signal/]
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          'ethers': ['ethers'],
          'ui': [
            '@headlessui/react',
            '@heroicons/react',
            'react-toastify'
          ]
        }
      }
    }
  },
  define: {
    // Define environment variables in compiled code
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    // Disable all external ipfs DNS resolution in development
    'process.env.IPFS_FORCE_LOCAL_GATEWAY': JSON.stringify('true'),
  }
})