import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
  build: {
    // Split vendor chunks so browser can cache them independently
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts', 'lightweight-charts'],
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
          // QA-C-015: no 'supabase-vendor' chunk. Supabase was retired in favour of
          // Cognito and nothing under src/ imports @supabase/supabase-js any more,
          // but naming it here forced Rollup to emit the chunk and a modulepreload
          // link for it — so every visitor fetched a vendor bundle for a dependency
          // the app no longer uses. The package is also dropped from package.json.
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
    include: ['react', 'react-dom', 'recharts', 'react-markdown', 'lightweight-charts'],
  },
})
