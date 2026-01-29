import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,  // Add explicit port
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok.io',
      '.loca.lt',
    ],
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true
      },
      '/api': {  // Also proxy API calls
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
