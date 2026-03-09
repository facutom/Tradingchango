
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin para servir listas.html desde /listas (Clean URLs en desarrollo)
function cleanUrlPlugin(): Plugin {
  return {
    name: 'clean-url-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Rewrite /listas -> /listas.html para que sea servido como archivo estático
        if (req.url === '/listas' || req.url === '/listas/' || req.url === '/listas.html') {
          req.url = '/listas.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    cleanUrlPlugin(),
    react({
      babel: {
        parserOpts: {
          plugins: ['typescript'],
        },
      },
    }),
  ],
  server: {
    port: 3000,
    fs: {
      allow: ['..', 'public'],
    },
    middlewareMode: false,
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: true,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('@supabase') || id.includes('supabase-js')) {
              return 'vendor-supabase';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('react-window')) {
              return 'vendor-window';
            }
            return 'vendor';
          }
          if (id.includes('components/ProductDetail')) {
            return 'product-detail';
          }
          if (id.includes('components/InfoViews')) {
            return 'info-views';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo: { name?: string }) => {
          const name = assetInfo.name || 'asset';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|webp|svg|ico)$/.test(name)) {
            return `assets/img/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/.test(name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'recharts'],
    exclude: [],
  },
});
