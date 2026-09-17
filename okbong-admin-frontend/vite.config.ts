import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Non-VITE_ vars are not exposed on process.env when the config is evaluated,
  // so read them explicitly from the .env files.
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.API_PROXY_TARGET || process.env.API_PROXY_TARGET

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    base: '/',
    server: {
      host: true,
      port: 5173,
      // The public runtime host forwards requests with its own Host header, which
      // Vite rejects by default. Dev-only: allowedHosts is ignored by `vite build`.
      allowedHosts: true,
      // Dev proxy: the browser only reaches the public runtime host, so API
      // calls are proxied server-side to the backend to avoid cross-origin
      // localhost references. Only active when API_PROXY_TARGET is set.
      proxy: proxyTarget
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              ws: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  }
})