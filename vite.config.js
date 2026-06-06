import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Split vendor chunks so browser can cache them independently
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
    // Raise chunk warning threshold — recharts is legitimately large
    chunkSizeWarningLimit: 600,
    // Source maps for production error tracking
    sourcemap: false,
    // Minify with esbuild (default, fast)
    minify: 'esbuild',
  },
  // Faster dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'react-markdown'],
  },
})
