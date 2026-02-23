import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Faster JSX transform, smaller output
      jsxRuntime: 'automatic',
    }),
  ],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Target modern browsers — smaller, faster output
    target: 'es2020',

    // Terser for smaller bundles + drop debug statements
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2,
      },
      mangle: { safari10: true },
      format: { comments: false },
    },

    // Inline small assets (reduces HTTP round-trips)
    assetsInlineLimit: 4096,

    // Don't report compressed size — faster build
    reportCompressedSize: false,

    // Raise chunk warning threshold
    chunkSizeWarningLimit: 800,

    // Disable sourcemaps in production
    sourcemap: false,

    rollupOptions: {
      output: {
        // Fine-grained code splitting — each heavy dep is a separate chunk
        manualChunks(id) {
          // Core React — loaded immediately
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          // Router — loaded right after react
          if (id.includes('node_modules/react-router') || id.includes('node_modules/react-router-dom')) {
            return 'router';
          }
          // Recharts — huge (~300KB), lazy-loaded only on Analytics page
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
            return 'charts';
          }
          // Lucide icons — tree-shaken but still significant
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // DnD — only used on Trips page
          if (id.includes('node_modules/@hello-pangea')) {
            return 'dnd';
          }
        },

        // Stable hashes for long-term caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },

      // Aggressive tree-shaking
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
      },
    },
  },

  // Pre-bundle deps that are used everywhere
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
    ],
  },

  // Esbuild config for dev (faster HMR)
  esbuild: {
    legalComments: 'none',
    target: 'es2020',
  },
})
