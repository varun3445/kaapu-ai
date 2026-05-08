import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.fbx'],
  resolve: {
    dedupe: ['react', 'react-dom', 'three'],
  },
  build: {
    rollupOptions: {
      // Capacitor native plugins — only exist on device, not in the browser.
      // The dynamic imports in useHealthData.js handle the fallback gracefully.
      external: [
        'capacitor-health-connect',
        '@perfood/capacitor-healthkit',
        '@capacitor/push-notifications',
      ],
    },
  },
  server: {
    host: true,           // bind to 0.0.0.0 so phones on the same Wi-Fi can connect
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
  },
})
