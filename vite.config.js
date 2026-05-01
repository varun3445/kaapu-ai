import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.fbx'],
  resolve: {
    dedupe: ['react', 'react-dom', 'three'],
  },
  server: {
    host: true,           // bind to 0.0.0.0 so phones on the same Wi-Fi can connect
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
  },
})
