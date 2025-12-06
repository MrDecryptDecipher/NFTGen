// vite.config.js
import { defineConfig } from "file:///home/ubuntu/Sandeep/projects/NFTGen/node_modules/vite/dist/node/index.js";
import react from "file:///home/ubuntu/Sandeep/projects/NFTGen/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { resolve } from "path";
import { nodePolyfills } from "file:///home/ubuntu/Sandeep/projects/NFTGen/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { viteCommonjs } from "file:///home/ubuntu/Sandeep/projects/NFTGen/node_modules/@originjs/vite-plugin-commonjs/lib/index.js";
var __vite_injected_original_dirname = "/home/ubuntu/Sandeep/projects/NFTGen";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    viteCommonjs(),
    nodePolyfills({
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      // Whether to polyfill specific modules.
      protocolImports: true
    })
  ],
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "src"),
      "varint": resolve(__vite_injected_original_dirname, "src/utils/varint-wrapper.js"),
      "ipfs-utils/src/env.js": resolve(__vite_injected_original_dirname, "src/utils/ipfs-utils-wrapper.js"),
      "ipfs-utils/src/env": resolve(__vite_injected_original_dirname, "src/utils/ipfs-utils-wrapper.js"),
      "any-signal": resolve(__vite_injected_original_dirname, "src/utils/any-signal-wrapper.js")
    },
    mainFields: ["browser", "module", "main"]
  },
  server: {
    port: 7103,
    host: "0.0.0.0",
    strictPort: true,
    hmr: {
      clientPort: 7103
    },
    watch: {
      usePolling: true,
      interval: 1e3
    },
    proxy: {
      "/api": {
        target: "http://localhost:7102",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      },
      "/graphql": {
        target: "http://localhost:7102",
        changeOrigin: true
      },
      "/ws": {
        target: "ws://localhost:7101",
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, "")
      }
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "ethers",
      "@apollo/client",
      "react-toastify",
      "@headlessui/react",
      "@heroicons/react",
      "process",
      "buffer",
      "./src/utils/varint-wrapper.js",
      "./src/utils/ipfs-utils-wrapper.js",
      "./src/utils/any-signal-wrapper.js"
    ],
    exclude: [
      "ipfs-core",
      "ipfs-http-client"
    ],
    // Add ESBuild options to fix module export issues
    esbuildOptions: {
      define: {
        global: "globalThis"
      }
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /varint/, /ipfs-utils/, /any-signal/]
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": [
            "react",
            "react-dom",
            "react-router-dom"
          ],
          "ethers": ["ethers"],
          "ui": [
            "@headlessui/react",
            "@heroicons/react",
            "react-toastify"
          ]
        }
      }
    }
  },
  define: {
    // Define environment variables in compiled code
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    // Disable all external ipfs DNS resolution in development
    "process.env.IPFS_FORCE_LOCAL_GATEWAY": JSON.stringify("true")
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS91YnVudHUvU2FuZGVlcC9wcm9qZWN0cy9ORlRHZW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3VidW50dS9TYW5kZWVwL3Byb2plY3RzL05GVEdlbi92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS91YnVudHUvU2FuZGVlcC9wcm9qZWN0cy9ORlRHZW4vdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnXG5pbXBvcnQgeyB2aXRlQ29tbW9uanMgfSBmcm9tICdAb3JpZ2luanMvdml0ZS1wbHVnaW4tY29tbW9uanMnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB2aXRlQ29tbW9uanMoKSxcbiAgICBub2RlUG9seWZpbGxzKHtcbiAgICAgIC8vIFdoZXRoZXIgdG8gcG9seWZpbGwgc3BlY2lmaWMgZ2xvYmFscy5cbiAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgQnVmZmVyOiB0cnVlLFxuICAgICAgICBnbG9iYWw6IHRydWUsXG4gICAgICAgIHByb2Nlc3M6IHRydWUsXG4gICAgICB9LFxuICAgICAgLy8gV2hldGhlciB0byBwb2x5ZmlsbCBzcGVjaWZpYyBtb2R1bGVzLlxuICAgICAgcHJvdG9jb2xJbXBvcnRzOiB0cnVlLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICd2YXJpbnQnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91dGlscy92YXJpbnQtd3JhcHBlci5qcycpLFxuICAgICAgJ2lwZnMtdXRpbHMvc3JjL2Vudi5qcyc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3V0aWxzL2lwZnMtdXRpbHMtd3JhcHBlci5qcycpLFxuICAgICAgJ2lwZnMtdXRpbHMvc3JjL2Vudic6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3V0aWxzL2lwZnMtdXRpbHMtd3JhcHBlci5qcycpLFxuICAgICAgJ2FueS1zaWduYWwnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91dGlscy9hbnktc2lnbmFsLXdyYXBwZXIuanMnKSxcbiAgICB9LFxuICAgIG1haW5GaWVsZHM6IFsnYnJvd3NlcicsICdtb2R1bGUnLCAnbWFpbiddXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDcxMDMsXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBjbGllbnRQb3J0OiA3MTAzXG4gICAgfSxcbiAgICB3YXRjaDoge1xuICAgICAgdXNlUG9sbGluZzogdHJ1ZSxcbiAgICAgIGludGVydmFsOiAxMDAwXG4gICAgfSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NzEwMicsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS8sICcnKSxcbiAgICAgIH0sXG4gICAgICAnL2dyYXBocWwnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NzEwMicsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAnL3dzJzoge1xuICAgICAgICB0YXJnZXQ6ICd3czovL2xvY2FsaG9zdDo3MTAxJyxcbiAgICAgICAgd3M6IHRydWUsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL3dzLywgJycpLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnZXRoZXJzJyxcbiAgICAgICdAYXBvbGxvL2NsaWVudCcsXG4gICAgICAncmVhY3QtdG9hc3RpZnknLFxuICAgICAgJ0BoZWFkbGVzc3VpL3JlYWN0JyxcbiAgICAgICdAaGVyb2ljb25zL3JlYWN0JyxcbiAgICAgICdwcm9jZXNzJyxcbiAgICAgICdidWZmZXInLFxuICAgICAgJy4vc3JjL3V0aWxzL3ZhcmludC13cmFwcGVyLmpzJyxcbiAgICAgICcuL3NyYy91dGlscy9pcGZzLXV0aWxzLXdyYXBwZXIuanMnLFxuICAgICAgJy4vc3JjL3V0aWxzL2FueS1zaWduYWwtd3JhcHBlci5qcydcbiAgICBdLFxuICAgIGV4Y2x1ZGU6IFtcbiAgICAgICdpcGZzLWNvcmUnLFxuICAgICAgJ2lwZnMtaHR0cC1jbGllbnQnXG4gICAgXSxcbiAgICAvLyBBZGQgRVNCdWlsZCBvcHRpb25zIHRvIGZpeCBtb2R1bGUgZXhwb3J0IGlzc3Vlc1xuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICBkZWZpbmU6IHtcbiAgICAgICAgZ2xvYmFsOiAnZ2xvYmFsVGhpcycsXG4gICAgICB9XG4gICAgfVxuICB9LFxuICBidWlsZDoge1xuICAgIGNvbW1vbmpzT3B0aW9uczoge1xuICAgICAgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWUsXG4gICAgICBpbmNsdWRlOiBbL25vZGVfbW9kdWxlcy8sIC92YXJpbnQvLCAvaXBmcy11dGlscy8sIC9hbnktc2lnbmFsL11cbiAgICB9LFxuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3ZlbmRvcic6IFtcbiAgICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgICAgICdyZWFjdC1yb3V0ZXItZG9tJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgJ2V0aGVycyc6IFsnZXRoZXJzJ10sXG4gICAgICAgICAgJ3VpJzogW1xuICAgICAgICAgICAgJ0BoZWFkbGVzc3VpL3JlYWN0JyxcbiAgICAgICAgICAgICdAaGVyb2ljb25zL3JlYWN0JyxcbiAgICAgICAgICAgICdyZWFjdC10b2FzdGlmeSdcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGRlZmluZToge1xuICAgIC8vIERlZmluZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaW4gY29tcGlsZWQgY29kZVxuICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WKSxcbiAgICAvLyBEaXNhYmxlIGFsbCBleHRlcm5hbCBpcGZzIEROUyByZXNvbHV0aW9uIGluIGRldmVsb3BtZW50XG4gICAgJ3Byb2Nlc3MuZW52LklQRlNfRk9SQ0VfTE9DQUxfR0FURVdBWSc6IEpTT04uc3RyaW5naWZ5KCd0cnVlJyksXG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4UixTQUFTLG9CQUFvQjtBQUMzVCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFC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
