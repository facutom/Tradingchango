
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    // Usar esbuild para minificación más rápida
    minify: 'esbuild',
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
    // Reportar tamaño comprimido
    reportCompressedSize: true,
    // Generar sourcemaps solo en desarrollo
    sourcemap: false,
    // Optimizar chunks
    chunkSizeWarningLimit: 500,
    // Optimizaciones adicionales de rendimiento
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar vendor chunks para mejor caché
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
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
        },
        // Configurar chunking óptimo
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
  // Optimizaciones de dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js', 'recharts'],
    exclude: [],
  },
});
