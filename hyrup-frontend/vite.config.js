import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.VITE_API_KEY || ''
  const backendUrl = env.VITE_BACKEND_URL || env.VITE_API_URL || 'http://127.0.0.1:5001'

  return {
    plugins: [react()],
    build: {
      outDir: 'dist'
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('x-api-key');
              proxyReq.setHeader('X-API-Key', apiKey);
            });
            proxy.on('error', (err) => {
              console.error('[proxy error]', err.message);
            });
          },
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
