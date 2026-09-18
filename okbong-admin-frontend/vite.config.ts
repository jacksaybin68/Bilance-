import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // `VITE_BASE_PATH` cho phép phục vụ admin dưới một prefix (proxy-layer route
  // `/admin/*` → cần `VITE_BASE_PATH=/admin/`, nếu không asset sẽ được tham chiếu
  // tuyệt đối `/assets/*` và rơi sang user frontend). Mặc định `/` khi chạy trực
  // tiếp ở cổng 5173.
  base: process.env.VITE_BASE_PATH ?? '/',
  server: {
    port: 5173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
