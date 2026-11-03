import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backendUrl = env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8081'

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: Number(env.VITE_DEV_PORT || 3000),
      strictPort: true,
      allowedHosts: ['test.worldbit.ro'],
      proxy: {
        '/api': {        
          target: backendUrl,
          changeOrigin: true,
          secure: false,        
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {            
              proxyReq.setHeader('Origin', 'http://localhost:5173');
            });
          },
        }
      }
    }
  }
})
