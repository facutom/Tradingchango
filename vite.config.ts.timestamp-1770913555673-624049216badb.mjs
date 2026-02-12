// vite.config.ts
import { defineConfig } from "file:///C:/Users/facu_/OneDrive/Documentos/GitHub/Tradingchango/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/facu_/OneDrive/Documentos/GitHub/Tradingchango/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 3e3
  },
  build: {
    outDir: "dist",
    // Optimizaciones de build
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks para mejor caché
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts": ["recharts"]
        },
        // Configurar chunking óptimo
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|webp|svg|ico)$/.test(assetInfo.name)) {
            return `assets/img/[name]-[hash].${ext}`;
          }
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // Habilitar tree shaking
    treeShaking: true,
    // Generar sourcemaps solo en desarrollo
    sourcemap: false,
    // Optimizar chunks
    chunkSizeWarningLimit: 500
  },
  // Optimizaciones de dependencias
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js", "recharts"],
    exclude: []
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxmYWN1X1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEdpdEh1YlxcXFxUcmFkaW5nY2hhbmdvXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxmYWN1X1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudG9zXFxcXEdpdEh1YlxcXFxUcmFkaW5nY2hhbmdvXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9mYWN1Xy9PbmVEcml2ZS9Eb2N1bWVudG9zL0dpdEh1Yi9UcmFkaW5nY2hhbmdvL3ZpdGUuY29uZmlnLnRzXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiAzMDAwLFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgLy8gT3B0aW1pemFjaW9uZXMgZGUgYnVpbGRcclxuICAgIG1pbmlmeTogJ3RlcnNlcicsXHJcbiAgICB0ZXJzZXJPcHRpb25zOiB7XHJcbiAgICAgIGNvbXByZXNzOiB7XHJcbiAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxyXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXHJcbiAgICAgICAgcHVyZV9mdW5jczogWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nLCAnY29uc29sZS5kZWJ1ZyddLFxyXG4gICAgICAgIHBhc3NlczogMixcclxuICAgICAgfSxcclxuICAgICAgbWFuZ2xlOiB7XHJcbiAgICAgICAgc2FmYXJpMTA6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgIGNvbW1lbnRzOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgLy8gU2VwYXJhciB2ZW5kb3IgY2h1bmtzIHBhcmEgbWVqb3IgY2FjaFx1MDBFOVxyXG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgICd2ZW5kb3Itc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxyXG4gICAgICAgICAgJ3ZlbmRvci1jaGFydHMnOiBbJ3JlY2hhcnRzJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICAvLyBDb25maWd1cmFyIGNodW5raW5nIFx1MDBGM3B0aW1vXHJcbiAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcclxuICAgICAgICAgIGNvbnN0IGluZm8gPSBhc3NldEluZm8ubmFtZS5zcGxpdCgnLicpO1xyXG4gICAgICAgICAgY29uc3QgZXh0ID0gaW5mb1tpbmZvLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfGdpZnx3ZWJwfHN2Z3xpY28pJC8udGVzdChhc3NldEluZm8ubmFtZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvaW1nL1tuYW1lXS1baGFzaF0uJHtleHR9YDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICgvXFwuKGNzcykkLy50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9jc3MvW25hbWVdLVtoYXNoXS4ke2V4dH1gO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXS4ke2V4dH1gO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgLy8gSGFiaWxpdGFyIHRyZWUgc2hha2luZ1xyXG4gICAgdHJlZVNoYWtpbmc6IHRydWUsXHJcbiAgICAvLyBHZW5lcmFyIHNvdXJjZW1hcHMgc29sbyBlbiBkZXNhcnJvbGxvXHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gICAgLy8gT3B0aW1pemFyIGNodW5rc1xyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA1MDAsXHJcbiAgfSxcclxuICAvLyBPcHRpbWl6YWNpb25lcyBkZSBkZXBlbmRlbmNpYXNcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nLCAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJywgJ3JlY2hhcnRzJ10sXHJcbiAgICBleGNsdWRlOiBbXSxcclxuICB9LFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQTtBQUFBLElBRVIsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLFFBQ2YsWUFBWSxDQUFDLGVBQWUsZ0JBQWdCLGVBQWU7QUFBQSxRQUMzRCxRQUFRO0FBQUEsTUFDVjtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sVUFBVTtBQUFBLE1BQ1o7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFVBQVU7QUFBQSxNQUNaO0FBQUEsSUFDRjtBQUFBLElBQ0EsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBO0FBQUEsVUFFWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDekQsbUJBQW1CLENBQUMsdUJBQXVCO0FBQUEsVUFDM0MsaUJBQWlCLENBQUMsVUFBVTtBQUFBLFFBQzlCO0FBQUE7QUFBQSxRQUVBLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQixDQUFDLGNBQWM7QUFDN0IsZ0JBQU0sT0FBTyxVQUFVLEtBQUssTUFBTSxHQUFHO0FBQ3JDLGdCQUFNLE1BQU0sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUNoQyxjQUFJLGtDQUFrQyxLQUFLLFVBQVUsSUFBSSxHQUFHO0FBQzFELG1CQUFPLDRCQUE0QixHQUFHO0FBQUEsVUFDeEM7QUFDQSxjQUFJLFdBQVcsS0FBSyxVQUFVLElBQUksR0FBRztBQUNuQyxtQkFBTyw0QkFBNEIsR0FBRztBQUFBLFVBQ3hDO0FBQ0EsaUJBQU8sd0JBQXdCLEdBQUc7QUFBQSxRQUNwQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUVBLGFBQWE7QUFBQTtBQUFBLElBRWIsV0FBVztBQUFBO0FBQUEsSUFFWCx1QkFBdUI7QUFBQSxFQUN6QjtBQUFBO0FBQUEsRUFFQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLG9CQUFvQix5QkFBeUIsVUFBVTtBQUFBLElBQ3ZGLFNBQVMsQ0FBQztBQUFBLEVBQ1o7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
