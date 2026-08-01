import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildMetaCsp } from './src/security/csp.js'

/**
 * ISS-14 / SEC-C-001: emit the CSP into the built index.html.
 *
 * The policy itself lives in src/security/csp.js with per-directive rationale.
 * Injecting it here means the shipped artifact carries its own baseline policy
 * instead of depending solely on an out-of-repo CloudFront header policy that
 * nothing in this repo pins or reviews.
 *
 * Build-only: the dev server is not the artifact being hardened, and a dev-time
 * CSP would block Vite's HMR client (inline scripts + ws:) for no security gain.
 */
function cspMeta() {
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return {
          html,
          tags: [
            {
              tag: 'meta',
              attrs: {
                'http-equiv': 'Content-Security-Policy',
                content: buildMetaCsp(),
              },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), cspMeta()],
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
    // QA-C-011 / PERF-F-017: do not MODULEPRELOAD the heavy view-only vendors.
    //
    // chart-vendor (601 KB) and markdown-vendor (153 KB) are only needed once a user is
    // authenticated and looking at an answer, but Vite emitted a <link rel="modulepreload">
    // for every manual chunk — so 754 KB was fetched on the sign-in screen, before the
    // user had an account, on every cold load. That is ~44% of the bundle spent on code
    // the current screen cannot use.
    //
    // Filtering the preload list does NOT remove the chunks or change any import: they
    // still load, just on demand when the importing component first renders, instead of
    // being pushed eagerly at first paint.
    //
    // Chosen over converting the ~8 importing components to React.lazy(): that would
    // change render timing across the whole chat UI (charts, markdown, fundamentals) and
    // require Suspense boundaries at each site. This gets the first-load win with a
    // one-file, behaviour-preserving change. The lazy-import refactor remains the deeper
    // fix if first-paint on the chat route needs to improve too.
    modulePreload: {
      resolveDependencies: (_url, deps) =>
        deps.filter((d) => !/(chart-vendor|markdown-vendor)/.test(d)),
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
