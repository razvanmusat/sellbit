import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,  // Permite accesul din rețea (telefon)
    port: 5173,
    proxy: {
      '/api': {        
        target: 'http://127.0.0.1:8080',
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
})